import {
  createSession,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
  stateCookieOptions,
} from '@/lib/auth';
import { getDb } from '@/lib/db';
import { dashboardBase, sessionSecret } from '@/lib/env';
import { exchangeCode, fetchDiscordGuilds, fetchDiscordUser } from '@/lib/discord';
import { syncGuildMemberships } from '@/lib/guilds';
import { verifyOAuthState } from '@/lib/oauth-state';
import { users } from '@veyra/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function backToLogin(base: string, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?error=${code}`, base));
}

function clearState(response: NextResponse, base: string): void {
  response.cookies.set(OAUTH_STATE_COOKIE, '', {
    ...stateCookieOptions(base),
    maxAge: 0,
  });
}

export async function GET(request: Request): Promise<Response> {
  const base = dashboardBase(request);
  const url = new URL(request.url);

  if (url.searchParams.get('error')) {
    const response = backToLogin(base, 'access');
    clearState(response, base);
    return response;
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const nonce = (await cookies()).get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !nonce) {
    const response = backToLogin(base, 'state');
    clearState(response, base);
    return response;
  }

  try {
    const secret = sessionSecret();
    if (!verifyOAuthState(state, nonce, secret)) {
      const response = backToLogin(base, 'state');
      clearState(response, base);
      return response;
    }

    const redirectUri = `${base}/api/auth/callback`;
    const accessToken = await exchangeCode(code, redirectUri);
    const discordUser = await fetchDiscordUser(accessToken);
    const discordGuilds = await fetchDiscordGuilds(accessToken);

    const db = getDb();
    const username = discordUser.global_name?.trim() || discordUser.username;

    await db
      .insert(users)
      .values({
        discordId: discordUser.id,
        username,
        avatar: discordUser.avatar,
      })
      .onConflictDoUpdate({
        target: users.discordId,
        set: { username, avatar: discordUser.avatar },
      });

    await syncGuildMemberships(db, discordUser.id, discordGuilds);

    const session = await createSession(discordUser.id);
    const response = NextResponse.redirect(new URL('/servers', base));
    clearState(response, base);
    response.cookies.set(SESSION_COOKIE, session.token, {
      ...sessionCookieOptions(base),
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    console.error(
      'Dashboard OAuth callback failed:',
      error instanceof Error ? error.message : error,
    );
    const response = backToLogin(base, 'oauth');
    clearState(response, base);
    return response;
  }
}
