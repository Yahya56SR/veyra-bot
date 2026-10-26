import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getDb } from '@/lib/db';
import { guilds, heartbeat } from '@veyra/db';
import { eq, isNull, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Live Veyra bot heartbeat and aggregate platform status.',
};

export const dynamic = 'force-dynamic';

interface StatusSnapshot {
  heartbeatAt: Date | null;
  guilds: number;
  members: number;
  unavailable: boolean;
}

async function readStatus(): Promise<StatusSnapshot> {
  try {
    const db = getDb();
    const [heartbeatRows, guildRows] = await Promise.all([
      db.select().from(heartbeat).where(eq(heartbeat.id, 1)).limit(1),
      db
        .select({
          guilds: sql<number>`count(*)::int`,
          members: sql<number>`coalesce(sum(${guilds.memberCount}), 0)::int`,
        })
        .from(guilds)
        .where(isNull(guilds.leftAt)),
    ]);

    return {
      heartbeatAt: heartbeatRows[0]?.at ?? null,
      guilds: guildRows[0]?.guilds ?? 0,
      members: guildRows[0]?.members ?? 0,
      unavailable: false,
    };
  } catch {
    return { heartbeatAt: null, guilds: 0, members: 0, unavailable: true };
  }
}

export default async function StatusPage() {
  const status = await readStatus();
  const fresh =
    status.heartbeatAt !== null && Date.now() - status.heartbeatAt.getTime() < 7 * 60 * 60 * 1000;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="label">Status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Platform status
        </h1>
        <p className="muted mt-4 max-w-2xl">
          The bot writes a heartbeat every six hours. This page reads the same heartbeat and the
          aggregate guild count from Postgres.
        </p>

        {status.unavailable ? (
          <div className="mt-8 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
            The status database is not reachable from this deployment. The bot may still be online;
            check the support server for live updates.
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <article className="card card-pad">
            <p className="label">Bot heartbeat</p>
            <div className="mt-3 flex items-center gap-2.5">
              <span
                className={`size-2.5 rounded-full ${
                  fresh ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-rose-400'
                }`}
              />
              <p className="text-lg font-semibold text-white">
                {status.unavailable ? 'Unknown' : fresh ? 'Operational' : 'Stale'}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {status.heartbeatAt
                ? `Last write ${status.heartbeatAt.toISOString().replace('T', ' ').slice(0, 16)} UTC`
                : 'No heartbeat recorded yet.'}
            </p>
          </article>

          <article className="card card-pad">
            <p className="label">Servers</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {status.unavailable ? '—' : status.guilds.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-500">Active guilds the bot is currently in.</p>
          </article>

          <article className="card card-pad">
            <p className="label">Reach</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {status.unavailable ? '—' : status.members.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Members counted at the last guild refresh.
            </p>
          </article>
        </div>

        <section className="card mt-4">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="section-title">What this page checks</h2>
            <p className="mt-1 text-xs text-slate-500">
              A stale heartbeat usually means the bot process is restarting or the host ran out of
              memory.
            </p>
          </div>
          <ul className="divide-y divide-white/[0.06] text-sm">
            {[
              ['Discord gateway', 'The bot has completed login and is receiving events.'],
              ['Database', 'Settings, cases, tickets, and analytics are reachable.'],
              ['Dashboard', 'This page is rendered by the same deployment as the control room.'],
              ['Music', 'Depends on the external Lavalink node and the MUSIC_ENABLED override.'],
            ].map(([title, detail]) => (
              <li
                key={title}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              >
                <span className="font-medium text-slate-300">{title}</span>
                <span className="text-xs text-slate-500">{detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 text-xs text-slate-600">
          Looking for help? Read the{' '}
          <Link href="/docs" className="text-violet-300">
            setup guide
          </Link>{' '}
          or open the dashboard.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
