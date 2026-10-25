import { members } from '@nervana/db';
import { levelFromXp } from '@nervana/shared';
import { eq, sql } from 'drizzle-orm';
import type { Message } from 'discord.js';
import type { NervanaClient } from '../../core/client.js';
import { checkXpContext, evaluateMessageXp } from './xp.js';

interface PendingXp {
  xp: number;
  messages: number;
  channelId: string;
}

const FLUSH_INTERVAL_MS = 30_000;
const MAX_PENDING_MEMBERS = 5_000;

/**
 * Batches XP writes to keep the 256 MB host cheap: messages increment an
 * in-memory buffer, which is flushed every 30 s and on shutdown.
 */
export class LevelingService {
  private readonly pending = new Map<string, PendingXp>();
  private readonly lastGainAt = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(private readonly client: NervanaClient) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  async record(message: Message): Promise<void> {
    if (!this.client.db) return;
    if (!message.inGuild()) return;
    if (message.guildId !== this.client.env.GUILD_ID) return;
    if (message.system) return;

    const config = this.client.settings.leveling;
    if (!config.enabled) return;

    const now = Date.now();
    const roleIds = message.member ? [...message.member.roles.cache.keys()] : [];

    // Cheap bail-out before the cooldown lookup: bots and ignored channels/roles
    // must not cause a database read per message.
    if (
      checkXpContext({ isBot: message.author.bot, channelId: message.channelId, roleIds, config })
    ) {
      return;
    }

    // Seed the in-memory cooldown from the database after a restart so a
    // restart cannot be used to bypass the per-member cooldown.
    let lastGainAt = this.lastGainAt.get(message.author.id);
    if (lastGainAt === undefined) {
      const rows = await this.client.db
        .select({ lastXpAt: members.lastXpAt })
        .from(members)
        .where(eq(members.userId, message.author.id))
        .limit(1);

      const persisted = rows[0]?.lastXpAt?.getTime();
      if (persisted !== undefined) {
        lastGainAt = persisted;
        this.lastGainAt.set(message.author.id, persisted);
      }
    }

    const evaluation = evaluateMessageXp({
      isBot: message.author.bot,
      channelId: message.channelId,
      roleIds,
      config,
      lastGainAt,
      now,
    });

    if (!evaluation.eligible) return;

    this.lastGainAt.set(message.author.id, now);
    this.pruneCooldowns(now, config.cooldownSeconds * 1000);
    this.bump(message.author.id, evaluation.amount, message.channelId);
  }

  private bump(userId: string, amount: number, channelId: string): void {
    const existing = this.pending.get(userId);
    if (existing) {
      existing.xp += amount;
      existing.messages += 1;
      existing.channelId = channelId;
      return;
    }

    if (this.pending.size >= MAX_PENDING_MEMBERS) {
      const oldest = this.pending.keys().next().value;
      if (oldest) this.pending.delete(oldest);
    }

    this.pending.set(userId, { xp: amount, messages: 1, channelId });
  }

  /** Applies the buffer. Failures are requeued for the next tick. */
  async flush(): Promise<void> {
    const db = this.client.db;
    if (!db || this.flushing || this.pending.size === 0) return;

    this.flushing = true;
    const batch = [...this.pending.entries()];
    this.pending.clear();

    try {
      for (const [userId, delta] of batch) {
        try {
          await this.apply(db, userId, delta);
        } catch (error) {
          const requeued = this.pending.get(userId);
          if (requeued) {
            requeued.xp += delta.xp;
            requeued.messages += delta.messages;
          } else {
            this.pending.set(userId, delta);
          }
          this.client.logger.error({ err: error, userId }, 'failed to apply XP');
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private async apply(
    db: NonNullable<NervanaClient['db']>,
    userId: string,
    delta: PendingXp,
  ): Promise<void> {
    // The XP increment and the level update commit together. If either query
    // fails the whole batch is requeued, so XP can never be counted twice by a
    // partial write.
    const newLevel = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(members)
        .values({
          userId,
          xp: delta.xp,
          messages: delta.messages,
          // Start at 0 so the level-up path below announces/rewards correctly
          // even when a single large gain crosses a threshold.
          level: 0,
          lastXpAt: new Date(),
        })
        .onConflictDoUpdate({
          target: members.userId,
          set: {
            xp: sql`${members.xp} + ${delta.xp}`,
            messages: sql`${members.messages} + ${delta.messages}`,
            lastXpAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning({ xp: members.xp, level: members.level });

      const row = rows[0];
      if (!row) return null;

      const next = levelFromXp(row.xp).level;
      if (next <= row.level) return null;

      await tx
        .update(members)
        .set({ level: next, updatedAt: new Date() })
        .where(eq(members.userId, userId));

      return next;
    });

    if (newLevel === null) return;

    // Announcements and role rewards are best-effort and must not cause the
    // already-committed XP to be requeued.
    try {
      await this.onLevelUp(userId, newLevel, delta.channelId);
    } catch (error) {
      this.client.logger.error(
        { err: error, userId, level: newLevel },
        'level-up side effects failed',
      );
    }
  }

  private async onLevelUp(userId: string, level: number, fallbackChannelId: string): Promise<void> {
    const guild = this.client.guilds.cache.get(this.client.env.GUILD_ID);
    if (!guild) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const config = this.client.settings.leveling;
    const eligible = config.rewards
      .filter((reward) => reward.level <= level)
      .sort((a, b) => a.level - b.level);

    const applicable = config.stackRewards ? eligible : eligible.slice(-1);

    for (const reward of applicable) {
      if (member.roles.cache.has(reward.roleId)) continue;
      try {
        await member.roles.add(reward.roleId, `Level ${level} reward`);
      } catch (error) {
        this.client.logger.warn(
          { err: error, userId, roleId: reward.roleId, level },
          'failed to grant level reward role',
        );
      }
    }

    if (!config.announceLevelUp) return;

    const channelId = config.announceChannelId ?? fallbackChannelId;
    const channel = guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    await channel
      .send({
        content: `${member} reached **level ${level}**!`,
        allowedMentions: { users: [userId] },
      })
      .catch((error: unknown) => {
        this.client.logger.warn({ err: error, userId, channelId }, 'failed to announce level up');
      });
  }

  private pruneCooldowns(now: number, windowMs: number): void {
    if (this.lastGainAt.size <= 10_000) return;
    for (const [userId, at] of this.lastGainAt) {
      if (now - at > windowMs) this.lastGainAt.delete(userId);
    }
  }
}
