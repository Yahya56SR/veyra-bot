import { cases } from '@veyra/db';
import { and, eq, lte } from 'drizzle-orm';
import type { Guild } from 'discord.js';
import type { VeyraClient } from '../../core/client.js';
import { finishModAction, type CaseRow } from './service.js';

const TICK_MS = 60_000;
const UNKNOWN_BAN = 10026;

/**
 * Lifts temporary bans. Timeouts are enforced by Discord, so they need no
 * scheduler; only bans with `expires_at` are tracked here. The sweep is global
 * so the cost does not grow with a query per guild.
 */
export class ModerationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly client: VeyraClient) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);
    this.timer.unref();
    void this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.running) return;

    const db = this.client.db;
    if (!db) return;

    this.running = true;
    try {
      await this.sweep(db);
    } finally {
      this.running = false;
    }
  }

  private async sweep(db: NonNullable<VeyraClient['db']>): Promise<void> {
    // Discord enforces timeouts itself; this only keeps the stored case state
    // accurate once the timeout has elapsed.
    await db
      .update(cases)
      .set({ active: false })
      .where(
        and(eq(cases.type, 'timeout'), eq(cases.active, true), lte(cases.expiresAt, new Date())),
      )
      .catch((error: unknown) => {
        this.client.logger.warn({ err: error }, 'failed to expire timeout cases');
      });

    const due = await db
      .select()
      .from(cases)
      .where(and(eq(cases.type, 'ban'), eq(cases.active, true), lte(cases.expiresAt, new Date())))
      .limit(100)
      .catch((error: unknown) => {
        this.client.logger.warn({ err: error }, 'temporary ban sweep failed');
        return [] as CaseRow[];
      });

    if (due.length === 0) return;

    const byGuild = new Map<string, CaseRow[]>();
    for (const row of due) {
      const bucket = byGuild.get(row.guildId) ?? [];
      bucket.push(row);
      byGuild.set(row.guildId, bucket);
    }

    for (const [guildId, rows] of byGuild) {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) continue;
      await this.sweepGuild(db, guild, rows);
    }
  }

  private async sweepGuild(
    db: NonNullable<VeyraClient['db']>,
    guild: Guild,
    due: CaseRow[],
  ): Promise<void> {
    const byTarget = new Map<string, CaseRow[]>();
    for (const row of due) {
      const bucket = byTarget.get(row.targetId) ?? [];
      bucket.push(row);
      byTarget.set(row.targetId, bucket);
    }

    for (const [targetId, rows] of byTarget) {
      const ids = rows.map((row) => row.id);
      const now = Date.now();

      // A newer permanent (or longer) ban must keep the member banned even if
      // an older temporary ban has expired.
      const active = await db
        .select()
        .from(cases)
        .where(
          and(
            eq(cases.guildId, guild.id),
            eq(cases.targetId, targetId),
            eq(cases.type, 'ban'),
            eq(cases.active, true),
          ),
        );

      const dueIds = active
        .filter((row) => row.expiresAt !== null && row.expiresAt.getTime() <= now)
        .map((row) => row.id);
      if (dueIds.length === 0) continue;

      const stillBanned = active.some(
        (row) => row.expiresAt === null || row.expiresAt.getTime() > now,
      );

      if (stillBanned) {
        await db
          .update(cases)
          .set({ active: false })
          .where(
            and(
              eq(cases.guildId, guild.id),
              eq(cases.targetId, targetId),
              eq(cases.type, 'ban'),
              eq(cases.active, true),
              lte(cases.expiresAt, new Date(now)),
            ),
          );
        continue;
      }

      try {
        await guild.bans.remove(targetId, `Temporary ban expired (case #${ids[0]})`);
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== UNKNOWN_BAN) {
          this.client.logger.warn(
            { err: error, guildId: guild.id, targetId, caseIds: ids },
            'failed to lift temporary ban - will retry',
          );
          continue;
        }
      }

      await db
        .update(cases)
        .set({ active: false })
        .where(
          and(
            eq(cases.guildId, guild.id),
            eq(cases.targetId, targetId),
            eq(cases.type, 'ban'),
            eq(cases.active, true),
            lte(cases.expiresAt, new Date(now)),
          ),
        );

      await finishModAction(this.client, {
        guildId: guild.id,
        type: 'unban',
        targetId,
        moderatorId: this.client.user?.id ?? 'system',
        reason: `Temporary ban expired (case #${ids[0]})`,
      }).catch((error: unknown) => {
        this.client.logger.warn(
          { err: error, guildId: guild.id, targetId },
          'failed to record unban',
        );
      });
    }
  }
}
