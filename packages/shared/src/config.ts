import { z } from 'zod';

/**
 * Discord snowflake. Kept as a string end-to-end — never convert IDs to numbers.
 */
export const SnowflakeSchema = z
  .string()
  .regex(/^\d{17,20}$/, 'Must be a Discord snowflake (17–20 digits)');

export const NullableSnowflakeSchema = SnowflakeSchema.nullable();

export const AutomodActionSchema = z.enum(['delete', 'warn', 'timeout', 'kick']);
export type AutomodAction = z.infer<typeof AutomodActionSchema>;

const ToggleRuleSchema = z.object({
  enabled: z.boolean(),
  action: AutomodActionSchema,
});

export const AutomodConfigSchema = z.object({
  enabled: z.boolean(),
  invites: ToggleRuleSchema,
  links: ToggleRuleSchema.extend({
    /** Hostnames that are allowed, e.g. `youtube.com`. */
    allowlist: z.array(z.string().min(1).max(253)),
  }),
  spam: ToggleRuleSchema.extend({
    messageThreshold: z.number().int().min(2).max(50),
    windowSeconds: z.number().int().min(1).max(120),
  }),
  mentions: ToggleRuleSchema.extend({
    maxMentions: z.number().int().min(1).max(50),
  }),
  caps: ToggleRuleSchema.extend({
    minLength: z.number().int().min(5).max(200),
    /** Percentage of uppercase letters required to trigger. */
    percent: z.number().int().min(30).max(100),
  }),
  words: ToggleRuleSchema.extend({
    words: z.array(z.string().min(1).max(100)),
  }),
  raid: ToggleRuleSchema.extend({
    joinThreshold: z.number().int().min(2).max(100),
    windowSeconds: z.number().int().min(5).max(600),
  }),
});

export const ModerationConfigSchema = z.object({
  modLogChannelId: NullableSnowflakeSchema,
  dmOnPunish: z.boolean(),
  exemptRoleIds: z.array(SnowflakeSchema),
  exemptChannelIds: z.array(SnowflakeSchema),
  automod: AutomodConfigSchema,
});

export const LOG_EVENTS = [
  'messageDelete',
  'messageEdit',
  'messageBulkDelete',
  'memberJoin',
  'memberLeave',
  'memberUpdate',
  'channelUpdate',
  'roleUpdate',
  'voiceUpdate',
  'modAction',
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];

export const LogEventSchema = z.enum(LOG_EVENTS);

export const LoggingConfigSchema = z.object({
  enabled: z.boolean(),
  channels: z.object({
    messageDelete: NullableSnowflakeSchema,
    messageEdit: NullableSnowflakeSchema,
    messageBulkDelete: NullableSnowflakeSchema,
    memberJoin: NullableSnowflakeSchema,
    memberLeave: NullableSnowflakeSchema,
    memberUpdate: NullableSnowflakeSchema,
    channelUpdate: NullableSnowflakeSchema,
    roleUpdate: NullableSnowflakeSchema,
    voiceUpdate: NullableSnowflakeSchema,
    modAction: NullableSnowflakeSchema,
  }),
  ignoreChannelIds: z.array(SnowflakeSchema),
  ignoreUserIds: z.array(SnowflakeSchema),
});

export const LevelingConfigSchema = z
  .object({
    enabled: z.boolean(),
    /** Base XP awarded per eligible message, before multipliers. */
    xpMin: z.number().int().min(1).max(500),
    xpMax: z.number().int().min(1).max(500),
    cooldownSeconds: z.number().int().min(10).max(3600),
    channelMultipliers: z.array(
      z.object({
        channelId: SnowflakeSchema,
        multiplier: z.number().min(0.1).max(5),
      }),
    ),
    /** The highest matching role multiplier is used. */
    roleMultipliers: z.array(
      z.object({
        roleId: SnowflakeSchema,
        multiplier: z.number().min(0.1).max(5),
      }),
    ),
    ignoredChannelIds: z.array(SnowflakeSchema),
    ignoredRoleIds: z.array(SnowflakeSchema),
    rewards: z.array(
      z.object({
        level: z.number().int().min(1).max(1000),
        roleId: SnowflakeSchema,
      }),
    ),
    /** When false, only the highest eligible reward role is kept. */
    stackRewards: z.boolean(),
    announceChannelId: NullableSnowflakeSchema,
    announceLevelUp: z.boolean(),
  })
  .refine((config) => config.xpMax >= config.xpMin, {
    message: 'xpMax must be greater than or equal to xpMin',
    path: ['xpMax'],
  });

