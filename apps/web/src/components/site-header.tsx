import { getSessionUser } from '@/lib/auth';
import { botInviteUrl } from '@/lib/bot';
import Link from 'next/link';

const LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/commands', label: 'Commands' },
  { href: '/premium', label: 'Premium' },
  { href: '/status', label: 'Status' },
  { href: '/docs', label: 'Docs' },
];

export async function SiteHeader() {
  // Public pages should still render if the database is briefly unavailable.
  const user = await getSessionUser().catch(() => null);
  const invite = botInviteUrl();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080a0f]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-violet-400 to-teal-300 text-sm font-black text-[#0b0e15]">
            V
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">Veyra</span>
        </Link>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto text-sm sm:order-none sm:ml-6 sm:w-auto">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link href="/servers" className="btn btn-primary h-9">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost h-9">
              Sign in
            </Link>
          )}
          {invite ? (
            <a href={invite} className="btn btn-primary h-9">
              Add to Discord
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
