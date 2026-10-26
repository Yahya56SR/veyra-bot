import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Sql } from './client.js';

export interface MigrationLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
}

const BREAKPOINT = '--> statement-breakpoint';

/**
 * Applies committed SQL migrations in filename order.
 *
 * Runs inside a transaction holding a transaction-scoped advisory lock, so
 * concurrent boots (renewal restarts, local + host) cannot race. DDL is
 * transactional in Postgres, which makes a failed migration a no-op.
 */
export async function runMigrations(
  sql: Sql,
  directory: string,
  logger?: MigrationLogger,
): Promise<number> {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();

  if (files.length === 0) {
    logger?.info({ directory }, 'no migrations found');
    return 0;
  }

  let applied = 0;

  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('veyra_migrations'))`;
    await tx`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const rows = await tx<{ name: string }[]>`SELECT name FROM schema_migrations`;
    const done = new Set(rows.map((row) => row.name));

    for (const file of files) {
      if (done.has(file)) continue;

      const contents = await readFile(join(directory, file), 'utf8');
      const statements = contents
        .split(BREAKPOINT)
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

      for (const statement of statements) {
        await tx.unsafe(statement);
      }

      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      applied++;
      logger?.info({ migration: file, statements: statements.length }, 'applied migration');
    }
  });

  return applied;
}
