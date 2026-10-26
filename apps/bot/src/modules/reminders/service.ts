import { reminders } from '@veyra/db';
import { and, asc, eq, lte } from 'drizzle-orm';
import type { VeyraClient } from '../../core/client.js';

const TICK_MS = 30_000;
const BATCH_SIZE = 20;

/**
 * Delivers reminders from Postgres. Keeping due times in the database means a
 * host restart, renewal, or crash never loses a scheduled reminder.
 */
export class ReminderService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly client: VeyraClient) {}

  start(): void {
    if (this.timer || !this.client.isReady()) return;

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
    const db = this.client.db;
    if (!db || !this.client.isReady() || this.running) return;

    this.running = true;

    try {
      const due = await db
        .select()
        .from(reminders)
        .where(and(eq(reminders.sent, false), lte(reminders.remindAt, new Date())))
        .orderBy(asc(reminders.remindAt))
        .limit(BATCH_SIZE);

      for (const row of due) {
        await this.deliver(row);
        await db.update(reminders).set({ sent: true }).where(eq(reminders.id, row.id));
      }
    } catch (error) {
      this.client.logger.error({ err: error }, 'reminder sweep failed');
    } finally {
      this.running = false;
    }
  }

  private async deliver(row: typeof reminders.$inferSelect): Promise<void> {
    const content = `⏰ Reminder: ${row.message}\n-# Scheduled for <t:${Math.floor(
      row.remindAt.getTime() / 1000,
    )}:R>`;

    const user = await this.client.users.fetch(row.userId).catch(() => null);
    if (user) {
      try {
        await user.send({ content, allowedMentions: { parse: [] } });
        return;
      } catch (error) {
        this.client.logger.debug(
          { err: error, userId: row.userId },
          'reminder DM failed — falling back to channel',
        );
      }
    }

    const guild = this.client.guilds.cache.get(row.guildId);
    const channel = guild ? await guild.channels.fetch(row.channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) {
      this.client.logger.warn(
        { userId: row.userId, channelId: row.channelId },
        'reminder could not be delivered',
      );
      return;
    }

    await channel
      .send({
        content: `<@${row.userId}> ${content}`,
        allowedMentions: { users: [row.userId] },
      })
      .catch((error: unknown) => {
        this.client.logger.warn(
          { err: error, userId: row.userId, channelId: row.channelId },
          'reminder channel delivery failed',
        );
      });
  }
}
