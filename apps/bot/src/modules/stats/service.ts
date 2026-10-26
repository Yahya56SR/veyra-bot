import { commandUsage, guilds, statsDaily } from '@veyra/db';
import { sql } from 'drizzle-orm';
import type { VoiceState } from 'discord.js';
import type { VeyraClient } from '../../core/client.js';

interface DayCounters {
  messages: number;
  joins: number;
  leaves: number;
  commands: number;
  voiceSeconds: number;
  musicPlays: number;
}

interface DayBucket extends DayCounters {
  guildId: string;
  date: string;
}

const FLUSH_MS = 30_000;
const RETENTION_DAYS = 90;
const PREMIUM_RETENTION_DAYS = 365;
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function retentionCutoff(now: Date = new Date(), days = RETENTION_DAYS): string {
  return utcDateKey(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
}

function emptyCounters(): DayCounters {
  return { messages: 0, joins: 0, leaves: 0, commands: 0, voiceSeconds: 0, musicPlays: 0 };
}

/**
 * Keeps hot-path counters in memory and flushes them every 30 seconds. Counts
 * are partitioned by guild and UTC day; a failed flush is merged back into the
 * buffer so a brief database outage does not silently lose the day's counts.
 */
export class StatsService {
  private readonly days = new Map<string, DayBucket>();
  private readonly commands = new Map<string, Map<string, number>>();
  private readonly voiceStartedAt = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private retentionTimer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(private readonly client: VeyraClient) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, FLUSH_MS);
    this.timer.unref();

    this.retentionTimer = setInterval(() => {
      void this.prune();
    }, RETENTION_MS);
    this.retentionTimer.unref();

    void this.prune();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.retentionTimer) {
      clearInterval(this.retentionTimer);
      this.retentionTimer = null;
    }
    this.closeAllVoiceSessions();
    await this.flush();
  }

  private enabled(guildId: string): boolean {
    const config = this.client.settingsCache.get(guildId)?.config;
    return config ? config.stats.enabled : true;
  }

  private bucketKey(guildId: string, date: string): string {
    return `${guildId}|${date}`;
  }

  private day(guildId: string, date: Date = new Date()): DayBucket {
    const dateKey = utcDateKey(date);
    const key = this.bucketKey(guildId, dateKey);
    let bucket = this.days.get(key);
    if (!bucket) {
      bucket = { guildId, date: dateKey, ...emptyCounters() };
      this.days.set(key, bucket);
    }
    return bucket;
  }

  recordMessage(guildId: string): void {
    if (!this.enabled(guildId)) return;
    this.day(guildId).messages += 1;
  }

  recordJoin(guildId: string): void {
    if (!this.enabled(guildId)) return;
    this.day(guildId).joins += 1;
  }

  recordLeave(guildId: string): void {
    if (!this.enabled(guildId)) return;
    this.day(guildId).leaves += 1;
  }

  recordCommand(guildId: string, command: string): void {
    if (!this.enabled(guildId)) return;
    const day = this.day(guildId);
    day.commands += 1;

    const date = utcDateKey();
    const key = this.bucketKey(guildId, date);
    let usage = this.commands.get(key);
    if (!usage) {
      usage = new Map();
      this.commands.set(key, usage);
    }
    usage.set(command, (usage.get(command) ?? 0) + 1);
  }

  recordMusicPlay(guildId: string): void {
    if (!this.enabled(guildId)) return;
    this.day(guildId).musicPlays += 1;
  }

  recordVoiceSeconds(guildId: string, seconds: number): void {
    if (!this.enabled(guildId)) return;
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.day(guildId).voiceSeconds += Math.floor(seconds);
  }

  /** Tracks voice sessions so time is credited to the day it was actually spent. */
  handleVoiceState(oldState: VoiceState, newState: VoiceState): void {
    const guildId = newState.guild.id;
    if (!this.enabled(guildId)) return;
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const key = this.bucketKey(guildId, member.id);
    const wasIn = Boolean(oldState.channelId);
    const isIn = Boolean(newState.channelId);
    const now = Date.now();

    if (!wasIn && isIn) {
      this.voiceStartedAt.set(key, now);
      return;
    }

    if (wasIn && !isIn) {
      this.closeVoiceSession(key, guildId, now);
      return;
    }

    if (wasIn && isIn && oldState.channelId !== newState.channelId) {
      this.closeVoiceSession(key, guildId, now);
      this.voiceStartedAt.set(key, now);
    }
  }

  private closeVoiceSession(key: string, guildId: string, now: number): void {
    const started = this.voiceStartedAt.get(key);
    if (started === undefined) return;
    this.voiceStartedAt.delete(key);
    this.recordVoiceSeconds(guildId, (now - started) / 1000);
  }

  private closeAllVoiceSessions(): void {
    const now = Date.now();
    for (const [key, started] of this.voiceStartedAt) {
      const [guildId] = key.split('|');
      if (guildId) this.recordVoiceSeconds(guildId, (now - started) / 1000);
    }
    this.voiceStartedAt.clear();
  }

  async flush(): Promise<void> {
    const db = this.client.db;
    if (!db || this.flushing) return;
    if (this.days.size === 0 && this.commands.size === 0) return;

    this.flushing = true;
    const daySnapshot = new Map(this.days);
    const commandSnapshot = new Map(
      [...this.commands.entries()].map(([key, usage]) => [key, new Map(usage)]),
    );
    this.days.clear();
    this.commands.clear();

    try {
      for (const bucket of daySnapshot.values()) {
        if (
          bucket.messages === 0 &&
          bucket.joins === 0 &&
          bucket.leaves === 0 &&
          bucket.commands === 0 &&
          bucket.voiceSeconds === 0 &&
          bucket.musicPlays === 0
        ) {
          continue;
        }

        await db
          .insert(statsDaily)
          .values(bucket)
          .onConflictDoUpdate({
            target: [statsDaily.guildId, statsDaily.date],
            set: {
              messages: sql`${statsDaily.messages} + ${bucket.messages}`,
              joins: sql`${statsDaily.joins} + ${bucket.joins}`,
              leaves: sql`${statsDaily.leaves} + ${bucket.leaves}`,
              commands: sql`${statsDaily.commands} + ${bucket.commands}`,
              voiceSeconds: sql`${statsDaily.voiceSeconds} + ${bucket.voiceSeconds}`,
              musicPlays: sql`${statsDaily.musicPlays} + ${bucket.musicPlays}`,
            },
          });
      }

      for (const [key, usage] of commandSnapshot) {
        const [guildId, date] = key.split('|');
        if (!guildId || !date) continue;
        for (const [command, count] of usage) {
          await db
            .insert(commandUsage)
            .values({ guildId, date, command, count })
            .onConflictDoUpdate({
              target: [commandUsage.guildId, commandUsage.date, commandUsage.command],
              set: { count: sql`${commandUsage.count} + ${count}` },
            });
        }
      }
    } catch (error) {
      this.mergeBack(daySnapshot, commandSnapshot);
      this.client.logger.warn({ err: error }, 'stats flush failed - counters restored');
    } finally {
      this.flushing = false;
    }
  }

  private mergeBack(
    days: Map<string, DayBucket>,
    commands: Map<string, Map<string, number>>,
  ): void {
    for (const [key, bucket] of days) {
      const target = this.days.get(key) ?? { ...bucket, ...emptyCounters() };
      target.messages += bucket.messages;
      target.joins += bucket.joins;
      target.leaves += bucket.leaves;
      target.commands += bucket.commands;
      target.voiceSeconds += bucket.voiceSeconds;
      target.musicPlays += bucket.musicPlays;
      this.days.set(key, target);
    }

    for (const [key, usage] of commands) {
      const target = this.commands.get(key) ?? new Map<string, number>();
      for (const [command, count] of usage) {
        target.set(command, (target.get(command) ?? 0) + count);
      }
      this.commands.set(key, target);
    }
  }

  async prune(): Promise<void> {
    const db = this.client.db;
    if (!db) return;

    const now = new Date();
    const freeCutoff = retentionCutoff(now, RETENTION_DAYS);
    const premiumCutoff = retentionCutoff(now, PREMIUM_RETENTION_DAYS);
    try {
      // Free servers keep 90 days. Premium servers keep a full year. The
      // correlated NOT EXISTS keeps this a single set-based delete per table.
      await db.execute(sql`
        DELETE FROM ${statsDaily}
        WHERE ${statsDaily.date} < ${freeCutoff}
          AND NOT EXISTS (
            SELECT 1 FROM ${guilds}
            WHERE ${guilds.id} = ${statsDaily.guildId}
              AND ${guilds.premiumTier} = 'premium'
              AND (${guilds.premiumUntil} IS NULL OR ${guilds.premiumUntil} > now())
          )
      `);
      await db.execute(sql`
        DELETE FROM ${commandUsage}
        WHERE ${commandUsage.date} < ${freeCutoff}
          AND NOT EXISTS (
            SELECT 1 FROM ${guilds}
            WHERE ${guilds.id} = ${commandUsage.guildId}
              AND ${guilds.premiumTier} = 'premium'
              AND (${guilds.premiumUntil} IS NULL OR ${guilds.premiumUntil} > now())
          )
      `);

      await db.delete(statsDaily).where(sql`${statsDaily.date} < ${premiumCutoff}`);
      await db.delete(commandUsage).where(sql`${commandUsage.date} < ${premiumCutoff}`);
      this.client.logger.info({ freeCutoff, premiumCutoff }, 'stats retention applied');
    } catch (error) {
      this.client.logger.warn({ err: error }, 'stats retention failed');
    }
  }
}
