import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { requireGuildAccess } from '@/lib/guilds';
import { getDb } from '@/lib/db';
import { formatNumber, formatVoice } from '@/lib/format';
import { members } from '@veyra/db';
import { levelFromXp } from '@veyra/shared';
import { desc, eq, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Members' };
export const dynamic = 'force-dynamic';

export default async function MembersPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const db = getDb();

  const [byXp, byBalance, summaryRows] = await Promise.all([
    db
      .select()
      .from(members)
      .where(eq(members.guildId, guildId))
      .orderBy(desc(members.xp))
      .limit(50),
    db
      .select()
      .from(members)
      .where(eq(members.guildId, guildId))
      .orderBy(desc(members.balance))
      .limit(50),
    db
      .select({
        count: sql<number>`count(*)::int`,
        highestLevel: sql<number>`coalesce(max(${members.level}), 0)::int`,
        totalBalance: sql<number>`coalesce(sum(${members.balance}), 0)::float8`,
        totalMessages: sql<number>`coalesce(sum(${members.messages}), 0)::int`,
        totalVoice: sql<number>`coalesce(sum(${members.voiceSeconds}), 0)::int`,
      })
      .from(members)
      .where(eq(members.guildId, guildId)),
  ]);

  const summary = summaryRows[0] ?? {
    count: 0,
    highestLevel: 0,
    totalBalance: 0,
    totalMessages: 0,
    totalVoice: 0,
  };

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Members"
        description="XP, levels, balances, and participation for every member the bot has written to Postgres. Discord usernames are not copied into the database, so rows link to the profile by ID."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracked members"
          value={formatNumber(summary.count)}
          detail="Members with at least one database row."
          accent="violet"
        />
        <StatCard
          label="Highest level"
          value={formatNumber(summary.highestLevel)}
          detail="Stored level from the leveling service."
          accent="teal"
        />
        <StatCard
          label="Total balance"
          value={formatNumber(Math.round(summary.totalBalance))}
          detail="Across every economy account."
          accent="amber"
        />
        <StatCard
          label="Tracked voice"
          value={formatVoice(summary.totalVoice)}
          detail={`${formatNumber(summary.totalMessages)} messages counted.`}
          accent="sky"
        />
      </section>

      <section className="mt-4 grid gap-4 2xl:grid-cols-2">
        <div className="card">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="section-title">Leveling leaderboard</h2>
            <p className="mt-1 text-xs text-slate-500">Top 50 by lifetime XP.</p>
          </div>

          {byXp.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No XP rows"
                detail="Enable leveling and send a few messages to populate this table."
              />
            </div>
          ) : (
            <div className="table-wrap m-3 border-0">
              <table className="data-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Level</th>
                    <th>XP</th>
                    <th>Progress</th>
                    <th>Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {byXp.map((row, index) => {
                    const progress = levelFromXp(row.xp);
                    const percent = Math.min(
                      100,
                      Math.round((progress.current / Math.max(progress.needed, 1)) * 100),
                    );
                    return (
                      <tr key={row.userId}>
                        <td className="font-mono text-xs text-slate-500">{index + 1}</td>
                        <td>
                          <Link
                            href={`https://discord.com/users/${row.userId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-slate-300 hover:text-violet-200"
                          >
                            {row.userId}
                          </Link>
                        </td>
                        <td className="font-medium text-slate-200">{progress.level}</td>
                        <td>{formatNumber(row.xp)}</td>
                        <td className="w-40">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-violet-400 to-teal-300"
                                style={{ width: `${Math.max(2, percent)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500">{percent}%</span>
                          </div>
                        </td>
                        <td>{formatNumber(row.messages)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="section-title">Balance leaderboard</h2>
            <p className="mt-1 text-xs text-slate-500">Top 50 by wallet balance.</p>
          </div>

          {byBalance.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No economy rows"
                detail="Enable the economy and let members run /daily to populate this table."
              />
            </div>
          ) : (
            <div className="table-wrap m-3 border-0">
              <table className="data-table min-w-[520px]">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Balance</th>
                    <th>Streak</th>
                    <th>Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {byBalance.map((row, index) => (
                    <tr key={row.userId}>
                      <td className="font-mono text-xs text-slate-500">{index + 1}</td>
                      <td>
                        <Link
                          href={`https://discord.com/users/${row.userId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-slate-300 hover:text-violet-200"
                        >
                          {row.userId}
                        </Link>
                      </td>
                      <td className="font-medium text-emerald-200">{formatNumber(row.balance)}</td>
                      <td>{formatNumber(row.dailyStreak)} days</td>
                      <td>{formatNumber(row.messages)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
