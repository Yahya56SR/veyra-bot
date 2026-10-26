import { botInviteUrl } from '@/lib/bot';
import { requireUser } from '@/lib/auth';
import { discordGuildIconUrl } from '@/lib/discord';
import { isPlatformAdmin, listDashboardGuilds } from '@/lib/guilds';
import { premiumActive } from '@veyra/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Your servers' };
export const dynamic = 'force-dynamic';

export default async function ServersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await requireUser();
  const guilds = await listDashboardGuilds(user.id);
  const invite = botInviteUrl();
  const query = await searchParams;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-violet-400 to-teal-300 text-lg font-black text-[#0b0e15]">
              V
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight text-white">Veyra</span>
              <span className="block text-xs text-slate-500">Guild dashboard</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl}
              alt=""
              className="size-8 rounded-lg bg-white/5"
              referrerPolicy="no-referrer"
            />
            {isPlatformAdmin(user.id) ? (
              <span className="pill border-violet-400/25 bg-violet-400/10 text-violet-200">
                Platform staff
              </span>
            ) : null}
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="btn btn-ghost h-8">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="mt-14">
          <p className="label">Choose a server</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Where are we working today?
          </h1>
          <p className="muted mt-3 max-w-2xl">
            You can manage servers where you are the owner or have{' '}
            <strong className="text-slate-300">Manage Server</strong>. Veyra only lists servers it
            is already in.
          </p>
        </div>

        {error === 'forbidden' ? (
          <div className="mt-6 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">
            You do not have permission to manage that server.
          </div>
        ) : null}

        {guilds.length === 0 ? (
          <div className="card card-pad mt-8 text-center">
            <h2 className="text-lg font-semibold text-white">No manageable servers yet</h2>
            <p className="muted mx-auto mt-2 max-w-md">
              Invite Veyra to a server you manage, then come back. If the bot is already there, sign
              out and back in to refresh your Discord permissions.
            </p>
            {invite ? (
              <a href={invite} className="btn btn-primary mt-6">
                Add Veyra to Discord
              </a>
            ) : null}
            <a href="/api/auth/login" className="btn btn-ghost mt-6 ml-0 sm:ml-2">
              Refresh access
            </a>
          </div>
        ) : (
          <section className="mt-8 grid gap-3 sm:grid-cols-2">
            {guilds.map((guild) => {
              const icon = discordGuildIconUrl(guild.id, guild.icon);
              const premium = premiumActive(guild.premiumTier, guild.premiumUntil);
              return (
                <Link
                  key={guild.id}
                  href={`/g/${guild.id}`}
                  className="card group flex items-center gap-4 p-5 transition hover:border-violet-400/30 hover:bg-violet-500/[0.04]"
                >
                  {icon ? (
                    <img
                      src={icon}
                      alt=""
                      className="size-12 rounded-xl bg-white/5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-xl bg-white/5 text-sm font-bold text-slate-400">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-100">{guild.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {guild.memberCount.toLocaleString()} members
                    </span>
                  </span>
                  <span
                    className={`pill ${
                      premium
                        ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                        : 'border-white/10 bg-white/[0.03] text-slate-400'
                    }`}
                  >
                    {premium ? 'Premium' : 'Free'}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="size-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              );
            })}
          </section>
        )}

        {invite ? (
          <p className="mt-8 text-center text-sm text-slate-500">
            Missing a server?{' '}
            <a href={invite} className="text-violet-300 hover:text-violet-200">
              Invite Veyra
            </a>{' '}
            with the bot and commands scopes.
          </p>
        ) : null}
      </div>
    </main>
  );
}
