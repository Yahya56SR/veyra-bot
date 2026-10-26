export const BRAND = {
  name: 'Veyra',
  footer: 'Veyra',
  color: 0x8b5cf6,
  success: 0x22c55e,
  danger: 0xef4444,
  warning: 0xf59e0b,
  info: 0x3b82f6,
  muted: 0x64748b,
} as const;

export const COMMAND_CATEGORIES = [
  'core',
  'moderation',
  'logging',
  'utility',
  'tickets',
  'leveling',
  'economy',
  'community',
  'music',
  'stats',
] as const;

export type CommandCategory = (typeof COMMAND_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  core: 'Core',
  moderation: 'Moderation',
  logging: 'Logging',
  utility: 'Utility',
  tickets: 'Tickets',
  leveling: 'Leveling',
  economy: 'Economy',
  community: 'Community',
  music: 'Music',
  stats: 'Stats',
};
