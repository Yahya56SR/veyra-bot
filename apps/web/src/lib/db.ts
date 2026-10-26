import { createDatabase } from '@nervana/db';
import './load-env';

type DatabaseBundle = ReturnType<typeof createDatabase>;

const globalForDb = globalThis as unknown as {
  nervanaWebDb?: DatabaseBundle;
};

/**
 * One pool per serverless instance. Vercel can run several instances; each
 * keeps the pool small so the Supabase connection limit is not exhausted.
 */
export function getDb(): DatabaseBundle['db'] {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is not configured for the dashboard.');
  }

  if (!globalForDb.nervanaWebDb) {
    globalForDb.nervanaWebDb = createDatabase(url, { max: 3 });
  }

  return globalForDb.nervanaWebDb.db;
}
