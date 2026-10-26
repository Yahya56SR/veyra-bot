import type { Database } from '@veyra/db';
import type { VeyraClient } from './client.js';
import { UserFacingError } from './errors.js';

/** Returns the pool or a user-facing error when DATABASE_URL was not set. */
export function requireDb(client: VeyraClient): Database {
  if (!client.db) throw new UserFacingError('The database is not configured.');
  return client.db;
}
