import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs from the repository root; load the root `.env` when present.
for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  if (existsSync(candidate)) {
    try {
      process.loadEnvFile(candidate);
    } catch {
      // Ignore malformed env files here; the bot validates them at boot.
    }
    break;
  }
}

// drizzle-kit resolves these paths relative to the process cwd (the repo root
// when run through `npm run db:generate`).
export default defineConfig({
  dialect: 'postgresql',
  schema: './packages/db/src/schema.ts',
  out: './drizzle',
  verbose: true,
  strict: false,
});
