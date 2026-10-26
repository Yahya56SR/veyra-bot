import type { AppConfig } from '@veyra/shared';

export type ModuleKey = keyof AppConfig;

export const MODULE_KEYS: readonly ModuleKey[] = [
  'moderation',
  'logging',
  'leveling',
  'economy',
  'welcome',
  'tickets',
  'music',
  'community',
  'stats',
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  moderation: 'Moderation & automod',
  logging: 'Logging',
  leveling: 'Leveling',
  economy: 'Economy',
  welcome: 'Welcome & autorole',
  tickets: 'Tickets',
  music: 'Music',
  community: 'Community',
  stats: 'Stats',
  personalizer: 'Personalizer',
};

export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  moderation: 'Log channel, DM policy, exemptions, and every automod rule.',
  logging: 'Per-event channel routing for messages, members, roles, and voice.',
  leveling: 'XP range, cooldown, ignored channels and roles, announcements, and rewards.',
  economy: 'Currency, daily/work payouts, cooldowns, and the shop catalog.',
  welcome: 'Join and leave templates plus automatic roles.',
  tickets: 'Categories, staff role, panel, transcript log, and open limits.',
  music: 'DJ role, default volume, queue limit, and 24/7 mode.',
  community: 'Starboard threshold and channel plus giveaway defaults.',
  stats: 'Enable or disable usage tracking.',
  personalizer: 'Premium nickname, embed colour, footer, and template copy.',
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function moduleEnabled(value: unknown): boolean | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!('enabled' in value)) return null;
  return Boolean((value as { enabled?: unknown }).enabled);
}
