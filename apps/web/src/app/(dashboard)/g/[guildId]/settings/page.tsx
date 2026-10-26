import { PageHeader } from '@/components/page-header';
import { SettingsForm } from '@/components/settings-form';
import { getDb } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { requireGuildAccess } from '@/lib/guilds';
import { MODULE_DESCRIPTIONS, MODULE_KEYS, MODULE_LABELS, moduleEnabled } from '@/lib/modules';
import { readDashboardSettings } from '@/lib/settings';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const { config, updatedAt } = await readDashboardSettings(getDb(), guildId);
  const updated = updatedAt ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="The dashboard writes the same JSONB modules the bot reads. Every save is validated with the shared Zod schema and recorded in the audit log."
        actions={
          <Link href={`/g/${guildId}/audit`} className="btn btn-ghost">
            Open audit log
          </Link>
        }
      />

      <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100/80">
        <p className="font-medium text-amber-100">Advanced editor</p>
        <p className="mt-1">
          Changes are applied by the running bot within 15 seconds. The schema requires every key,
          validates types and ranges, and discards unknown keys. Music still requires{' '}
          <code className="rounded bg-black/20 px-1 py-0.5 text-amber-100">MUSIC_ENABLED=true</code>{' '}
          and valid Lavalink credentials in the bot environment.
        </p>
      </div>

      <div className="space-y-3">
        {MODULE_KEYS.map((module, index) => {
          const value = config[module];
          const enabled = moduleEnabled(value);
          const initialJson = JSON.stringify(value, null, 2);

          return (
            <details key={module} className="card group" open={index === 0}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-sm font-semibold text-slate-100">
                      {MODULE_LABELS[module]}
                    </h2>
                    {enabled === null ? (
                      <span className="pill border-white/10 bg-white/[0.03] text-slate-400">
                        settings
                      </span>
                    ) : (
                      <span
                        className={`pill ${
                          enabled
                            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                            : 'border-slate-400/20 bg-slate-400/10 text-slate-400'
                        }`}
                      >
                        {enabled ? 'enabled' : 'disabled'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                    {MODULE_DESCRIPTIONS[module]}
                  </p>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 text-slate-500 transition group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>

              <div className="border-t border-white/[0.08] p-4 sm:p-5">
                <SettingsForm module={module} initialJson={initialJson} guildId={guildId} />
              </div>
            </details>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Last settings write:{' '}
        {updated
          ? formatDateTime(updated)
          : 'not written yet — the bot creates defaults on first boot'}
      </p>
    </>
  );
}
