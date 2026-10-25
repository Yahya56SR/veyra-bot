import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Sql = postgres.Sql;
export type Database = ReturnType<typeof createDatabase>['db'];

/**
 * Creates the shared Postgres client.
 *
 * `prepare: false` is mandatory for Supabase's transaction pooler and is also
 * safe against a local Postgres. Keep `max` small: the bot runs in 256 MB and
 * Vercel functions are concurrent.
 */
export function createDatabase(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, {
    max: options.max ?? 3,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });

  const db = drizzle(sql, { schema });
  return { db, sql };
}
