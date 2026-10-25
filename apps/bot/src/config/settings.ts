import { eq } from 'drizzle-orm';
import { settings as settingsTable } from '@nervana/db';
import type { Database } from '@nervana/db';
import { DEFAULT_CONFIG, parseConfig, type AppConfig } from '@nervana/shared';
import type { NervanaClient } from '../core/client.js';

export interface SettingsState {
  config: AppConfig;
  /** Epoch milliseconds of `settings.updated_at`. */
  updatedAt: number;
}

/**
 * Reads the singleton settings row, creating it from defaults on first boot.
 * Invalid stored JSON falls back to defaults instead of taking the bot down.
 */
export async function readSettings(
  db: Database,
  onInvalid?: (error: unknown) => void,
): Promise<SettingsState> {
  const rows = await db
    .select({ modules: settingsTable.modules, updatedAt: settingsTable.updatedAt })
    .from(settingsTable)
    .where(eq(settingsTable.id, 1))
    .limit(1);

  const row = rows[0];
  if (!row) {
    await db.insert(settingsTable).values({ id: 1, modules: DEFAULT_CONFIG }).onConflictDoNothing();
    return { config: parseConfig(DEFAULT_CONFIG), updatedAt: Date.now() };
  }

  try {
    return { config: parseConfig(row.modules), updatedAt: row.updatedAt.getTime() };
  } catch (error) {
    onInvalid?.(error);
    return { config: parseConfig(DEFAULT_CONFIG), updatedAt: row.updatedAt.getTime() };
  }
}

/**
 * Environment variables that must be able to override the database, e.g. the
 * music kill switch when a public Lavalink node becomes untrustworthy.
 */
export function applyOverrides(config: AppConfig, musicEnabled: boolean): AppConfig {
  if (musicEnabled) return config;
  return { ...config, music: { ...config.music, enabled: false } };
}

/**
 * Single-guild design: no LISTEN/NOTIFY, no direct-connection requirement.
 * A 15 s poll works through Supabase's transaction pooler.
 */
export function startSettingsPoller(client: NervanaClient): void {
  if (!client.db) return;
  if (client.settingsPollTimer) return;

  client.settingsPollTimer = setInterval(() => {
    void poll(client);
  }, 15_000);
  client.settingsPollTimer.unref();
}

async function poll(client: NervanaClient): Promise<void> {
  if (!client.db) return;

  try {
    const rows = await client.db
      .select({ modules: settingsTable.modules, updatedAt: settingsTable.updatedAt })
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .limit(1);

    const row = rows[0];
    if (!row) return;

    const updatedAt = row.updatedAt.getTime();
    if (updatedAt === client.settingsUpdatedAt) return;

    const config = parseConfig(row.modules);
    client.settings = applyOverrides(config, client.env.MUSIC_ENABLED);
    client.settingsUpdatedAt = updatedAt;
    client.logger.info({ updatedAt }, 'settings reloaded');
  } catch (error) {
    client.logger.warn({ err: error }, 'settings poll failed');
  }
}

export function stopSettingsPoller(client: NervanaClient): void {
  if (client.settingsPollTimer) {
    clearInterval(client.settingsPollTimer);
    client.settingsPollTimer = null;
  }
}
