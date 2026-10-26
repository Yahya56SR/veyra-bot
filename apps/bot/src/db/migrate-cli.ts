import { createDatabase } from '@veyra/db';
import { runMigrations } from '@veyra/db/migrate';
import { loadEnv } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { resolveMigrationsDir } from './migrations-dir.js';

const env = loadEnv();
const url = env.MIGRATE_DATABASE_URL ?? env.DATABASE_URL;

if (!url) {
  console.error('Set MIGRATE_DATABASE_URL (preferred) or DATABASE_URL before migrating.');
  process.exit(1);
}

const logger = createLogger(env.LOG_LEVEL);
const { sql } = createDatabase(url, { max: 1 });

try {
  const directory = resolveMigrationsDir();
  const applied = await runMigrations(sql, directory, logger);
  logger.info({ applied, directory }, 'migrations complete');
} catch (error) {
  logger.fatal({ err: error }, 'migration failed');
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
