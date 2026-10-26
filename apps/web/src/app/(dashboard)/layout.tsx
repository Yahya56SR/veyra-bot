/* eslint-disable @next/next/no-img-element */
import { NavLinks } from '@/components/nav-links';
import { requireUser } from '@/lib/auth';
import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Overview', template: '%s · Nervana' },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-[#0a0d14]/80 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-violet-400 to-teal-300 text-sm font-black text-[#0b0e15]">
              N
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-tight text-white">
                Nervana
              </span>
              <span className="block text-[11px] text-slate-500">Control room</span>
            </span>
          </Link>
          <span className="pill border-violet-400/25 bg-violet-400/10 text-violet-200">
            <span className="size-1.5 rounded-full bg-violet-400" />
            Private
          </span>
        </div>

        <div className="px-3 pb-3 lg:flex-1 lg:overflow-y-auto">
          <NavLinks />
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
            <img
              src={user.avatarUrl}
              alt=""
              className="size-9 rounded-lg bg-white/5"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{user.username}</p>
              <p className="truncate text-[11px] text-slate-500">{user.id}</p>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                title="Sign out"
                className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-rose-300"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
                </svg>
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-10">{children}</main>
        <footer className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 pb-8 text-[11px] text-slate-600 sm:px-6 lg:px-10">
          <span>Nervana · single-guild dashboard</span>
          <span>identify scope · hashed sessions · no bot token</span>
        </footer>
      </div>
    </div>
  );
}
