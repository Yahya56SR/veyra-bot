import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Resolves the committed `drizzle/` directory from either:
 * - the repository root (bundled host, `node index.js`)
 * - `apps/bot` (npm workspace dev)
 */
export function resolveMigrationsDir(): string {
  const candidates = [
    resolve(process.cwd(), 'drizzle'),
    resolve(process.cwd(), '../../drizzle'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Could not find the drizzle/ migrations directory. Looked in:\n${candidates
      .map((candidate) => `  - ${candidate}`)
      .join('\n')}`,
  );
}
