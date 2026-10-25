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
  // Supabase (and most managed Postgres) requires TLS. postgres.js parses an
  // explicit `sslmode` from the URL; otherwise enable it for non-local hosts.
  const hasSslMode = /[?&]sslmode=/.test(url);
  const isLocal = /@(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/)/.test(url);

  const sql = postgres(url, {
    max: options.max ?? 3,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
    ...(!hasSslMode && !isLocal ? { ssl: 'require' as const } : {}),
  });

  const db = drizzle(sql, { schema });
  return { db, sql };
}
