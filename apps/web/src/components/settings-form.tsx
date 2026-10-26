'use client';

import { updateSettingsAction, type SettingsActionState } from '@/lib/settings-actions';
import type { ModuleKey } from '@/lib/modules';
import { useActionState } from 'react';

const initial: SettingsActionState = { status: 'idle', message: '' };

export function SettingsForm({
  module,
  initialJson,
  guildId,
}: {
  module: ModuleKey;
  initialJson: string;
  guildId: string;
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="guildId" value={guildId} />
      <textarea
        name="json"
        defaultValue={initialJson}
        spellCheck={false}
        required
        aria-label={`${module} configuration JSON`}
        className="min-h-[320px] w-full resize-y rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-6 text-slate-200 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/15"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
          {pending ? 'Saving…' : 'Save module'}
        </button>
        <p
          aria-live="polite"
          className={[
            'text-xs',
            state.status === 'error'
              ? 'text-rose-300'
              : state.status === 'ok'
                ? 'text-emerald-300'
                : 'text-slate-500',
          ].join(' ')}
        >
          {state.message || 'Validated against the same schema the bot uses.'}
        </p>
      </div>
    </form>
  );
}
