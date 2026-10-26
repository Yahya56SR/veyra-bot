import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { botInviteUrl } from '@/lib/bot';
import { CATALOG_GROUPS } from '@/lib/command-catalog';
import { CATEGORY_LABELS, PREMIUM_FEATURES, PREMIUM_PLAN } from '@veyra/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Veyra · Discord operations, simplified',
  description:
    'Moderation, logging, tickets, leveling, economy, community, music, and analytics in one Discord bot with a real dashboard.',
};

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    title: 'Moderation that remembers',
    detail:
      'Cases, warnings, temporary bans, automod, raid protection, and a scheduler that cleans up expired punishments.',
  },
  {
    title: 'Logging without noise',
    detail:
      'Route each event to its own channel with embeds that stay readable, even in busy servers.',
  },
  {
    title: 'Tickets with transcripts',
    detail:
      'Button panels, claim and close flows, staff roles, and gzipped HTML transcripts stored safely.',
  },
  {
    title: 'Leveling & economy',
    detail:
      'XP curves, role rewards, daily streaks, work cooldowns, transfers, gambling, and a role shop.',
  },
  {
    title: 'Community tools',
    detail:
      'Persistent giveaways, reaction roles, select-menu role panels, starboard, polls, and reminders.',
  },
  {
    title: 'Music + analytics',
    detail:
      'Lavalink playback for SoundCloud and Spotify links, plus daily activity aggregates and a web dashboard.',
  },
];

export default function HomePage() {
  const invite = botInviteUrl();

  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:64px_64px]" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
            <div>
              <p className="pill border-violet-400/25 bg-violet-400/10 text-violet-200">
                Public Discord bot · one dashboard for every server
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                Run your Discord like a{' '}
                <span className="bg-linear-to-r from-violet-300 to-teal-200 bg-clip-text text-transparent">
                  product
                </span>
                .
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-8 text-slate-400">
                Veyra brings moderation, logging, tickets, leveling, economy, community, music, and
                analytics into one calm control room. Free core forever. Premium when you want the
                details.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {invite ? (
                  <a href={invite} className="btn btn-primary h-11 px-6 text-[15px]">
                    Add Veyra to Discord
                  </a>
                ) : null}
                <Link href="/login" className="btn btn-ghost h-11 px-6 text-[15px]">
                  Open the dashboard
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-600">
                Free core · no credit card · premium billed securely through Stripe
              </p>
            </div>

            <div className="card relative overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Server pulse</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">Veyra Community</p>
                </div>
                <span className="pill border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
                  Live
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {[
                  ['Messages · 30d', '184,209'],
                  ['Commands · 30d', '12,840'],
                  ['Open tickets', '3'],
                  ['Active cases', '18'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5"
                  >
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Activity · last 14 days</span>
                  <span className="text-teal-300">+18.4%</span>
                </div>
                <div className="mt-4 flex h-24 items-end gap-1.5">
                  {[38, 52, 44, 68, 58, 74, 62, 88, 72, 94, 80, 100, 86, 96].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-sm bg-linear-to-t from-violet-500/35 to-teal-300/80"
                        style={{ height: `${height}%` }}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-5 py-8 text-center sm:px-8 lg:grid-cols-4">
            {[
              ['50+', 'slash commands'],
              ['9', 'operations modules'],
              ['15s', 'config sync'],
              ['Free', 'core forever'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="label">Everything in one place</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The modules you would otherwise stitch together.
            </h2>
            <p className="muted mt-3">
              Each module has its own configuration, permissions, and audit trail. Disable what you
              do not need; the rest stays out of the way.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="card card-pad transition hover:border-white/20"
              >
                <h3 className="text-[15px] font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-black/20">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="label">Command coverage</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Familiar commands, fewer surprises.
                </h2>
              </div>
              <Link href="/commands" className="btn btn-ghost">
                Browse all commands
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {CATALOG_GROUPS.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300"
                >
                  {CATEGORY_LABELS[category]}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="label">Premium</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Make the bot feel like yours.
              </h2>
              <p className="muted mt-3 max-w-xl">
                Premium is per server and unlocks the personalizer, 24/7 music, longer queues,
                extended analytics, and priority support. Cancel any time from the billing portal.
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight text-white">
                  ${(PREMIUM_PLAN.amountCents / 100).toFixed(2)}
                </span>
                <span className="text-sm text-slate-500">/ {PREMIUM_PLAN.interval} per server</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/premium" className="btn btn-primary">
                  See what is included
                </Link>
                <Link href="/docs" className="btn btn-ghost">
                  Read the docs
                </Link>
              </div>
            </div>

            <div className="card card-pad">
              <ul className="space-y-4">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature.id} className="flex gap-3">
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-teal-400/15 text-teal-300">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        className="size-3"
                        aria-hidden="true"
                      >
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-200">
                        {feature.name}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {feature.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Bring your server into focus.
            </h2>
            <p className="muted mx-auto mt-3 max-w-xl">
              Invite Veyra, run <code className="text-slate-300">/setup</code>, and open the
              dashboard. The free core does not expire.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {invite ? (
                <a href={invite} className="btn btn-primary h-11 px-6 text-[15px]">
                  Add Veyra to Discord
                </a>
              ) : null}
              <Link href="/login" className="btn btn-ghost h-11 px-6 text-[15px]">
                Sign in to the dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
