import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

let loaded = false;

/**
 * The dashboard shares the repository-root `.env` with the bot during local
 * development. Next normally only reads apps/web/.env*, so load the keys this
 * application actually needs.
 *
 * Discord and Lavalink bot credentials are deliberately not copied into the
 * dashboard process. On Vercel the variables are injected directly, so no file
 * is read there.
 */
const DASHBOARD_ENV_KEYS = [
  'DATABASE_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'SESSION_SECRET',
  'DASHBOARD_URL',
  'DASHBOARD_ADMIN_IDS',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'SUPPORT_SERVER_URL',
] as const;

function loadLocalEnv(): void {
  if (loaded) return;
  loaded = true;
  if (process.env.VERCEL) return;

  const cwd = process.cwd();
  const isWebPackage = path.basename(cwd) === 'web' && path.basename(path.dirname(cwd)) === 'apps';
  const candidates = isWebPackage
    ? [path.resolve(cwd, '../../.env'), path.resolve(cwd, '.env')]
    : [path.resolve(cwd, '.env')];

  for (const file of candidates) {
    if (!existsSync(file)) continue;

    try {
      const parsed = parseEnv(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
      for (const key of DASHBOARD_ENV_KEYS) {
        const value = parsed[key];
        if (value !== undefined && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // A malformed local .env should not take the dashboard down; the setup
      // screen will report the missing variables instead.
    }
    return;
  }
}

loadLocalEnv();
