import { ActivityChart } from '@/components/activity-chart';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { requireUser } from '@/lib/auth';
import { caseTargetIsChannel, caseTypeLabel, caseTypeTone, ticketStatusTone } from '@/lib/cases';
import { getDb } from '@/lib/db';
import { formatDateTime, formatNumber, formatRelative, formatVoice } from '@/lib/format';
import { busiestDay, cutoffDateKey, fillDaily, sumDaily } from '@/lib/stats';
import {
  cases as casesTable,
  configAudit,
  heartbeat as heartbeatTable,
  members,
  statsDaily,
  tickets,
} from '@nervana/db';
import { truncate } from '@nervana/shared';
import { desc, eq, gte, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  await requireUser();
  const db = getDb();
  const cutoff = cutoffDateKey(30);

  const [
    statRows,
    memberCountRows,
    openCountRows,
    openTickets,
    recentCases,
    recentAudit,
    heartbeatRows,
  ] = await Promise.all([
    db.select().from(statsDaily).where(gte(statsDaily.date, cutoff)).orderBy(statsDaily.date),
    db.select({ value: sql<number>`count(*)::int` }).from(members),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.status, 'open')),
    db
      .select()
      .from(tickets)
      .where(eq(tickets.status, 'open'))
      .orderBy(desc(tickets.openedAt))
      .limit(5),
    db.select().from(casesTable).orderBy(desc(casesTable.createdAt)).limit(6),
    db
      .select({
        id: configAudit.id,
        actorId: configAudit.actorId,
        module: configAudit.module,
        createdAt: configAudit.createdAt,
      })
      .from(configAudit)
      .orderBy(desc(configAudit.createdAt))
      .limit(5),
    db.select().from(heartbeatTable).where(eq(heartbeatTable.id, 1)).limit(1),
  ]);

  const totals = sumDaily(statRows);
  const daily = fillDaily(statRows, 14);
  const busiest = busiestDay(daily);
  const chartData = daily.map((row) => ({
    label: row.label,
    messages: row.messages,
    commands: row.commands,
    joins: row.joins,
  }));

  const memberCount = memberCountRows[0]?.value ?? 0;
  const openCount = openCountRows[0]?.value ?? 0;
  const netJoins = totals.joins - totals.leaves;
  const averageMessages = Math.round(totals.messages / 30);
  const latestHeartbeat = heartbeatRows[0]?.at ?? null;
  const heartbeatFresh =
    latestHeartbeat !== null && Date.now() - latestHeartbeat.getTime() < 7 * 60 * 60 * 1000;
  const latestAudit = recentAudit[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Server pulse"
        title="Overview"
        description="Thirty days of activity, the moderation queue, and the state of the bot — one page for the whole server."
        actions={
          <Link href="/activity" className="btn btn-ghost">
            Open activity
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Members tracked"
          value={formatNumber(memberCount)}
          detail="Members with a leveling or economy row."
          accent="violet"
        />
        <StatCard
          label="Messages · 30 days"
          value={formatNumber(totals.messages)}
          detail={`${formatNumber(averageMessages)} per day on average.`}
          accent="teal"
        />
        <StatCard
          label="Voice · 30 days"
          value={formatVoice(totals.voiceSeconds)}
          detail={`${formatNumber(totals.commands)} commands in the same range.`}
          accent="sky"
        />
        <StatCard
          label="Music plays"
          value={formatNumber(totals.musicPlays)}
          detail="Tracks started through Lavalink."
          accent="amber"
        />
        <StatCard
          label="Net joins"
          value={`${netJoins >= 0 ? '+' : ''}${formatNumber(netJoins)}`}
          detail={`${formatNumber(totals.joins)} joined · ${formatNumber(totals.leaves)} left.`}
          accent={netJoins >= 0 ? 'teal' : 'rose'}
        />
        <StatCard
          label="Open tickets"
          value={formatNumber(openCount)}
          detail={openCount === 0 ? 'The staff queue is clear.' : 'Waiting for staff attention.'}
          accent={openCount === 0 ? 'violet' : 'amber'}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="card card-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Activity · last 14 days</h2>
              <p className="mt-1 text-xs text-slate-500">
                Messages, commands, and joins from the daily aggregate.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-violet-400" /> Messages
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-teal-300" /> Commands
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-300" /> Joins
              </span>
            </div>
          </div>
          <div className="mt-4">
            <ActivityChart data={chartData} height={300} />
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="section-title">Heartbeat</h2>
          <p className="mt-1 text-xs text-slate-500">
            The bot writes a heartbeat every six hours so Supabase never pauses.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <span
              className={`size-2.5 rounded-full ${
                heartbeatFresh ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-rose-400'
              }`}
            />
            <div>
              <p className="text-sm font-medium text-slate-200">
                {heartbeatFresh ? 'Bot heartbeat is fresh' : 'Bot heartbeat is stale'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {latestHeartbeat ? formatRelative(latestHeartbeat) : 'No heartbeat recorded yet'}
              </p>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-white/[0.06] text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-slate-500">Busiest day</dt>
              <dd className="text-right text-slate-200">{busiest?.label ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-slate-500">Open tickets</dt>
              <dd className="text-slate-200">{formatNumber(openCount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-slate-500">Last config change</dt>
              <dd className="text-right text-slate-200">
                {latestAudit ? (
                  <Link href="/audit" className="hover:text-violet-200">
                    {latestAudit.module} · {formatRelative(latestAudit.createdAt)}
                  </Link>
                ) : (
                  'None yet'
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <div>
              <h2 className="section-title">Recent moderation</h2>
              <p className="mt-1 text-xs text-slate-500">The newest cases from every moderator.</p>
            </div>
            <Link href="/moderation" className="text-xs text-violet-300 hover:text-violet-200">
              View all
            </Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No cases yet"
                detail="Warnings, timeouts, and bans will appear here."
              />
            </div>
          ) : (
            <div className="table-wrap m-3 border-0">
              <table className="data-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((row) => (
                    <tr key={row.id}>
                      <td className="font-mono text-xs text-slate-500">#{row.id}</td>
                      <td>
                        <span className={`pill ${caseTypeTone(row.type)}`}>
                          {caseTypeLabel(row.type)}
                        </span>
                      </td>
                      <td>
                        {caseTargetIsChannel(row.type) ? (
                          <span className="font-mono text-xs text-slate-400" title="Channel ID">
                            {row.targetId}
                          </span>
                        ) : (
                          <Link
                            href={`https://discord.com/users/${row.targetId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-slate-300 hover:text-violet-200"
                          >
                            {row.targetId}
                          </Link>
                        )}
                        <p className="mt-1 max-w-[220px] text-xs text-slate-500">
                          {truncate(row.reason, 70)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap text-xs text-slate-500">
                        <time
                          dateTime={row.createdAt.toISOString()}
                          title={formatDateTime(row.createdAt)}
                        >
                          {formatRelative(row.createdAt)}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <div>
              <h2 className="section-title">Open tickets</h2>
              <p className="mt-1 text-xs text-slate-500">Channels currently waiting for staff.</p>
            </div>
            <Link href="/tickets" className="text-xs text-violet-300 hover:text-violet-200">
              View all
            </Link>
          </div>

          {openTickets.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Queue is clear" detail="New ticket channels will surface here." />
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {openTickets.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">#{ticket.id}</span>
                      <span className={`pill ${ticketStatusTone(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-300">
                      {ticket.category} · <span className="font-mono text-xs">{ticket.userId}</span>
                    </p>
                  </div>
                  <time
                    dateTime={ticket.openedAt.toISOString()}
                    title={formatDateTime(ticket.openedAt)}
                    className="shrink-0 text-xs text-slate-500"
                  >
                    {formatRelative(ticket.openedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card mt-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 className="section-title">Configuration audit</h2>
            <p className="mt-1 text-xs text-slate-500">
              Every `/setup` and dashboard write is recorded with its actor.
            </p>
          </div>
          <Link href="/audit" className="text-xs text-violet-300 hover:text-violet-200">
            Full log
          </Link>
        </div>

        {recentAudit.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No configuration changes" detail="The audit log is empty." />
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {recentAudit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="pill border-violet-400/25 bg-violet-400/10 text-violet-200">
                    {entry.module}
                  </span>
                  <Link
                    href={`https://discord.com/users/${entry.actorId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-slate-400 hover:text-violet-200"
                  >
                    {entry.actorId}
                  </Link>
                </div>
                <time
                  dateTime={entry.createdAt.toISOString()}
                  title={formatDateTime(entry.createdAt)}
                  className="text-xs text-slate-500"
                >
                  {formatRelative(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
