import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { requireUser } from '@/lib/auth';
import {
  CASE_TYPES,
  CASE_TYPE_LABELS,
  caseTargetIsChannel,
  caseTypeLabel,
  caseTypeTone,
  isCaseType,
} from '@/lib/cases';
import { getDb } from '@/lib/db';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import { cases as casesTable } from '@nervana/db';
import { truncate } from '@nervana/shared';
import { and, desc, eq, gte, sql, type SQL } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Moderation' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[];
    state?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requireUser();
  const params = await searchParams;
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawState = Array.isArray(params.state) ? params.state[0] : params.state;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;

  const type = isCaseType(rawType) ? rawType : null;
  const state = rawState === 'active' || rawState === 'inactive' ? rawState : 'all';
  const requestedPage = Number.parseInt(rawPage ?? '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const filters: SQL[] = [];
  if (type) filters.push(eq(casesTable.type, type));
  if (state === 'active') filters.push(eq(casesTable.active, true));
  if (state === 'inactive') filters.push(eq(casesTable.active, false));
  const where = filters.length > 0 ? and(...filters) : undefined;

  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [rows, totalRows, allRows, activeRows, recentRows] = await Promise.all([
    db
      .select()
      .from(casesTable)
      .where(where)
      .orderBy(desc(casesTable.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(casesTable)
      .where(where),
    db.select({ value: sql<number>`count(*)::int` }).from(casesTable),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(casesTable)
      .where(eq(casesTable.active, true)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(casesTable)
      .where(gte(casesTable.createdAt, since)),
  ]);

  const total = totalRows[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefFor = (nextPage: number): string => {
    const search = new URLSearchParams();
    if (type) search.set('type', type);
    if (state !== 'all') search.set('state', state);
    if (nextPage > 1) search.set('page', String(nextPage));
    const query = search.toString();
    return query ? `/moderation?${query}` : '/moderation';
  };

  return (
    <>
      <PageHeader
        eyebrow="Cases"
        title="Moderation"
        description="Every warning, timeout, kick, ban, and purge that passed through the bot. Active cases are the ones still in force."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="All cases"
          value={formatNumber(allRows[0]?.value ?? 0)}
          detail="Lifetime case count."
          accent="violet"
        />
        <StatCard
          label="Active cases"
          value={formatNumber(activeRows[0]?.value ?? 0)}
          detail="Warnings, timeouts, bans, and slowmode."
          accent="amber"
        />
        <StatCard
          label="Last 30 days"
          value={formatNumber(recentRows[0]?.value ?? 0)}
          detail="New cases in the rolling month."
          accent="teal"
        />
      </section>

      <section className="card mt-4">
        <div className="border-b border-white/[0.08] p-4 sm:p-5">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="grid gap-1.5">
              <span className="label">Type</span>
              <select name="type" defaultValue={type ?? ''} className="input min-w-40">
                <option value="">All types</option>
                {CASE_TYPES.map((caseType) => (
                  <option key={caseType} value={caseType}>
                    {CASE_TYPE_LABELS[caseType]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="label">State</span>
              <select name="state" defaultValue={state} className="input min-w-36">
                <option value="all">All states</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <button type="submit" className="btn btn-primary">
              Filter
            </button>
            <Link href="/moderation" className="btn btn-ghost">
              Reset
            </Link>
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No cases match"
              detail="Change the filters or wait for the next moderation action."
            />
          </div>
        ) : (
          <div className="table-wrap m-3 border-0">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Moderator</th>
                  <th>Reason</th>
                  <th>State</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
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
                    </td>
                    <td>
                      <Link
                        href={`https://discord.com/users/${row.moderatorId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-slate-400 hover:text-violet-200"
                      >
                        {row.moderatorId}
                      </Link>
                    </td>
                    <td className="max-w-[280px]">
                      <p className="text-xs leading-5 text-slate-400" title={row.reason}>
                        {truncate(row.reason, 160)}
                      </p>
                    </td>
                    <td>
                      <span
                        className={`pill ${
                          row.active
                            ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                            : 'border-slate-400/20 bg-slate-400/10 text-slate-400'
                        }`}
                      >
                        {row.active ? 'Active' : 'Inactive'}
                      </span>
                      {row.expiresAt ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {row.expiresAt.getTime() <= Date.now() ? 'Expired' : 'Expires'}{' '}
                          {formatRelative(row.expiresAt)}
                        </p>
                      ) : null}
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-4 text-xs text-slate-500">
          <span>
            {formatNumber(total)} case{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={hrefFor(page - 1)} className="btn btn-ghost h-8">
                Previous
              </Link>
            ) : (
              <span className="btn btn-ghost h-8 pointer-events-none opacity-40">Previous</span>
            )}
            {page < totalPages ? (
              <Link href={hrefFor(page + 1)} className="btn btn-ghost h-8">
                Next
              </Link>
            ) : (
              <span className="btn btn-ghost h-8 pointer-events-none opacity-40">Next</span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
