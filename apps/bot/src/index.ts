import { createDatabase, type Database, type Sql } from '@nervana/db';
import { runMigrations } from '@nervana/db/migrate';
import { DEFAULT_CONFIG, parseConfig } from '@nervana/shared';
import { commands } from './commands/index.js';
import { loadEnv } from './config/env.js';
import { applyOverrides, readSettings, stopSettingsPoller } from './config/settings.js';
import { NervanaClient } from './core/client.js';
import { registerCommands } from './core/commands.js';
import { registerEvents } from './core/events.js';
import { createLogger } from './core/logger.js';
import { resolveMigrationsDir } from './db/migrations-dir.js';
import { events } from './events/index.js';
import { LevelingService } from './modules/leveling/service.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);
  logger.info(
    { node: process.version, env: env.NODE_ENV, pid: process.pid },
    'starting nervana',
  );

  let client: NervanaClient | null = null;
  let sql: Sql | null = null;
  let shuttingDown = false;

  async function shutdown(reason: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ reason }, 'shutting down');

    if (client) {
      await client.leveling?.stop();
      stopSettingsPoller(client);
      await client.destroy().catch((error: unknown) => {
        logger.warn({ err: error }, 'client destroy failed');
      });
    }

    if (sql) {
      await sql.end({ timeout: 5 }).catch((error: unknown) => {
        logger.warn({ err: error }, 'database shutdown failed');
      });
    }

    // Prefer a natural drain over process.exit(): exiting while websocket
    // handles are closing can trip libuv on Windows. The unref'd timer is a
    // last-resort guarantee that we still terminate.
    process.exitCode = 0;
    setTimeout(() => process.exit(0), 5000).unref();
  }

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception');
    void shutdown('uncaughtException');
  });

  try {
    let settingsState = { config: parseConfig(DEFAULT_CONFIG), updatedAt: 0 };
    let db: Database | null = null;

    if (env.DATABASE_URL && !env.SMOKE_TEST) {
      const database = createDatabase(env.DATABASE_URL, { max: 4 });
      db = database.db;
      sql = database.sql;

      if (!env.SKIP_MIGRATIONS) {
        const directory = resolveMigrationsDir();
        const applied = await runMigrations(sql, directory, logger);
        logger.info({ applied, directory }, 'database migrations up to date');
      }

      settingsState = await readSettings(db, (error) => {
        logger.error({ err: error }, 'stored settings are invalid — using defaults');
      });
      logger.info({ updatedAt: settingsState.updatedAt }, 'settings loaded');
    } else {
      logger.warn(
        { smokeTest: env.SMOKE_TEST },
        'database disabled — running with built-in default settings',
      );
    }

    if (
      !env.SMOKE_TEST &&
      env.MUSIC_ENABLED &&
      (!env.LAVALINK_URL || !env.LAVALINK_AUTH)
    ) {
      logger.warn('MUSIC_ENABLED is true but LAVALINK_URL/LAVALINK_AUTH are incomplete');
    }

    client = new NervanaClient();
    client.env = env;
    client.logger = logger;
    client.db = db;
    client.settings = applyOverrides(settingsState.config, env.MUSIC_ENABLED);
    client.settingsUpdatedAt = settingsState.updatedAt;

    registerCommands(client, commands);
    registerEvents(client, events);

    client.leveling = new LevelingService(client);
    client.leveling.start();

    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    logger.fatal({ err: error }, 'fatal startup error');

    if (client) {
      await client.leveling?.stop();
      stopSettingsPoller(client);
      await client.destroy().catch(() => {});
    }
    if (sql) {
      await sql.end({ timeout: 5 }).catch(() => {});
    }

    process.exitCode = 1;
    setTimeout(() => process.exit(1), 5000).unref();
  }
}

void main();
