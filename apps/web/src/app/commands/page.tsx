import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { CATALOG_GROUPS, COMMAND_CATALOG } from '@/lib/command-catalog';
import { CATEGORY_LABELS } from '@veyra/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Commands',
  description: 'The full Veyra slash-command catalog across every module.',
};

export const dynamic = 'force-dynamic';

export default function CommandsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="label">Command catalog</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Everything Veyra can do.
        </h1>
        <p className="muted mt-4 max-w-2xl">
          Slash commands are registered globally. Some commands are hidden or blocked when their
          module is disabled, and premium commands are labelled below.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {CATALOG_GROUPS.map((category) => (
            <a
              key={category}
              href={`#${category}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-violet-400/30 hover:text-white"
            >
              {CATEGORY_LABELS[category]}
            </a>
          ))}
        </div>

        <div className="mt-12 space-y-10">
          {CATALOG_GROUPS.map((category) => {
            const commands = COMMAND_CATALOG.filter((command) => command.category === category);
            if (commands.length === 0) return null;

            return (
              <section key={category} id={category} className="scroll-mt-24">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    {CATEGORY_LABELS[category]}
                  </h2>
                  <span className="pill border-white/10 bg-white/[0.03] text-slate-500">
                    {commands.length}
                  </span>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Command</th>
                        <th className="px-4 py-3 font-semibold">What it does</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {commands.map((command) => (
                        <tr key={command.name} className="bg-[#0b0e15]/40">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-violet-200">
                            {command.name}
                            {command.premium ? (
                              <span className="ml-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-amber-200">
                                premium
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{command.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-10 text-xs leading-5 text-slate-600">
          The bot itself is the source of truth: use <code className="text-slate-400">/help</code>{' '}
          in your server for the exact command list after disabled modules and permissions are
          applied.
        </p>
        <Link href="/docs" className="btn btn-ghost mt-6">
          Read the setup guide
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
