import { DEFAULT_CONFIG, parseConfig, parseModule, type AppConfig } from '@veyra/shared';
import { eq } from 'drizzle-orm';
import type { Database } from './client.js';
import { configAudit, settings } from './schema.js';

export interface ModuleUpdateResult<K extends keyof AppConfig> {
  config: AppConfig;
  before: AppConfig[K];
  after: AppConfig[K];
  updatedAt: Date;
}

/**
 * Reads one guild's config inside a transaction and locks the row so two
 * admins editing different modules cannot clobber each other.
 *
 * A corrupt stored payload is replaced by defaults rather than blocking the
 * update - otherwise a bad JSONB value could never be repaired from the UI.
 */
async function readLockedConfig(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  guildId: string,
) {
  const rows = await tx
    .select({ modules: settings.modules })
    .from(settings)
    .where(eq(settings.guildId, guildId))
    .limit(1)
    .for('update');

  const stored = rows[0]?.modules;

  try {
    return parseConfig(stored ?? DEFAULT_CONFIG);
  } catch {
    return parseConfig(DEFAULT_CONFIG);
  }
}

/** Validates and persists one module, then records an audit entry. */
export async function updateModule<K extends keyof AppConfig>(
  db: Database,
  guildId: string,
  actorId: string,
  module: K,
  raw: unknown,
): Promise<ModuleUpdateResult<K>> {
  return db.transaction(async (tx) => {
    const before = await readLockedConfig(tx, guildId);
    const after = parseModule(module, raw);
    const config: AppConfig = { ...before, [module]: after };
    const updatedAt = new Date();

    await tx
      .insert(settings)
      .values({ guildId, modules: config, updatedAt })
      .onConflictDoUpdate({
        target: settings.guildId,
        set: { modules: config, updatedAt },
      });

    await tx.insert(configAudit).values({
      guildId,
      actorId,
      module,
      before: before[module],
      after,
    });

    return { config, before: before[module], after, updatedAt };
  });
}

/** Restores one module to the built-in defaults. */
export async function resetModule<K extends keyof AppConfig>(
  db: Database,
  guildId: string,
  actorId: string,
  module: K,
): Promise<ModuleUpdateResult<K>> {
  return updateModule(db, guildId, actorId, module, DEFAULT_CONFIG[module]);
}

/** Reads a guild's config without writing defaults. */
export async function readGuildConfig(
  db: Database,
  guildId: string,
): Promise<{ config: AppConfig; updatedAt: Date } | null> {
  const rows = await db
    .select({ modules: settings.modules, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.guildId, guildId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  try {
    return { config: parseConfig(row.modules), updatedAt: row.updatedAt };
  } catch {
    return { config: parseConfig(DEFAULT_CONFIG), updatedAt: row.updatedAt };
  }
}
