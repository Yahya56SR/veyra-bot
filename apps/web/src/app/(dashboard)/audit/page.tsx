import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import { configAudit } from '@nervana/db';
import { desc, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

function pretty(value: unknown): string {
  if (value === undefined) return 'undefined';
  const text = JSON.stringify(value, null, 2) ?? 'null';
  return text.length > 40_000 ? `${text.slice(0, 40_000)}\n… truncated` : text;
}

export default async function AuditPage() {
  await requireUser();
  const db = getDb();

  const [entries, summaryRows, actorRows] = await Promise.all([
    db.select().from(configAudit).orderBy(desc(configAudit.createdAt)).limit(50),
    db.select({ value: sql<number>`count(*)::int` }).from(configAudit),
    db
      .select({ value: sql<number>`count(distinct ${configAudit.actorId})::int` })
      .from(configAudit),
  ]);

  const total = summaryRows[0]?.value ?? 0;
  const actors = actorRows[0]?.value ?? 0;
  const latest = entries[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Accountability"
        title="Audit log"
        description="Both /setup and this dashboard write through the same transactional settings function. Before and after values are captured for every module."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Recorded changes"
          value={formatNumber(total)}
          detail="Every configuration write."
          accent="violet"
        />
        <StatCard
          label="Distinct actors"
          value={formatNumber(actors)}
          detail="Staff who changed configuration."
          accent="teal"
        />
        <StatCard
          label="Latest change"
          value={latest ? latest.module : '—'}
          detail={latest ? formatRelative(latest.createdAt) : 'No changes yet.'}
          accent="amber"
        />
      </section>

      <section className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <div className="card p-5">
            <EmptyState
              title="Audit log is empty"
              detail="Run /setup or save a module in Settings to create the first entry."
            />
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
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
                  <span className="font-mono text-[11px] text-slate-600">#{entry.id}</span>
                </div>
                <time
                  dateTime={entry.createdAt.toISOString()}
                  title={formatDateTime(entry.createdAt)}
                  className="text-xs text-slate-500"
                >
                  {formatDateTime(entry.createdAt)}
                </time>
              </div>

              <details className="group mt-4">
                <summary className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400 transition hover:text-slate-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 transition group-open:rotate-90"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                  Show before and after
                </summary>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="label mb-2">Before</p>
                    <pre className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[11px] leading-5 text-slate-400">
                      {pretty(entry.before)}
                    </pre>
                  </div>
                  <div>
                    <p className="label mb-2">After</p>
                    <pre className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[11px] leading-5 text-slate-300">
                      {pretty(entry.after)}
                    </pre>
                  </div>
                </div>
              </details>
            </article>
          ))
        )}
      </section>

      <p className="mt-4 text-xs text-slate-600">
        Showing the newest 50 entries. Configuration values contain channel, role, and user IDs —
        never bot tokens or Lavalink credentials.
      </p>
    </>
  );
}
