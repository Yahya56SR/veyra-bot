import { ActivityChart } from '@/components/activity-chart';
import { CommandBars } from '@/components/command-bars';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatNumber, formatPercent, formatVoice } from '@/lib/format';
import { busiestDay, cutoffDateKey, fillDaily, sumDaily } from '@/lib/stats';
import { commandUsage, statsDaily } from '@nervana/db';
import { gte, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Activity' };
export const dynamic = 'force-dynamic';

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  await requireUser();
  const params = await searchParams;
  const rawRange = Array.isArray(params.range) ? params.range[0] : params.range;
  const range = rawRange === '90' ? 90 : 30;
  const cutoff = cutoffDateKey(range);
  const db = getDb();

  const [statRows, commandRows] = await Promise.all([
    db.select().from(statsDaily).where(gte(statsDaily.date, cutoff)).orderBy(statsDaily.date),
    db
      .select({
        command: commandUsage.command,
        total: sql<number>`sum(${commandUsage.count})::int`,
      })
      .from(commandUsage)
      .where(gte(commandUsage.date, cutoff))
      .groupBy(commandUsage.command),
  ]);

  const totals = sumDaily(statRows);
  const daily = fillDaily(statRows, range);
  const chartData = daily.map((row) => ({
    label: row.label,
    messages: row.messages,
    commands: row.commands,
    joins: row.joins,
  }));
  const busiest = busiestDay(daily);
  const netJoins = totals.joins - totals.leaves;
  const averageCommands = Math.round(totals.commands / range);
  const commands = commandRows
    .slice()
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ command: row.command, total: row.total }));

  return (
    <>
      <PageHeader
        eyebrow="Daily aggregate"
        title="Activity"
        description="Message, voice, command, and music totals are buffered by the bot and written once every 30 seconds. Daily rows are kept for 90 days."
        actions={
          <div className="flex rounded-lg border border-white/10 bg-white/[0.02] p-1">
            {[30, 90].map((value) => (
              <Link
                key={value}
                href={`/activity?range=${value}`}
                className={[
                  'rounded-md px-3 py-1.5 text-xs transition',
                  range === value
                    ? 'bg-violet-500/20 text-violet-100'
                    : 'text-slate-500 hover:text-slate-200',
                ].join(' ')}
              >
                {value} days
              </Link>
            ))}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Messages"
          value={formatNumber(totals.messages)}
          detail={`${formatNumber(Math.round(totals.messages / range))} per day.`}
          accent="violet"
        />
        <StatCard
          label="Commands"
          value={formatNumber(totals.commands)}
          detail={`${formatNumber(averageCommands)} slash commands per day.`}
          accent="teal"
        />
        <StatCard
          label="Net joins"
          value={`${netJoins >= 0 ? '+' : ''}${formatNumber(netJoins)}`}
          detail={`${formatNumber(totals.joins)} joined · ${formatNumber(totals.leaves)} left.`}
          accent={netJoins >= 0 ? 'sky' : 'rose'}
        />
        <StatCard
          label="Voice time"
          value={formatVoice(totals.voiceSeconds)}
          detail="Tracked from voice state changes."
          accent="amber"
        />
        <StatCard
          label="Music plays"
          value={formatNumber(totals.musicPlays)}
          detail="Each successful track start."
          accent="violet"
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="card card-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Messages, commands, and joins</h2>
              <p className="mt-1 text-xs text-slate-500">
                {range}-day window ·{' '}
                {totals.messages > 0
                  ? `${formatPercent(totals.commands, totals.messages)} command-to-message ratio.`
                  : 'No messages recorded in this range.'}
              </p>
            </div>
            <div className="flex gap-3 text-[11px] text-slate-500">
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
            <ActivityChart data={chartData} height={360} />
          </div>
        </div>

        <div className="card card-pad">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Command usage</h2>
              <p className="mt-1 text-xs text-slate-500">Grouped across the selected range.</p>
            </div>
            <span className="pill border-white/10 bg-white/[0.03] text-slate-400">
              {formatNumber(commands.reduce((sum, row) => sum + row.total, 0))}
            </span>
          </div>
          <div className="mt-5">
            <CommandBars rows={commands} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="card card-pad">
          <p className="label">Busiest day</p>
          <p className="mt-3 text-2xl font-semibold text-white">{busiest?.label ?? '—'}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {busiest ? `${formatNumber(busiest.messages)} messages` : 'No activity recorded.'}
          </p>
        </div>
        <div className="card card-pad">
          <p className="label">Join / leave balance</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {netJoins >= 0 ? '+' : ''}
            {formatNumber(netJoins)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {formatNumber(totals.joins)} joins against {formatNumber(totals.leaves)} leaves.
          </p>
        </div>
        <div className="card card-pad">
          <p className="label">Retention</p>
          <p className="mt-3 text-2xl font-semibold text-white">90 days</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Older <code className="text-slate-400">stats_daily</code> and{' '}
            <code className="text-slate-400">command_usage</code> rows are pruned by the bot.
          </p>
        </div>
      </section>
    </>
  );
}
