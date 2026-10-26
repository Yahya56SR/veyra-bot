import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { PREMIUM_FEATURES, PREMIUM_PLAN } from '@veyra/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Premium',
  description: 'Veyra Premium pricing, features, and billing details.',
};

export const dynamic = 'force-dynamic';

const FREE = [
  'Moderation cases, warnings, and temporary bans',
  'Automod and raid protection',
  'Per-event logging',
  'Support tickets with transcripts',
  'Leveling and role rewards',
  'Economy, daily streaks, and the role shop',
  'Giveaways, reaction roles, and starboard',
  'Music with a 100-track queue',
  '30-day dashboard analytics',
];

const PREMIUM = [
  'Everything in Free',
  'Server personalizer and branded templates',
  '24/7 music in voice',
  'Music queue up to 500 tracks',
  'One year of activity analytics',
  'Priority support and early features',
];

export default function PremiumPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="label">Premium</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Pay for the details, not the basics.
            </h1>
            <p className="muted mt-4">
              Every core module is free. Premium is a per-server subscription for branding, music
              persistence, longer history, and priority help. Billing runs through Stripe Checkout;
              cancel any time from the billing portal.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <article className="card card-pad flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">Free</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-white">$0</p>
                  <p className="mt-1 text-xs text-slate-500">per server, forever</p>
                </div>
                <span className="pill border-white/10 bg-white/[0.03] text-slate-400">Core</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                {FREE.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-300">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="btn btn-ghost mt-7 w-full">
                Start free
              </Link>
            </article>

            <article className="card card-pad relative flex flex-col border-violet-400/30 bg-violet-500/[0.04]">
              <span className="absolute right-5 top-5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                Recommended
              </span>
              <div>
                <p className="label text-violet-300">Premium</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-white">
                    ${(PREMIUM_PLAN.amountCents / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">/ {PREMIUM_PLAN.interval}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">per server, cancel any time</p>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                {PREMIUM.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-200">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="btn btn-primary mt-7 w-full">
                Choose a server
              </Link>
            </article>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
            <p className="label">What premium unlocks</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PREMIUM_FEATURES.map((feature) => (
                <article key={feature.id} className="card card-pad">
                  <h2 className="text-sm font-semibold text-slate-100">{feature.name}</h2>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                'Billing is per server',
                'Buying premium for one server does not change another. Each server has its own subscription and entitlement.',
              ],
              [
                'Stripe handles payment details',
                'Veyra never sees card numbers. Stripe Checkout and the Stripe billing portal manage payment methods, invoices, and cancellation.',
              ],
              [
                'Webhooks are idempotent',
                'Subscription events are de-duplicated before they update the server entitlement, so retries cannot double-apply.',
              ],
            ].map(([title, body]) => (
              <div key={title} className="card card-pad">
                <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Already have a server in mind?
            </h2>
            <p className="muted mx-auto mt-2 max-w-lg">
              Sign in with Discord, choose the server, and open Premium from its dashboard.
            </p>
            <Link href="/login" className="btn btn-primary mt-5">
              Continue with Discord
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
