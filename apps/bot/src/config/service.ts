import {
  resetModule as dbResetModule,
  updateModule as dbUpdateModule,
  type ModuleUpdateResult,
} from '@veyra/db';
import type { AppConfig } from '@veyra/shared';
import { ZodError } from 'zod';
import type { VeyraClient } from '../core/client.js';
import { UserFacingError } from '../core/errors.js';

function invalidConfig(error: unknown): never {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    throw new UserFacingError(issue?.message ?? 'That configuration value is invalid.');
  }
  throw error;
}

function adopt<K extends keyof AppConfig>(
  client: VeyraClient,
  guildId: string,
  result: ModuleUpdateResult<K>,
): ModuleUpdateResult<K> {
  client.cacheSettings(guildId, result.config, result.updatedAt.getTime());
  return result;
}

/** Persists a module and makes the change visible without waiting for the poll. */
export async function updateModule<K extends keyof AppConfig>(
  client: VeyraClient,
  guildId: string,
  actorId: string,
  module: K,
  value: unknown,
): Promise<ModuleUpdateResult<K>> {
  if (!client.db) throw new UserFacingError('The database is not configured.');
  if (module === 'personalizer' && !(await client.isPremium(guildId))) {
    throw new UserFacingError('The server personalizer is a Veyra Premium feature.');
  }

  const result = await dbUpdateModule(client.db, guildId, actorId, module, value).catch(
    invalidConfig,
  );
  return adopt(client, guildId, result);
}

/** Restores a module to defaults and applies it immediately. */
export async function resetModule<K extends keyof AppConfig>(
  client: VeyraClient,
  guildId: string,
  actorId: string,
  module: K,
): Promise<ModuleUpdateResult<K>> {
  if (!client.db) throw new UserFacingError('The database is not configured.');
  if (module === 'personalizer' && !(await client.isPremium(guildId))) {
    throw new UserFacingError('The server personalizer is a Veyra Premium feature.');
  }

  const result = await dbResetModule(client.db, guildId, actorId, module).catch(invalidConfig);
  return adopt(client, guildId, result);
}
