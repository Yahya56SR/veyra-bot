import { PageHeader } from '@/components/page-header';
import { requireGuildAccess } from '@/lib/guilds';
import {
  grantManualPremiumAction,
  openBillingPortalAction,
  startCheckoutAction,
} from '@/lib/billing-actions';
import { billingConfigured } from '@/lib/stripe';
import { formatDateTime } from '@/lib/format';
import { listPremiumSubscriptions } from '@veyra/db';
import { getDb } from '@/lib/db';
import { PREMIUM_FEATURES, PREMIUM_PLAN, premiumActive } from '@veyra/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Premium' };
export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, { tone: 'ok' | 'warn' | 'error'; text: string }> = {
  success: {
    tone: 'ok',
    text: 'Checkout completed. Stripe is confirming the subscription; the entitlement updates as soon as the webhook arrives.',
  },
  cancel: { tone: 'warn', text: 'Checkout was cancelled. Nothing was charged.' },
  missing: {
    tone: 'warn',
    text: 'Stripe is not configured on this deployment yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable checkout.',
  },
  error: {
    tone: 'error',
    text: 'Stripe could not start the billing flow. Check the deployment logs and try again.',
  },
  'no-customer': {
    tone: 'warn',
    text: 'There is no Stripe customer for this server yet. Start a checkout first.',
  },
  granted: { tone: 'ok', text: 'Manual premium grant added.' },
  invalid: { tone: 'error', text: 'Enter a grant length between 1 and 3650 days.' },
};

export default async function PremiumPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ checkout?: string; billing?: string; manual?: string }>;
}) {
  const { guildId } = await params;
  const { access, user } = await requireGuildAccess(guildId);
  const query = await searchParams;
  const guild = access.guild;
  const premium = premiumActive(guild.premiumTier, guild.premiumUntil);
  const subscriptions = await listPremiumSubscriptions(getDb(), guildId);
  const configured = billingConfigured();

  const message =
    MESSAGES[query.checkout ?? ''] ??
    MESSAGES[query.billing ?? ''] ??
    MESSAGES[query.manual ?? ''] ??
    null;

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Premium"
        description="Premium is attached to this server, not your Discord account. Stripe Checkout and the billing portal handle payment details; Veyra stores the entitlement."
        actions={
          <Link href={`/g/${guildId}/personalizer`} className="btn btn-ghost">
            Open personalizer
          </Link>
        }
      />

      {message ? (
        <div
          className={[
            'mb-4 rounded-2xl border p-4 text-sm leading-6',
            message.tone === 'ok'
              ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-100/80'
              : message.tone === 'warn'
                ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-100/80'
                : 'border-rose-400/20 bg-rose-400/[0.06] text-rose-100/80',
          ].join(' ')}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="card card-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label">Current plan</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {premium ? 'Veyra Premium' : 'Free core'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {premium
                  ? guild.premiumUntil
                    ? `Active until ${formatDateTime(guild.premiumUntil)}`
                    : 'Active with no fixed expiry (manual grant)'
                  : 'All core modules are available without a subscription.'}
              </p>
            </div>
            <span
              className={`pill ${
                premium
                  ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                  : 'border-white/10 bg-white/[0.03] text-slate-400'
              }`}
            >
              {premium ? 'Premium' : 'Free'}
            </span>
          </div>

          <dl className="mt-6 divide-y divide-white/[0.06] text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-slate-500">Server</dt>
              <dd className="text-right text-slate-200">{guild.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-slate-500">Billing</dt>
              <dd className="text-right text-slate-200">
                {configured ? 'Stripe Checkout' : 'Not configured'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-slate-500">Active grants</dt>
              <dd className="text-right text-slate-200">{subscriptions.length}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {premium ? (
              <form action={openBillingPortalAction}>
                <input type="hidden" name="guildId" value={guildId} />
                <button
                  type="submit"
                  disabled={!configured}
                  className="btn btn-primary disabled:opacity-50"
                >
                  Manage billing
                </button>
              </form>
            ) : (
              <form action={startCheckoutAction}>
                <input type="hidden" name="guildId" value={guildId} />
                <button
                  type="submit"
                  disabled={!configured}
                  className="btn btn-primary disabled:opacity-50"
                >
                  Start Checkout · ${(PREMIUM_PLAN.amountCents / 100).toFixed(2)}/
                  {PREMIUM_PLAN.interval}
                </button>
              </form>
            )}
            <Link href={`/g/${guildId}/personalizer`} className="btn btn-ghost">
              {premium ? 'Customize branding' : 'Preview personalizer'}
            </Link>
          </div>
        </article>

        <article className="card card-pad">
          <p className="label">Included with premium</p>
          <ul className="mt-4 space-y-3">
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
                  <span className="block text-sm font-medium text-slate-200">{feature.name}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {feature.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card mt-4">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <h2 className="section-title">Active subscriptions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Only grants that are active now are shown. Stripe keeps the full invoice history.
          </p>
        </div>
        {subscriptions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No active subscription or grant.</p>
        ) : (
          <div className="table-wrap m-3 border-0">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Renews / ends</th>
                  <th>Subscription</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((row) => (
                  <tr key={row.id}>
                    <td className="capitalize text-slate-300">{row.provider}</td>
                    <td>
                      <span className="pill border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400">
                      {row.currentPeriodEnd ? formatDateTime(row.currentPeriodEnd) : 'No fixed end'}
                      {row.cancelAtPeriodEnd ? ' · cancels' : ''}
                    </td>
                    <td className="font-mono text-[11px] text-slate-500">
                      {row.stripeSubscriptionId ?? `manual #${row.id}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {access.admin ? (
        <section className="card mt-4">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="section-title">Platform staff · manual grant</h2>
            <p className="mt-1 text-xs text-slate-500">
              Comps use the same entitlement recomputation as Stripe. The grant is attached to{' '}
              {user.username}.
            </p>
          </div>
          <form action={grantManualPremiumAction} className="flex flex-wrap items-end gap-3 p-5">
            <input type="hidden" name="guildId" value={guildId} />
            <label className="grid gap-1.5">
              <span className="label">Days</span>
              <input
                name="days"
                type="number"
                min={1}
                max={3650}
                defaultValue={30}
                required
                className="input w-32"
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Grant premium
            </button>
          </form>
        </section>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-600">
        Billing questions? Read the{' '}
        <Link href="/docs#premium" className="text-violet-300">
          premium docs
        </Link>{' '}
        or open a ticket in your server. Cancellation keeps access until the end of the paid period.
      </p>
    </>
  );
}
