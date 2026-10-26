import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getGuildAccess } from '@/lib/guilds';
import { tickets } from '@veyra/db';
import { eq } from 'drizzle-orm';
import { gunzipSync } from 'node:zlib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response('Not found', { status: 404 });

  const rows = await getDb()
    .select({
      guildId: tickets.guildId,
      transcript: tickets.transcript,
      bytes: tickets.transcriptBytes,
    })
    .from(tickets)
    .where(eq(tickets.id, Number(id)))
    .limit(1);

  const row = rows[0];
  if (!row) return new Response('Transcript not found', { status: 404 });
  if (!(await getGuildAccess(row.guildId, user))) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!row.transcript) return new Response('Transcript not found', { status: 404 });

  let html: string;
  try {
    html = gunzipSync(row.transcript).toString('utf8');
  } catch {
    return new Response('Transcript is corrupt', { status: 500 });
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': String(Buffer.byteLength(html, 'utf8')),
      'Content-Disposition': `inline; filename="ticket-${id}.html"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "sandbox allow-popups allow-popups-to-escape-sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:; script-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
