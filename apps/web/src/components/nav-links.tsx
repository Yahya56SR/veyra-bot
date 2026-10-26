'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const links: NavItem[] = [
  {
    href: '/',
    label: 'Overview',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    href: '/activity',
    label: 'Activity',
    icon: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-6" />
      </>
    ),
  },
  {
    href: '/moderation',
    label: 'Moderation',
    icon: (
      <>
        <path d="M12 3 5 6v5c0 4.2 2.9 7.8 7 9 4.1-1.2 7-4.8 7-9V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    href: '/members',
    label: 'Members',
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8" />
        <path d="M17 14.5a5.5 5.5 0 0 1 3.5 5" />
      </>
    ),
  },
  {
    href: '/tickets',
    label: 'Tickets',
    icon: (
      <>
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z" />
        <path d="M12 8v1M12 12v1M12 16v1" />
      </>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
  },
  {
    href: '/audit',
    label: 'Audit log',
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6V3Z" />
        <path d="M14 3v5h5" />
        <path d="M9 12h6M9 16h6" />
      </>
    ),
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {links.map((link) => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition',
              active
                ? 'border-violet-400/25 bg-violet-500/10 text-white'
                : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={active ? 'size-4 text-violet-300' : 'size-4 text-slate-500'}
              aria-hidden="true"
            >
              {link.icon}
            </svg>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
