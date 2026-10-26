import { commandUsage, statsDaily } from '@nervana/db';
import { sql } from 'drizzle-orm';
import type { VoiceState } from 'discord.js';
import type { NervanaClient } from '../../core/client.js';

interface DayCounters {
  messages: number;
  joins: number;
  leaves: number;
  commands: number;
  voiceSeconds: number;
  musicPlays: number;
}

const FLUSH_MS = 30_000;
const RETENTION_DAYS = 90;
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
 * Keeps hot-path counters in memory and flushes them every 30 seconds. A
 * failed flush is merged back into the buffer so a brief database outage does
 * not silently lose the day's counts.
 */
export class StatsService {
  private readonly days = new Map<string, DayCounters>();
  private readonly commands = new Map<string, Map<string, number>>();
  private readonly voiceStartedAt = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private retentionTimer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(private readonly client: NervanaClient) {}

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

  private enabled(): boolean {
    return this.client.settings.stats.enabled;
  }

  private day(date: Date = new Date()): DayCounters {
    const key = utcDateKey(date);
    let counters = this.days.get(key);
    if (!counters) {
      counters = emptyCounters();
      this.days.set(key, counters);
    }
    return counters;
  }

  recordMessage(): void {
    if (!this.enabled()) return;
    this.day().messages += 1;
  }

  recordJoin(): void {
    if (!this.enabled()) return;
    this.day().joins += 1;
  }

  recordLeave(): void {
    if (!this.enabled()) return;
    this.day().leaves += 1;
  }

  recordCommand(command: string): void {
    if (!this.enabled()) return;
    const day = this.day();
    day.commands += 1;

    const key = utcDateKey();
    let usage = this.commands.get(key);
    if (!usage) {
      usage = new Map();
      this.commands.set(key, usage);
    }
    usage.set(command, (usage.get(command) ?? 0) + 1);
  }

  recordMusicPlay(): void {
    if (!this.enabled()) return;
    this.day().musicPlays += 1;
  }

  recordVoiceSeconds(seconds: number): void {
    if (!this.enabled()) return;
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.day().voiceSeconds += Math.floor(seconds);
  }

  /** Tracks voice sessions so time is credited to the day it was actually spent. */
  handleVoiceState(oldState: VoiceState, newState: VoiceState): void {
    if (!this.enabled()) return;
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const userId = member.id;
    const wasIn = Boolean(oldState.channelId);
    const isIn = Boolean(newState.channelId);
    const now = Date.now();

    if (!wasIn && isIn) {
      this.voiceStartedAt.set(userId, now);
      return;
    }

    if (wasIn && !isIn) {
      this.closeVoiceSession(userId, now);
      return;
    }

    if (wasIn && isIn && oldState.channelId !== newState.channelId) {
      this.closeVoiceSession(userId, now);
      this.voiceStartedAt.set(userId, now);
    }
  }

  private closeVoiceSession(userId: string, now: number): void {
    const started = this.voiceStartedAt.get(userId);
    if (started === undefined) return;
    this.voiceStartedAt.delete(userId);
    this.recordVoiceSeconds((now - started) / 1000);
  }

  private closeAllVoiceSessions(): void {
    const now = Date.now();
    for (const userId of [...this.voiceStartedAt.keys()]) {
      this.closeVoiceSession(userId, now);
    }
  }

  async flush(): Promise<void> {
    const db = this.client.db;
    if (!db || this.flushing) return;
    if (this.days.size === 0 && this.commands.size === 0) return;

    this.flushing = true;
    const daySnapshot = new Map(this.days);
    const commandSnapshot = new Map(
      [...this.commands.entries()].map(([date, usage]) => [date, new Map(usage)]),
    );
    this.days.clear();
    this.commands.clear();

    try {
      for (const [date, counters] of daySnapshot) {
        if (
          counters.messages === 0 &&
          counters.joins === 0 &&
          counters.leaves === 0 &&
          counters.commands === 0 &&
          counters.voiceSeconds === 0 &&
          counters.musicPlays === 0
        ) {
          continue;
        }

        await db
          .insert(statsDaily)
          .values({ date, ...counters })
          .onConflictDoUpdate({
            target: statsDaily.date,
            set: {
              messages: sql`${statsDaily.messages} + ${counters.messages}`,
              joins: sql`${statsDaily.joins} + ${counters.joins}`,
              leaves: sql`${statsDaily.leaves} + ${counters.leaves}`,
              commands: sql`${statsDaily.commands} + ${counters.commands}`,
              voiceSeconds: sql`${statsDaily.voiceSeconds} + ${counters.voiceSeconds}`,
              musicPlays: sql`${statsDaily.musicPlays} + ${counters.musicPlays}`,
            },
          });
      }

      for (const [date, usage] of commandSnapshot) {
        for (const [command, count] of usage) {
          await db
            .insert(commandUsage)
            .values({ date, command, count })
            .onConflictDoUpdate({
              target: [commandUsage.date, commandUsage.command],
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
    days: Map<string, DayCounters>,
    commands: Map<string, Map<string, number>>,
  ): void {
    for (const [date, counters] of days) {
      const target = this.days.get(date) ?? emptyCounters();
      target.messages += counters.messages;
      target.joins += counters.joins;
      target.leaves += counters.leaves;
      target.commands += counters.commands;
      target.voiceSeconds += counters.voiceSeconds;
      target.musicPlays += counters.musicPlays;
      this.days.set(date, target);
    }

    for (const [date, usage] of commands) {
      const target = this.commands.get(date) ?? new Map<string, number>();
      for (const [command, count] of usage) {
        target.set(command, (target.get(command) ?? 0) + count);
      }
      this.commands.set(date, target);
    }
  }

  async prune(): Promise<void> {
    const db = this.client.db;
    if (!db) return;

    const cutoff = retentionCutoff();
    try {
      await db.delete(statsDaily).where(sql`${statsDaily.date} < ${cutoff}`);
      await db.delete(commandUsage).where(sql`${commandUsage.date} < ${cutoff}`);
      this.client.logger.info({ cutoff }, 'stats retention applied');
    } catch (error) {
      this.client.logger.warn({ err: error }, 'stats retention failed');
    }
  }
}
