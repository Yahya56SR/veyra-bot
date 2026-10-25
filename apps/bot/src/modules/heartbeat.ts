import { heartbeat as heartbeatTable } from '@nervana/db';
import type { NervanaClient } from '../core/client.js';

const INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Supabase free pauses projects after a week without database activity.
 * A tiny write every six hours keeps it awake even when the server is quiet.
 */
export class HeartbeatService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly client: NervanaClient) {}

  start(): void {
    if (this.timer || !this.client.db) return;

    void this.beat();
    this.timer = setInterval(() => {
      void this.beat();
    }, INTERVAL_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async beat(): Promise<void> {
    const db = this.client.db;
    if (!db || this.running) return;

    this.running = true;

    try {
      const now = new Date();
      await db
        .insert(heartbeatTable)
        .values({ id: 1, at: now })
        .onConflictDoUpdate({ target: heartbeatTable.id, set: { at: now } });
    } catch (error) {
      this.client.logger.warn({ err: error }, 'heartbeat write failed');
    } finally {
      this.running = false;
    }
  }
}
