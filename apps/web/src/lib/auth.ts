import { sessions, users } from '@nervana/db';
import { and, eq, gt, lt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from './db';
import { discordAvatarUrl } from './discord';
import { adminIds, isHttps } from './env';
import { hashToken, randomToken } from './tokens';

export const SESSION_COOKIE = 'nervana_session';
export const OAUTH_STATE_COOKIE = 'nervana_oauth_state';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
}

export interface SessionUser {
  id: string;
  username: string;
  avatarUrl: string;
}

export function sessionCookieOptions(base: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(base),
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function stateCookieOptions(base: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(base),
    path: '/api/auth/callback',
    maxAge: 10 * 60,
  };
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const db = getDb();
  const now = new Date();

  // Keep the table small on a free database.
  await db.delete(sessions).where(lt(sessions.expiresAt, now));

  const token = randomToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await getDb()
    .delete(sessions)
    .where(eq(sessions.id, hashToken(token)));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      id: sessions.userId,
      username: users.username,
      avatar: users.avatar,
    })
    .from(sessions)
    .innerJoin(users, eq(users.discordId, sessions.userId))
    .where(and(eq(sessions.id, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Removing an operator from the allowlist revokes live sessions too.
  if (!adminIds().has(row.id)) {
    await db.delete(sessions).where(eq(sessions.id, tokenHash));
    return null;
  }

  return {
    id: row.id,
    username: row.username || 'Discord user',
    avatarUrl: discordAvatarUrl(row.id, row.avatar),
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}
