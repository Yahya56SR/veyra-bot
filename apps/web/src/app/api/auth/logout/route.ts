import { destroySession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { dashboardBase } from '@/lib/env';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return new Response('Forbidden', { status: 403 });
  }

  const base = dashboardBase(request);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (token) {
    await destroySession(token).catch((error: unknown) => {
      console.error(
        'Dashboard logout could not delete the session:',
        error instanceof Error ? error.message : error,
      );
    });
  }

  const response = NextResponse.redirect(new URL('/login', base), { status: 303 });
  response.cookies.set(SESSION_COOKIE, '', {
    ...sessionCookieOptions(base),
    maxAge: 0,
  });
  return response;
}
