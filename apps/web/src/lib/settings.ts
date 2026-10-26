import { settings, type Database } from '@nervana/db';
import { DEFAULT_CONFIG, parseConfig, type AppConfig } from '@nervana/shared';
import { eq } from 'drizzle-orm';

export interface DashboardSettings {
  config: AppConfig;
  updatedAt: Date | null;
}

/**
 * Read-only dashboard view of the singleton settings row. Unlike the bot's
 * startup helper this never inserts a row: the bot owns first-boot creation.
 */
export async function readDashboardSettings(db: Database): Promise<DashboardSettings> {
  const rows = await db
    .select({ modules: settings.modules, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);

  const row = rows[0];
  if (!row) return { config: parseConfig(DEFAULT_CONFIG), updatedAt: null };

  try {
    return { config: parseConfig(row.modules), updatedAt: row.updatedAt };
  } catch {
    return { config: parseConfig(DEFAULT_CONFIG), updatedAt: row.updatedAt };
  }
}
