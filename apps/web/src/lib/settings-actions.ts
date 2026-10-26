'use server';

import { updateModule } from '@veyra/db';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getGuildAccess } from '@/lib/guilds';
import { isModuleKey, MODULE_LABELS } from '@/lib/modules';

export interface SettingsActionState {
  status: 'idle' | 'ok' | 'error';
  message: string;
}

export async function updateSettingsAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      status: 'error',
      message: 'Your session expired. Refresh the page and sign in again.',
    };
  }

  const moduleName = String(formData.get('module') ?? '');
  if (!isModuleKey(moduleName)) {
    return { status: 'error', message: 'Unknown configuration module.' };
  }

  const guildId = String(formData.get('guildId') ?? '');
  if (!/^\d{17,20}$/.test(guildId)) {
    return { status: 'error', message: 'Unknown server.' };
  }
  if (!(await getGuildAccess(guildId, user))) {
    return { status: 'error', message: 'You do not have permission to edit this server.' };
  }

  const json = String(formData.get('json') ?? '');
  if (json.length > 100_000) {
    return { status: 'error', message: 'That configuration is too large (100 KB limit).' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { status: 'error', message: 'The editor does not contain valid JSON.' };
  }

  try {
    await updateModule(getDb(), guildId, user.id, moduleName, parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const path = issue?.path.length ? `${issue.path.join('.')}: ` : '';
      return {
        status: 'error',
        message: `${path}${issue?.message ?? 'That configuration is invalid.'}`,
      };
    }

    console.error(
      'Dashboard configuration update failed:',
      error instanceof Error ? error.message : error,
    );
    return {
      status: 'error',
      message: 'The configuration could not be saved. Check the dashboard logs.',
    };
  }

  revalidatePath(`/g/${guildId}/settings`);
  revalidatePath(`/g/${guildId}/audit`);
  revalidatePath(`/g/${guildId}`);

  return {
    status: 'ok',
    message: `${MODULE_LABELS[moduleName]} saved. The bot applies it within 15 seconds.`,
  };
}