export const ShopItemSchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().min(1).max(64),
  price: z.number().int().min(1),
  roleId: NullableSnowflakeSchema,
  /** null = unlimited */
  stock: z.number().int().min(0).nullable(),
});

export const EconomyConfigSchema = z.object({
  enabled: z.boolean(),
  currency: z.string().min(1).max(32),
  currencySymbol: z.string().min(1).max(8),
  dailyAmount: z.number().int().min(1).max(100_000),
  dailyStreakBonus: z.number().int().min(0).max(10_000),
  workMin: z.number().int().min(1).max(10_000),
  workMax: z.number().int().min(1).max(10_000),
  workCooldownSeconds: z.number().int().min(60).max(86_400),
  shop: z.array(ShopItemSchema),
});

export const WelcomeConfigSchema = z.object({
  joinEnabled: z.boolean(),
  joinChannelId: NullableSnowflakeSchema,
  joinMessage: z.string().min(1).max(2000),
  leaveEnabled: z.boolean(),
  leaveChannelId: NullableSnowflakeSchema,
  leaveMessage: z.string().min(1).max(2000),
  autoRoleIds: z.array(SnowflakeSchema),
});

export const TicketCategorySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens'),
  label: z.string().min(1).max(80),
  emoji: z.string().min(1).max(64).optional(),
  description: z.string().max(200).optional(),
});

export const TicketsConfigSchema = z.object({
  enabled: z.boolean(),
  categoryId: NullableSnowflakeSchema,
  staffRoleId: NullableSnowflakeSchema,
  panelChannelId: NullableSnowflakeSchema,
  panelMessageId: NullableSnowflakeSchema,
  logChannelId: NullableSnowflakeSchema,
  maxOpenPerUser: z.number().int().min(1).max(5),
  categories: z.array(TicketCategorySchema).min(1).max(5),
});

export const MusicConfigSchema = z.object({
  enabled: z.boolean(),
  djRoleId: NullableSnowflakeSchema,
  defaultVolume: z.number().int().min(1).max(100),
  maxQueue: z.number().int().min(1).max(500),
  stay247: z.boolean(),
});

export const CommunityConfigSchema = z.object({
  starboard: z.object({
    enabled: z.boolean(),
    channelId: NullableSnowflakeSchema,
    threshold: z.number().int().min(1).max(50),
    ignoreChannelIds: z.array(SnowflakeSchema),
  }),
  giveaways: z.object({
    defaultWinners: z.number().int().min(1).max(20),
  }),
});

export const StatsConfigSchema = z.object({
  enabled: z.boolean(),
});

