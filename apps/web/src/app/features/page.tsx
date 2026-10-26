import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { botInviteUrl } from '@/lib/bot';
import { PREMIUM_FEATURES } from '@veyra/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Moderation, automod, logging, tickets, leveling, economy, community, music, and analytics in one Discord bot.',
};

export const dynamic = 'force-dynamic';

const SECTIONS = [
  {
    eyebrow: 'Trust & safety',
    title: 'Moderation with a paper trail',
    body: 'Every warning, timeout, kick, ban, softban, purge, and slowmode change becomes a case. Case IDs are sequential, reasons are stored, and temporary bans are lifted by a scheduler instead of a fragile timer.',
    points: [
      'Warnings with active state and clear-all',
      'Temporary bans and timeouts with expiry display',
      'Case filters and per-case detail',
      'DM notifications and a dedicated mod-log channel',
    ],
  },
  {
    eyebrow: 'Automod',
    title: 'Stop the obvious before staff wake up',
    body: 'Invite links, blocked domains, spam windows, mass mentions, excessive caps, filtered words, and join-rate raid detection are configurable per server. Staff roles, channels, and the owner are exempt.',
    points: [
      'Delete, warn, timeout, or kick per rule',
      'Link allowlists and ignored channels',
      'Raid mode with a bounded per-guild join window',
      'Actions recorded as normal cases',
    ],
  },
  {
    eyebrow: 'Logging',
    title: 'A clean record of what changed',
    body: 'Route message edits and deletes, member joins and leaves, role and channel changes, voice activity, and moderation events to separate channels. Embeds are bounded so a busy server cannot flood memory.',
    points: [
      'Per-event channel routing',
      'Branded footers and timestamps',
      'Ticket close transcripts',
      'No message content buffering beyond the event',
    ],
  },
  {
    eyebrow: 'Support',
    title: 'Tickets that survive the conversation',
    body: 'A button panel opens private channels with the right staff role and member permissions. Staff can claim, add, remove, and close. Closing writes a gzipped HTML transcript to Postgres and posts the link to your log channel.',
    points: [
      'Category-based ticket panels',
      'Claim and close controls',
      'One open ticket per member option',
      'Sandboxed transcript viewer with no scripts',
    ],
  },
  {
    eyebrow: 'Progress',
    title: 'Leveling and economy that feel native',
    body: 'XP is awarded for eligible messages with a cooldown, level curves, role rewards, and personalized level-up announcements. The economy adds daily streaks, work cooldowns, transfers with deadlock-safe locking, gambling, and a role shop with stock.',
    points: [
      'Rank cards and server leaderboards',
      'Role rewards at configured levels',
      'Daily streaks and work cooldowns',
      'Atomic purchases with automatic refunds',
    ],
  },
  {
    eyebrow: 'Community',
    title: 'Giveaways, roles, polls, and reminders',
    body: 'Persistent button giveaways, reaction-role panels, select-menu role pickers, starboard, polls, and database-backed reminders keep the social layer moving without another bot.',
    points: [
      'Giveaway requirements by level or role',
      'Reaction and select-menu role panels',
      'Starboard with ignore lists and thresholds',
      'Reminders delivered after restarts',
    ],
  },
];

export default function FeaturesPage() {
  const invite = botInviteUrl();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="label">Features</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            One bot. The whole operations layer.
          </h1>
          <p className="muted mt-4 max-w-2xl">
            Veyra is designed for servers that want a single, coherent tool instead of ten bots with
            overlapping commands and different ideas about permissions.
          </p>
        </section>

        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8">
            {SECTIONS.map((section, index) => (
              <article
                key={section.title}
                className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"
              >
                <div>
                  <p className="label">{section.eyebrow}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {section.title}
                  </h2>
                </div>
                <div className={index % 2 === 1 ? 'lg:pl-8' : ''}>
                  <p className="text-sm leading-7 text-slate-400">{section.body}</p>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-2 text-sm text-slate-300">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-300" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <div className="card card-pad grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="label">Premium layer</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Extra control for servers that need it.
              </h2>
              <p className="muted mt-3">
                Premium is per server and unlocks branding, music persistence, extended analytics,
                and priority help.
              </p>
              <Link href="/premium" className="btn btn-primary mt-6">
                Compare plans
              </Link>
            </div>
            <ul className="space-y-3">
              {PREMIUM_FEATURES.map((feature) => (
                <li
                  key={feature.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <p className="text-sm font-medium text-slate-200">{feature.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{feature.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-white/10">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              See it in your own server.
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {invite ? (
                <a href={invite} className="btn btn-primary h-11 px-6">
                  Add Veyra to Discord
                </a>
              ) : null}
              <Link href="/commands" className="btn btn-ghost h-11 px-6">
                Browse commands
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
