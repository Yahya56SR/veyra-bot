import { asc, eq, gt } from 'drizzle-orm';
import { settings as settingsTable, type Database } from '@veyra/db';
import { DEFAULT_CONFIG, parseConfig, type AppConfig } from '@veyra/shared';
import type { VeyraClient } from '../core/client.js';
import { applyPersonalizer } from '../modules/personalizer/service.js';

export interface SettingsState {
  config: AppConfig;
  /** Epoch milliseconds of `settings.updated_at`. */
  updatedAt: number;
}

/**
 * Reads one guild's settings row, creating defaults when the guild has no row
 * yet. Invalid stored JSON falls back to defaults instead of taking the bot
 * down.
 */
export async function readSettings(
  db: Database,
  guildId: string,
  onInvalid?: (error: unknown) => void,
): Promise<SettingsState> {
  const rows = await db
    .select({ modules: settingsTable.modules, updatedAt: settingsTable.updatedAt })
    .from(settingsTable)
    .where(eq(settingsTable.guildId, guildId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    await db
      .insert(settingsTable)
      .values({ guildId, modules: DEFAULT_CONFIG })
      .onConflictDoNothing()
      .catch(() => {
        // The guild may not be persisted yet. Defaults still keep commands up.
      });
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
 * Refreshes changed guild settings every 15 seconds. This works through
 * Supabase's transaction pooler and avoids a direct-connection requirement.
 */
export function startSettingsPoller(client: VeyraClient): void {
  if (!client.db) return;
  if (client.settingsPollTimer) return;

  client.settingsPollTimer = setInterval(() => {
    void poll(client);
  }, 15_000);
  client.settingsPollTimer.unref();
}

async function poll(client: VeyraClient): Promise<void> {
  if (!client.db) return;

  const since = new Date(client.settingsPollSince);
  try {
    const rows = await client.db
      .select({
        guildId: settingsTable.guildId,
        modules: settingsTable.modules,
        updatedAt: settingsTable.updatedAt,
      })
      .from(settingsTable)
      .where(gt(settingsTable.updatedAt, since))
      .orderBy(asc(settingsTable.updatedAt))
      .limit(500);

    for (const row of rows) {
      try {
        const config = parseConfig(row.modules);
        client.cacheSettings(row.guildId, config, row.updatedAt.getTime());
        client.invalidatePremium(row.guildId);
        const guild = client.guilds.cache.get(row.guildId);
        if (guild) void applyPersonalizer(client, guild, config);
      } catch (error) {
        client.logger.warn({ err: error, guildId: row.guildId }, 'invalid guild settings skipped');
      }
    }

    const last = rows[rows.length - 1];
    client.settingsPollSince = last ? last.updatedAt.getTime() : Date.now();
  } catch (error) {
    client.logger.warn({ err: error }, 'settings poll failed');
  }
}

export function stopSettingsPoller(client: VeyraClient): void {
  if (client.settingsPollTimer) {
    clearInterval(client.settingsPollTimer);
    client.settingsPollTimer = null;
  }
}
