import { PageHeader } from '@/components/page-header';
import { getDb } from '@/lib/db';
import { requireGuildAccess } from '@/lib/guilds';
import { savePersonalizerAction } from '@/lib/personalizer-actions';
import { readDashboardSettings } from '@/lib/settings';
import { premiumActive } from '@veyra/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Personalizer' };
export const dynamic = 'force-dynamic';

export default async function PersonalizerPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { guildId } = await params;
  const { access } = await requireGuildAccess(guildId);
  const query = await searchParams;
  const guild = access.guild;
  const premium = premiumActive(guild.premiumTier, guild.premiumUntil);
  const { config } = await readDashboardSettings(getDb(), guildId);
  const settings = config.personalizer;

  return (
    <>
      <PageHeader
        eyebrow="Premium branding"
        title="Personalizer"
        description="Give Veyra a different voice in this server. Branding is applied to embeds, level-up announcements, and the ticket panel; Discord does not allow a per-server username or avatar."
        actions={
          <Link href={`/g/${guildId}/premium`} className="btn btn-ghost">
            {premium ? 'Manage premium' : 'Unlock premium'}
          </Link>
        }
      />

      {query.saved ? (
        <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-100/80">
          Personalizer saved. The bot applies it within 15 seconds.
        </div>
      ) : null}

      {query.error ? (
        <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-100/80">
          {query.error === 'save-failed'
            ? 'The personalizer could not be saved. Check the dashboard logs.'
            : decodeURIComponent(query.error)}
        </div>
      ) : null}

      {!premium ? (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100/80">
          <p className="font-medium text-amber-100">Premium is required</p>
          <p className="mt-1">
            You can preview the controls below, but saving needs an active Premium subscription for
            this server.{' '}
            <Link href={`/g/${guildId}/premium`} className="underline decoration-amber-300/40">
              Compare plans
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <form action={savePersonalizerAction} className="card card-pad space-y-5">
          <input type="hidden" name="guildId" value={guildId} />

          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <span>
              <span className="block text-sm font-medium text-slate-200">Enable personalizer</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Applies the nickname and branding to new bot messages.
              </span>
            </span>
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings.enabled}
              disabled={!premium}
              className="size-5 rounded border-white/20 bg-black/30 accent-violet-500"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="label">Server nickname</span>
              <input
                name="nickname"
                defaultValue={settings.nickname ?? ''}
                maxLength={32}
                placeholder="Veyra"
                disabled={!premium}
                className="input"
              />
              <span className="text-[11px] text-slate-600">
                Blank restores the default nickname.
              </span>
            </label>

            <label className="grid gap-1.5">
              <span className="label">Embed colour</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="embedColor"
                  defaultValue={settings.embedColor}
                  disabled={!premium}
                  className="h-9 w-12 rounded-lg border border-white/10 bg-black/30 p-1"
                />
                <input
                  defaultValue={settings.embedColor}
                  disabled={!premium}
                  readOnly
                  className="input flex-1 font-mono text-xs"
                />
              </div>
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="label">Footer text</span>
            <input
              name="footerText"
              defaultValue={settings.footerText ?? ''}
              maxLength={2048}
              placeholder="Powered by Veyra"
              disabled={!premium}
              className="input"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="label">Footer icon URL</span>
              <input
                name="footerIconUrl"
                defaultValue={settings.footerIconUrl ?? ''}
                placeholder="https://…"
                disabled={!premium}
                className="input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="label">Thumbnail URL</span>
              <input
                name="thumbnailUrl"
                defaultValue={settings.thumbnailUrl ?? ''}
                placeholder="https://…"
                disabled={!premium}
                className="input"
              />
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="label">Level-up message</span>
            <textarea
              name="levelUpMessage"
              defaultValue={settings.levelUpMessage ?? ''}
              rows={3}
              maxLength={2000}
              placeholder="GG {user}, you reached level {level}."
              disabled={!premium}
              className="input h-auto py-2.5"
            />
            <span className="text-[11px] text-slate-600">
              Placeholders: {'{user}'}, {'{level}'}, {'{server}'}.
            </span>
          </label>

          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="label">Ticket panel title</span>
              <input
                name="ticketPanelTitle"
                defaultValue={settings.ticketPanelTitle ?? ''}
                maxLength={256}
                placeholder="Need help?"
                disabled={!premium}
                className="input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="label">Ticket panel description</span>
              <textarea
                name="ticketPanelDescription"
                defaultValue={settings.ticketPanelDescription ?? ''}
                rows={3}
                maxLength={4000}
                placeholder="Pick a category below and our staff will be with you shortly."
                disabled={!premium}
                className="input h-auto py-2.5"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <button
              type="submit"
              disabled={!premium}
              className="btn btn-primary disabled:opacity-50"
            >
              Save personalizer
            </button>
            <p className="text-xs text-slate-500">
              Validated with the shared schema. The bot polls every 15 seconds.
            </p>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="label">Preview</p>
            <div
              className="mt-4 rounded-xl border-l-4 bg-black/30 p-4"
              style={{ borderColor: settings.embedColor }}
            >
              <p className="text-sm font-semibold text-white">
                {settings.ticketPanelTitle || 'Need help?'}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {settings.ticketPanelDescription ||
                  'Pick a category below and our staff will be with you shortly.'}
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                {settings.thumbnailUrl ? (
                  <img
                    src={settings.thumbnailUrl}
                    alt=""
                    className="size-6 rounded bg-white/5"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <span className="text-[11px] text-slate-500">{settings.footerText || 'Veyra'}</span>
              </div>
            </div>
            <div
              className="mt-4 rounded-xl border-l-4 bg-black/30 p-4"
              style={{ borderColor: settings.embedColor }}
            >
              <p className="text-sm text-slate-200">
                {settings.levelUpMessage || 'GG {user}, you reached level {level}.'}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                {settings.footerText || 'Veyra'} · level-up announcement
              </p>
            </div>
          </div>

          <div className="card card-pad">
            <p className="label">Discord limits</p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
              <li>Per-server nickname: supported.</li>
              <li>Per-server embed colour, footer, and thumbnail: supported.</li>
              <li>Per-server username and avatar: not supported by Discord.</li>
              <li>Per-server global presence text: not supported by Discord.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
