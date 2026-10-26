import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { requireUser } from '@/lib/auth';
import { ticketStatusTone } from '@/lib/cases';
import { getDb } from '@/lib/db';
import { formatBytes, formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import { tickets } from '@nervana/db';
import { desc, eq, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Tickets' };
export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  await requireUser();
  const db = getDb();

  const [openTickets, closedTickets, summaryRows] = await Promise.all([
    db.select().from(tickets).where(eq(tickets.status, 'open')).orderBy(desc(tickets.openedAt)),
    db
      .select()
      .from(tickets)
      .where(eq(tickets.status, 'closed'))
      .orderBy(desc(tickets.closedAt))
      .limit(30),
    db
      .select({
        open: sql<number>`(count(*) filter (where ${tickets.status} = 'open'))::int`,
        closed: sql<number>`(count(*) filter (where ${tickets.status} = 'closed'))::int`,
        transcripts: sql<number>`(count(*) filter (where ${tickets.transcript} is not null))::int`,
      })
      .from(tickets),
  ]);

  const summary = summaryRows[0] ?? { open: 0, closed: 0, transcripts: 0 };

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Tickets"
        description="Open ticket channels and recent closed tickets. Transcripts are gzipped HTML stored in Postgres and served with a locked-down content policy."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Open tickets"
          value={formatNumber(summary.open)}
          detail={summary.open === 0 ? 'The queue is clear.' : 'Waiting for staff.'}
          accent={summary.open === 0 ? 'teal' : 'amber'}
        />
        <StatCard
          label="Closed tickets"
          value={formatNumber(summary.closed)}
          detail="Lifetime closed count."
          accent="violet"
        />
        <StatCard
          label="Transcripts stored"
          value={formatNumber(summary.transcripts)}
          detail="Gzip-compressed HTML, capped at 1 MB each."
          accent="sky"
        />
      </section>

      <section className="card mt-4">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <h2 className="section-title">Open queue</h2>
          <p className="mt-1 text-xs text-slate-500">
            Claim, add, remove, and close tickets from Discord with `/ticket`.
          </p>
        </div>

        {openTickets.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No open tickets"
              detail="Clicking the ticket panel will create a channel and a row here."
            />
          </div>
        ) : (
          <div className="table-wrap m-3 border-0">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Category</th>
                  <th>Opened by</th>
                  <th>Claimed by</th>
                  <th>Opened</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {openTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="font-mono text-xs text-slate-400">#{ticket.id}</td>
                    <td className="text-slate-300">{ticket.category}</td>
                    <td>
                      <ProfileLink userId={ticket.userId} />
                    </td>
                    <td>{ticket.claimedBy ? <ProfileLink userId={ticket.claimedBy} /> : '—'}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      <time
                        dateTime={ticket.openedAt.toISOString()}
                        title={formatDateTime(ticket.openedAt)}
                      >
                        {formatRelative(ticket.openedAt)}
                      </time>
                    </td>
                    <td>
                      <span className={`pill ${ticketStatusTone(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mt-4">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <h2 className="section-title">Recently closed</h2>
          <p className="mt-1 text-xs text-slate-500">
            The 30 most recent closed tickets. Open displays the escaped HTML transcript in a
            sandboxed tab.
          </p>
        </div>

        {closedTickets.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No closed tickets"
              detail="Closed tickets and their transcripts will appear here."
            />
          </div>
        ) : (
          <div className="table-wrap m-3 border-0">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Category</th>
                  <th>Opened by</th>
                  <th>Claimed by</th>
                  <th>Closed</th>
                  <th>Transcript</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {closedTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="font-mono text-xs text-slate-400">#{ticket.id}</td>
                    <td className="text-slate-300">{ticket.category}</td>
                    <td>
                      <ProfileLink userId={ticket.userId} />
                    </td>
                    <td>{ticket.claimedBy ? <ProfileLink userId={ticket.claimedBy} /> : '—'}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {ticket.closedAt ? (
                        <time
                          dateTime={ticket.closedAt.toISOString()}
                          title={formatDateTime(ticket.closedAt)}
                        >
                          {formatRelative(ticket.closedAt)}
                        </time>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {ticket.transcript ? (
                        <a
                          href={`/api/tickets/${ticket.id}/transcript`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-violet-300 hover:text-violet-200"
                        >
                          Open · {formatBytes(ticket.transcriptBytes)}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600">None</span>
                      )}
                    </td>
                    <td>
                      <span className={`pill ${ticketStatusTone(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function ProfileLink({ userId }: { userId: string }) {
  return (
    <Link
      href={`https://discord.com/users/${userId}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs text-slate-400 hover:text-violet-200"
    >
      {userId}
    </Link>
  );
}
