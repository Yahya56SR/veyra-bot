import {
  resetModule as dbResetModule,
  updateModule as dbUpdateModule,
  type ModuleUpdateResult,
} from '@nervana/db';
import type { AppConfig } from '@nervana/shared';
import { ZodError } from 'zod';
import type { NervanaClient } from '../core/client.js';
import { UserFacingError } from '../core/errors.js';
import { applyOverrides } from './settings.js';

function invalidConfig(error: unknown): never {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    throw new UserFacingError(issue?.message ?? 'That configuration value is invalid.');
  }
  throw error;
}

function adopt<K extends keyof AppConfig>(
  client: NervanaClient,
  result: ModuleUpdateResult<K>,
): ModuleUpdateResult<K> {
  client.settings = applyOverrides(result.config, client.env.MUSIC_ENABLED);
  client.settingsUpdatedAt = result.updatedAt.getTime();
  return result;
}

/** Persists a module and makes the change visible without waiting for the poll. */
export async function updateModule<K extends keyof AppConfig>(
  client: NervanaClient,
  actorId: string,
  module: K,
  value: unknown,
): Promise<ModuleUpdateResult<K>> {
  if (!client.db) throw new UserFacingError('The database is not configured.');

  const result = await dbUpdateModule(client.db, actorId, module, value).catch(invalidConfig);
  return adopt(client, result);
}

/** Restores a module to defaults and applies it immediately. */
export async function resetModule<K extends keyof AppConfig>(
  client: NervanaClient,
  actorId: string,
  module: K,
): Promise<ModuleUpdateResult<K>> {
  if (!client.db) throw new UserFacingError('The database is not configured.');

  const result = await dbResetModule(client.db, actorId, module).catch(invalidConfig);
  return adopt(client, result);
}
