import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/commands', label: 'Commands' },
      { href: '/premium', label: 'Premium' },
      { href: '/status', label: 'Status' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/docs', label: 'Documentation' },
      { href: '/docs#setup', label: 'Setup guide' },
      { href: '/docs#faq', label: 'FAQ' },
      { href: '/login', label: 'Dashboard' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of service' },
      { href: '/privacy', label: 'Privacy policy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-violet-400 to-teal-300 text-sm font-black text-[#0b0e15]">
              V
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-white">Veyra</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
            Moderation, logging, tickets, leveling, economy, community, music, and stats for Discord
            servers that care about the details.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="label">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-xs text-slate-600 sm:px-8">
          <span>© {new Date().getFullYear()} Veyra. Not affiliated with Discord Inc.</span>
          <span>Built for Discord · billed securely by Stripe</span>
        </div>
      </div>
    </footer>
  );
}
