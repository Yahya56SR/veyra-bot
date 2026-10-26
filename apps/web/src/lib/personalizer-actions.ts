'use server';

import { isGuildPremium, updateModule } from '@veyra/db';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { readDashboardSettings } from '@/lib/settings';
import { getDb } from '@/lib/db';
import { getGuildAccess } from '@/lib/guilds';

function nullable(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

export async function savePersonalizerAction(formData: FormData): Promise<void> {
  const guildId = String(formData.get('guildId') ?? '');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!/^\d{17,20}$/.test(guildId)) redirect('/servers');

  const access = await getGuildAccess(guildId, user);
  if (!access) redirect('/servers?error=forbidden');

  const db = getDb();
  if (!(await isGuildPremium(db, guildId))) {
    redirect(`/g/${guildId}/premium`);
  }

  const current = await readDashboardSettings(db, guildId);
  const parsed = {
    ...current.config.personalizer,
    enabled: formData.get('enabled') === 'on',
    nickname: nullable(formData.get('nickname')),
    embedColor: String(formData.get('embedColor') ?? '#8b5cf6').trim(),
    footerText: nullable(formData.get('footerText')),
    footerIconUrl: nullable(formData.get('footerIconUrl')),
    thumbnailUrl: nullable(formData.get('thumbnailUrl')),
    levelUpMessage: nullable(formData.get('levelUpMessage')),
    ticketPanelTitle: nullable(formData.get('ticketPanelTitle')),
    ticketPanelDescription: nullable(formData.get('ticketPanelDescription')),
  };

  try {
    await updateModule(db, guildId, user.id, 'personalizer', parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const text = issue?.path.length
        ? `${issue.path.join('.')}: ${issue.message}`
        : (issue?.message ?? 'Invalid personalizer settings.');
      redirect(`/g/${guildId}/personalizer?error=${encodeURIComponent(text.slice(0, 200))}`);
    }
    redirect(`/g/${guildId}/personalizer?error=save-failed`);
  }

  redirect(`/g/${guildId}/personalizer?saved=1`);
}
