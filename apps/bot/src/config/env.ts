import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const booleanish = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return defaultValue;
      if (typeof value === 'boolean') return value;
      return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
    });

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DISCORD_TOKEN: z.string().min(20, 'Missing bot token'),
  DISCORD_CLIENT_ID: z.string().regex(/^\d{17,20}$/, 'Must be the application ID'),
  GUILD_ID: z.string().regex(/^\d{17,20}$/, 'Must be the target guild ID'),

  DATABASE_URL: optionalString,
  MIGRATE_DATABASE_URL: optionalString,

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  REGISTER_COMMANDS: booleanish(true),
  SKIP_MIGRATIONS: booleanish(false),

  MUSIC_ENABLED: booleanish(true),
  LAVALINK_URL: optionalString,
  LAVALINK_AUTH: optionalString,
  LAVALINK_SECURE: booleanish(false),

  /** Internal: boot, connect, report RSS, exit. Used by scripts/verify-bundle.mjs. */
  SMOKE_TEST: booleanish(false),
});

export type Env = z.infer<typeof EnvSchema>;

/** Finds the nearest `.env`, starting at the current working directory. */
export function findEnvFile(): string | null {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../../../.env'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const envFile = findEnvFile();
  if (envFile) {
    try {
      // Node >= 20.12; does not override variables already set in the process.
      process.loadEnvFile(envFile);
    } catch {
      // A malformed .env is reported by validation below.
    }
  }

  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment. Copy .env.example to .env and fill it in:\n${details}`);
  }

  return parsed.data;
}
