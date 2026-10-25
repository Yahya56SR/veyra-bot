import { DEFAULT_CONFIG, parseConfig, parseModule, type AppConfig } from '@nervana/shared';
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
 * Reads the singleton config inside a transaction and locks the row so two
 * admins editing different modules cannot clobber each other.
 *
 * A corrupt stored payload is replaced by defaults rather than blocking the
 * update — otherwise a bad JSONB value could never be repaired from the UI.
 */
async function readLockedConfig(tx: Parameters<Parameters<Database['transaction']>[0]>[0]) {
  const rows = await tx
    .select({ modules: settings.modules })
    .from(settings)
    .where(eq(settings.id, 1))
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
  actorId: string,
  module: K,
  raw: unknown,
): Promise<ModuleUpdateResult<K>> {
  return db.transaction(async (tx) => {
    const before = await readLockedConfig(tx);
    const after = parseModule(module, raw);
    const config: AppConfig = { ...before, [module]: after };
    const updatedAt = new Date();

    await tx
      .insert(settings)
      .values({ id: 1, modules: config, updatedAt })
      .onConflictDoUpdate({
        target: settings.id,
        set: { modules: config, updatedAt },
      });

    await tx.insert(configAudit).values({
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
  actorId: string,
  module: K,
): Promise<ModuleUpdateResult<K>> {
  return updateModule(db, actorId, module, DEFAULT_CONFIG[module]);
}