export const AppConfigSchema = z.object({
  moderation: ModerationConfigSchema,
  logging: LoggingConfigSchema,
  leveling: LevelingConfigSchema,
  economy: EconomyConfigSchema,
  welcome: WelcomeConfigSchema,
  tickets: TicketsConfigSchema,
  music: MusicConfigSchema,
  community: CommunityConfigSchema,
  stats: StatsConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ModerationConfig = z.infer<typeof ModerationConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type LevelingConfig = z.infer<typeof LevelingConfigSchema>;
export type EconomyConfig = z.infer<typeof EconomyConfigSchema>;
export type WelcomeConfig = z.infer<typeof WelcomeConfigSchema>;
export type TicketsConfig = z.infer<typeof TicketsConfigSchema>;
export type TicketCategory = z.infer<typeof TicketCategorySchema>;
export type MusicConfig = z.infer<typeof MusicConfigSchema>;
export type CommunityConfig = z.infer<typeof CommunityConfigSchema>;

/**
 * The single source of truth for a fresh install. Persisted to `settings.modules`
 * on first boot; unknown/missing keys are merged against this on every read.
 */
export const DEFAULT_CONFIG = {
  moderation: {
    modLogChannelId: null,
    dmOnPunish: true,
    exemptRoleIds: [],
    exemptChannelIds: [],
    automod: {
      enabled: true,
      invites: { enabled: true, action: 'delete' },
      links: { enabled: false, action: 'delete', allowlist: [] },
      spam: { enabled: true, action: 'timeout', messageThreshold: 6, windowSeconds: 8 },
      mentions: { enabled: true, action: 'delete', maxMentions: 6 },
      caps: { enabled: false, action: 'delete', minLength: 12, percent: 70 },
      words: { enabled: false, action: 'delete', words: [] },
      raid: { enabled: false, action: 'kick', joinThreshold: 10, windowSeconds: 30 },
    },
  },
  logging: {
    enabled: true,
    channels: {
      messageDelete: null,
      messageEdit: null,
      messageBulkDelete: null,
      memberJoin: null,
      memberLeave: null,
      memberUpdate: null,
      channelUpdate: null,
      roleUpdate: null,
      voiceUpdate: null,
      modAction: null,
    },
    ignoreChannelIds: [],
    ignoreUserIds: [],
  },
  leveling: {
    enabled: false,
    xpMin: 15,
    xpMax: 25,
    cooldownSeconds: 60,
    channelMultipliers: [],
    roleMultipliers: [],
    ignoredChannelIds: [],
    ignoredRoleIds: [],
    rewards: [],
    stackRewards: false,
    announceChannelId: null,
    announceLevelUp: true,
  },
  economy: {
    enabled: false,
    currency: 'coins',
    currencySymbol: '🪙',
    dailyAmount: 100,
    dailyStreakBonus: 25,
    workMin: 10,
    workMax: 50,
    workCooldownSeconds: 3600,
    shop: [],
  },
  welcome: {
    joinEnabled: false,
    joinChannelId: null,
    joinMessage: 'Welcome to **{server}**, {user}! You are member #{memberCount}.',
    leaveEnabled: false,
    leaveChannelId: null,
    leaveMessage: '**{username}** left the server.',
    autoRoleIds: [],
  },
  tickets: {
    enabled: false,
    categoryId: null,
    staffRoleId: null,
    panelChannelId: null,
    panelMessageId: null,
    logChannelId: null,
    maxOpenPerUser: 1,
    categories: [
      {
        id: 'general',
        label: 'General',
        emoji: '🎫',
        description: 'Questions, help, and anything else',
      },
      {
        id: 'report',
        label: 'Report',
        emoji: '🚨',
        description: 'Report a member or a message',
      },
      {
        id: 'appeal',
        label: 'Appeal',
        emoji: '⚖️',
        description: 'Appeal a moderation action',
      },
    ],
  },
  music: {
    enabled: true,
    djRoleId: null,
    defaultVolume: 60,
    maxQueue: 100,
    stay247: false,
  },
  community: {
    starboard: {
      enabled: false,
      channelId: null,
      threshold: 3,
      ignoreChannelIds: [],
    },
    giveaways: {
      defaultWinners: 1,
    },
  },
  stats: {
    enabled: true,
  },
} satisfies AppConfig;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merges a persisted (possibly older/partial) config over defaults.
 * Arrays replace wholesale. Prototype-polluting keys are ignored.
 */
export function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch === undefined ? base : patch;
  }

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (value === undefined) continue;
    result[key] = key in result ? deepMerge(result[key], value) : value;
  }
  return result;
}

/**
 * Merges raw JSONB over defaults and validates it. Throws on invalid data —
 * callers that must stay online should use `safeParseConfig` instead.
 */
export function parseConfig(raw: unknown): AppConfig {
  const merged = deepMerge(structuredClone(DEFAULT_CONFIG), raw ?? {});
  return AppConfigSchema.parse(merged);
}

export function safeParseConfig(raw: unknown) {
  const merged = deepMerge(structuredClone(DEFAULT_CONFIG), raw ?? {});
  return AppConfigSchema.safeParse(merged);
}

/** Validates one module payload from a dashboard form or command. */
export function parseModule<K extends keyof AppConfig>(key: K, raw: unknown): AppConfig[K] {
  const schema = AppConfigSchema.shape[key];
  return schema.parse(raw) as AppConfig[K];
}
