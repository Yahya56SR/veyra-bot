import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { botInviteUrl } from '@/lib/bot';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Docs & help',
  description: 'Setup, configuration, premium, music, and troubleshooting for Veyra.',
};

export const dynamic = 'force-dynamic';

const FAQ = [
  [
    'Does Veyra need Administrator?',
    'No. The invite requests the specific permissions the modules use. If a feature fails, check that the bot role sits above the roles it needs to manage and that it can view the channel.',
  ],
  [
    'Why do dashboard changes take a few seconds?',
    'The bot polls the settings table every 15 seconds. Saving in the dashboard or /setup writes the same validated JSONB row, so the running bot picks it up without a restart.',
  ],
  [
    'Where is my data stored?',
    'Postgres stores configuration, cases, tickets, transcripts, member XP, economy rows, giveaways, reminders, and daily aggregates. Sessions are hashed. Card details never reach Veyra.',
  ],
  [
    'Can I use different branding per server?',
    'Yes, with Premium. The personalizer sets the bot nickname in that server, embed colour, footer, thumbnail, and custom level-up and ticket-panel copy. Discord does not allow a per-server username or avatar.',
  ],
  [
    'Why does music sometimes fail?',
    'Music depends on an external Lavalink node and the source. SoundCloud and Spotify links are preferred; YouTube is best-effort. The free host is small, so large public music traffic should move to a dedicated player.',
  ],
  [
    'How do I cancel Premium?',
    'Open the server dashboard, go to Premium, and use Manage billing. Stripe handles cancellation. Access stays active until the end of the paid period.',
  ],
];

export default function DocsPage() {
  const invite = botInviteUrl();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="label">Docs & help</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Get Veyra running.
          </h1>
          <p className="muted mt-4">
            The short version: invite the bot, run <code className="text-slate-300">/setup</code>,
            then sign in to the dashboard for the detailed controls.
          </p>
        </div>

        <nav className="mt-8 flex flex-wrap gap-2 text-sm">
          {[
            ['#setup', 'Setup'],
            ['#modules', 'Modules'],
            ['#premium', 'Premium'],
            ['#troubleshooting', 'Troubleshooting'],
            ['#faq', 'FAQ'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-slate-300 transition hover:border-violet-400/30 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <section id="setup" className="mt-12 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Setup</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              [
                '1. Invite the bot',
                'Use the invite button. The bot needs Manage Roles, Manage Channels, Moderate Members, and the usual message and voice permissions.',
              ],
              [
                '2. Run /setup',
                'Open the interactive setup panel. Configure logging channels, automod actions, welcome messages, level rewards, economy settings, tickets, and music.',
              ],
              [
                '3. Open the dashboard',
                'Sign in with Discord. Veyra lists servers where you are the owner or have Manage Server. Choose one to see its activity and settings.',
              ],
            ].map(([title, body]) => (
              <article key={title} className="card card-pad">
                <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-slate-400">
            After setup, place the Veyra role above any role it must assign or remove. Ticket
            panels, reaction-role panels, and starboard channels must be visible to the bot.
          </div>
          {invite ? (
            <a href={invite} className="btn btn-primary mt-5">
              Add Veyra to Discord
            </a>
          ) : null}
        </section>

        <section id="modules" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Modules</h2>
          <p className="muted mt-2">
            Each module can be enabled or disabled independently. Disabled modules hide their
            commands and skip their event work.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">What it covers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[
                  ['Moderation', 'Cases, warnings, timeouts, bans, softbans, purge, slowmode'],
                  ['Automod', 'Invites, links, spam, mentions, caps, words, raid protection'],
                  ['Logging', 'Message, member, role, channel, voice, and moderation events'],
                  ['Welcome', 'Join messages, auto roles, leave messages'],
                  ['Tickets', 'Panels, private channels, claims, closes, transcripts'],
                  ['Leveling', 'XP, levels, role rewards, announcements, leaderboard'],
                  ['Economy', 'Daily, work, pay, gamble, shop, inventory, admin tools'],
                  ['Community', 'Giveaways, reaction roles, starboard'],
                  ['Utility', 'Profiles, server info, embeds, polls, reminders'],
                  ['Music', 'Lavalink playback and queue controls'],
                  ['Stats', 'Daily aggregates, command usage, dashboard charts'],
                  ['Personalizer', 'Premium branding and template copy'],
                ].map(([name, detail]) => (
                  <tr key={name} className="bg-[#0b0e15]/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">
                      {name}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="premium" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Premium & billing</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="card card-pad">
              <h3 className="text-sm font-semibold text-slate-100">Buying premium</h3>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Sign in, choose the server, open Premium, and start Checkout. The subscription
                metadata carries the server ID, so the webhook updates the right entitlement even if
                you buy from a different device.
              </p>
            </div>
            <div className="card card-pad">
              <h3 className="text-sm font-semibold text-slate-100">Managing premium</h3>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Use Manage billing to open the Stripe portal. Cancellation keeps access until the
                end of the period. Manual grants are reserved for platform staff and follow the same
                entitlement path as Stripe.
              </p>
            </div>
          </div>
        </section>

        <section id="troubleshooting" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Troubleshooting</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              [
                'Commands do not appear',
                'Global commands can take up to an hour to propagate. During development, set DEV_GUILD_ID for instant registration in one server.',
              ],
              [
                'The bot cannot assign roles',
                'Move the Veyra role above the target role and confirm Manage Roles. Reaction-role panels also require the bot to see the channel.',
              ],
              [
                'Tickets do not open',
                'Check the ticket category, support role, and that the bot can manage channels. The panel must be posted after tickets are enabled.',
              ],
              [
                'Dashboard says forbidden',
                'You need Manage Server in that Discord server. Sign out and back in after changing roles so the guild cache refreshes.',
              ],
            ].map(([title, body]) => (
              <article key={title} className="card card-pad">
                <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-white">FAQ</h2>
          <div className="mt-4 space-y-2">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group card">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-slate-200">
                  {question}
                  <span className="text-slate-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="border-t border-white/[0.06] px-5 py-4 text-sm leading-6 text-slate-400">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-12 text-xs text-slate-600">
          Still stuck? Open a ticket in your server or read the{' '}
          <Link href="/terms" className="text-violet-300">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-violet-300">
            privacy policy
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
