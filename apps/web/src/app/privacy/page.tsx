import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What Veyra stores, why, and how to remove it.',
};

export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="label">Legal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Privacy policy</h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: 26 October 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white">1. What we collect</h2>
            <p className="mt-2">
              Veyra stores the IDs Discord gives us: server, channel, role, message, and user IDs.
              Depending on the modules a server enables, we also store moderation case reasons,
              ticket transcripts, XP and economy balances, giveaway entries, reminders,
              configuration, and daily aggregate counters. We do not copy member usernames or
              message history into analytics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Dashboard accounts</h2>
            <p className="mt-2">
              Signing in uses Discord OAuth with the <code>identify</code> and <code>guilds</code>{' '}
              scopes. We store your Discord user ID, display name, and avatar hash, plus a list of
              which bot servers you can manage. Session tokens are random, stored only as hashes,
              and expire after seven days. We do not receive your Discord password.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Billing</h2>
            <p className="mt-2">
              Stripe processes payments. Veyra stores Stripe customer, subscription, and price IDs
              and the resulting server entitlement. Veyra never sees or stores card numbers, CVCs,
              or bank details. Stripe’s privacy policy governs payment data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Why we keep it</h2>
            <p className="mt-2">
              Data is used to run the features a server enabled, show the dashboard, prevent abuse,
              debug failures, and account for premium subscriptions. We do not sell personal data or
              use message content for advertising. Aggregate counters contain numbers, not message
              bodies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Retention and deletion</h2>
            <p className="mt-2">
              Analytics rows are pruned on a rolling window. Tickets and moderation cases remain
              until deleted by server staff, the bot leaves, or a retention policy applies. Removing
              the bot stops new collection. To request deletion of your dashboard account or a
              server’s data, contact the operator through the support server.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Security</h2>
            <p className="mt-2">
              Sessions are hashed, dashboard routes check Discord permissions, transcripts are
              served with a restrictive content policy, and the dashboard never receives the bot
              token. Database and hosting providers process data on our behalf. No system is
              perfectly secure; report suspected issues privately rather than publicly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Children</h2>
            <p className="mt-2">
              Veyra is not directed at anyone below Discord’s minimum age. If you believe a child
              has provided data, contact us so it can be removed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Changes</h2>
            <p className="mt-2">
              This policy may change as the service evolves. Material changes will be announced in
              the support server or on this page. Continued use after a change means you accept the
              updated policy.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
