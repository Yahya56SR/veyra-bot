import { getSessionUser } from '@/lib/auth';
import { dashboardSetupIssues } from '@/lib/env';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  access: 'Discord sign-in was cancelled or denied.',
  forbidden: 'That Discord account is not on the dashboard allowlist.',
  state: 'The sign-in request expired or did not match. Try again.',
  oauth: 'Discord sign-in failed. Try again in a moment.',
  config: 'The dashboard environment is incomplete. Check the setup issues below.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (user) redirect('/');

  const params = await searchParams;
  const code = Array.isArray(params.error) ? params.error[0] : params.error;
  const message = code ? ERRORS[code] : null;
  const issues = dashboardSetupIssues();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-5 sm:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0e15]/80 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <section className="border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-violet-400 to-teal-300 text-lg font-black text-[#0b0e15]">
              N
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">Nervana</p>
              <p className="text-xs text-slate-500">Single-guild control room</p>
            </div>
          </div>

          <h1 className="mt-12 max-w-md text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            The quiet side of running a loud server.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-400">
            Live activity, moderation cases, tickets, economy standings, and the exact configuration
            the bot is using. One server, one operator allowlist, no guild picker.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
            {[
              ['Activity', 'Messages, voice, commands, music'],
              ['Moderation', 'Cases, warnings, and expiry'],
              ['Tickets', 'Open queues and transcripts'],
              ['Settings', 'Schema-validated config edits'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="font-medium text-slate-200">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-center p-8 sm:p-10">
          <p className="label">Operator access</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Sign in with Discord</h2>
          <p className="muted mt-3">
            Nervana requests the <code className="text-slate-200">identify</code> scope only. Your
            Discord account must be listed in{' '}
            <code className="text-slate-200">DASHBOARD_ADMIN_IDS</code>.
          </p>

          {message ? (
            <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">
              {message}
            </div>
          ) : null}

          {issues.length > 0 ? (
            <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
              <p className="font-medium">Dashboard environment is incomplete</p>
              <p className="mt-1 text-amber-100/70">
                Missing, empty, or invalid: {issues.join(', ')}. The login redirect may fail until
                these are fixed.
              </p>
            </div>
          ) : null}

          <a href="/api/auth/login" className="btn btn-primary mt-6 h-11 w-full text-[15px]">
            Continue with Discord
          </a>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Sessions are stored as opaque, hashed tokens in Postgres and expire after seven days.
            Logging out deletes the session immediately.
          </p>

          <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-500">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            No bot token or guild permissions are exposed to this dashboard.
          </div>
        </section>
      </div>
    </main>
  );
}
