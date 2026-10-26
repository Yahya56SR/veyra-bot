import { OAUTH_STATE_COOKIE, stateCookieOptions } from '@/lib/auth';
import { adminIds, dashboardBase, requiredEnv, sessionSecret } from '@/lib/env';
import { createOAuthState } from '@/lib/oauth-state';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const base = dashboardBase(request);

  try {
    const clientId = requiredEnv('DISCORD_CLIENT_ID');
    const secret = sessionSecret();
    if (adminIds().size === 0) {
      throw new Error('DASHBOARD_ADMIN_IDS is not configured.');
    }
    const oauth = createOAuthState(secret);

    const redirectUri = `${base}/api/auth/callback`;
    const authorize = new URL('https://discord.com/oauth2/authorize');
    authorize.searchParams.set('client_id', clientId);
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('redirect_uri', redirectUri);
    authorize.searchParams.set('scope', 'identify');
    authorize.searchParams.set('state', oauth.state);

    const response = NextResponse.redirect(authorize);
    response.cookies.set(OAUTH_STATE_COOKIE, oauth.nonce, stateCookieOptions(base));
    return response;
  } catch (error) {
    console.error(
      'Dashboard OAuth login could not start:',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.redirect(new URL('/login?error=config', base));
  }
}
