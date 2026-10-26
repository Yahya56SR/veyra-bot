import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms that apply when you invite or use Veyra.',
};

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="label">Legal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Terms of service</h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: 26 October 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Using Veyra</h2>
            <p className="mt-2">
              Veyra is a Discord bot and web dashboard. By inviting the bot or signing in, you agree
              to these terms and to Discord’s own terms and policies. You must have permission to
              add bots and change settings in any server where you use Veyra.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Acceptable use</h2>
            <p className="mt-2">
              Do not use Veyra to harass people, evade Discord enforcement, scrape data you are not
              entitled to, attack the service, or break the law. Do not attempt to access another
              server’s dashboard, tickets, transcripts, or settings. We may suspend access to
              protect the service or other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Premium and billing</h2>
            <p className="mt-2">
              Premium is sold per server as a recurring subscription through Stripe. Prices are
              shown before checkout. Stripe handles payment methods, invoices, taxes, and
              cancellation. Access continues until the end of the paid period after cancellation,
              except where a refund or chargeback requires earlier removal. We may change prices
              with reasonable notice; changes do not apply retroactively to an active period already
              paid for.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Availability and changes</h2>
            <p className="mt-2">
              Veyra is provided on an “as is” and “as available” basis. Features may change, be
              deprecated, or be interrupted for maintenance, host limits, upstream outages, or abuse
              prevention. Music depends on third-party sources and an external Lavalink node, so it
              is not guaranteed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Data and termination</h2>
            <p className="mt-2">
              The bot stores the data described in the privacy policy. You can remove the bot at any
              time; server-scoped data may be deleted or retained for a limited period for backups,
              abuse prevention, or legal obligations. We may terminate access for violations of
              these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Veyra is not liable for indirect, incidental,
              or consequential damages, lost data, lost revenue, or moderation decisions made by
              server staff using the bot. Nothing here limits rights that cannot be limited by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Contact</h2>
            <p className="mt-2">
              For legal or billing questions, open a ticket in the Veyra support server or contact
              the operator listed there. Discord Inc. is not a party to these terms and does not
              provide support for Veyra.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
