import type { AppConfig, PremiumStatus, PremiumTier } from '@veyra/shared';
import {
  bigint,
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

/**
 * A guild is the tenant boundary. Every feature table carries `guild_id` so a
 * single bot process can safely serve any number of Discord servers.
 */
export const guilds = pgTable(
  'guilds',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    icon: text('icon'),
    ownerId: text('owner_id'),
    memberCount: integer('member_count').default(0).notNull(),
    premiumTier: text('premium_tier').$type<PremiumTier>().default('free').notNull(),
    premiumUntil: timestamp('premium_until', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('guilds_premium_idx').on(t.premiumTier, t.premiumUntil)],
);

export const settings = pgTable('settings', {
  guildId: text('guild_id')
    .primaryKey()
    .references(() => guilds.id, { onDelete: 'cascade' }),
  modules: jsonb('modules').$type<AppConfig>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  discordId: text('discord_id').primaryKey(),
  username: text('username').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Cached Discord guild access for the dashboard. `permissions` is the raw
 * permission bitfield as a string (it can exceed a JS safe integer). `owner`
 * is true when Discord reports the user as the guild owner.
 */
export const guildMemberships = pgTable(
  'guild_memberships',
  {
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.discordId, { onDelete: 'cascade' }),
    permissions: text('permissions').default('0').notNull(),
    owner: boolean('owner').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.guildId, t.userId] }),
    index('guild_memberships_user_idx').on(t.userId),
  ],
);

export const members = pgTable(
  'members',
  {
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    xp: integer('xp').default(0).notNull(),
    level: integer('level').default(0).notNull(),
    balance: bigint('balance', { mode: 'number' }).default(0).notNull(),
    lastDaily: timestamp('last_daily', { withTimezone: true }),
    dailyStreak: integer('daily_streak').default(0).notNull(),
    lastWork: timestamp('last_work', { withTimezone: true }),
    lastXpAt: timestamp('last_xp_at', { withTimezone: true }),
    messages: integer('messages').default(0).notNull(),
    voiceSeconds: integer('voice_seconds').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.guildId, t.userId] }),
    index('members_guild_xp_idx').on(t.guildId, t.xp.desc()),
    index('members_guild_balance_idx').on(t.guildId, t.balance.desc()),
  ],
);

export const cases = pgTable(
  'cases',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    targetId: text('target_id').notNull(),
    moderatorId: text('moderator_id').notNull(),
    reason: text('reason').notNull(),
    durationMs: bigint('duration_ms', { mode: 'number' }),
    /** Set for temporary bans; the moderation scheduler lifts them. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('cases_guild_target_idx').on(t.guildId, t.targetId),
    index('cases_guild_created_idx').on(t.guildId, t.createdAt),
    index('cases_guild_expiry_idx').on(t.guildId, t.active, t.expiresAt),
  ],
);

export const warnings = pgTable(
  'warnings',
  {
    caseId: bigint('case_id', { mode: 'number' })
      .primaryKey()
      .references(() => cases.id, { onDelete: 'cascade' }),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    active: boolean('active').default(true).notNull(),
  },
  (t) => [index('warnings_guild_user_idx').on(t.guildId, t.userId, t.active)],
);

export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    channelId: text('channel_id').notNull().unique(),
    userId: text('user_id').notNull(),
    category: text('category').notNull(),
    status: text('status').default('open').notNull(),
    claimedBy: text('claimed_by'),
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    transcript: bytea('transcript'),
    transcriptBytes: integer('transcript_bytes'),
  },
  (t) => [
    index('tickets_guild_status_idx').on(t.guildId, t.status),
    index('tickets_guild_user_idx').on(t.guildId, t.userId),
  ],
);

export const giveaways = pgTable(
  'giveaways',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    channelId: text('channel_id').notNull(),
    messageId: text('message_id').notNull().unique(),
    prize: text('prize').notNull(),
    winnerCount: integer('winner_count').default(1).notNull(),
    requirements: jsonb('requirements').$type<{ level?: number; roleId?: string } | null>(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    ended: boolean('ended').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('giveaways_guild_due_idx').on(t.guildId, t.ended, t.endsAt)],
);

export const giveawayEntries = pgTable(
  'giveaway_entries',
  {
    giveawayId: integer('giveaway_id')
      .notNull()
      .references(() => giveaways.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.giveawayId, t.userId] }),
    index('giveaway_entries_giveaway_idx').on(t.giveawayId),
  ],
);

export const reactionRoles = pgTable(
  'reaction_roles',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    messageId: text('message_id').notNull(),
    emoji: text('emoji').notNull(),
    roleId: text('role_id').notNull(),
    mode: text('mode').default('toggle').notNull(),
    groupKey: text('group_key'),
  },
  (t) => [
    uniqueIndex('reaction_roles_guild_message_emoji_idx').on(t.guildId, t.messageId, t.emoji),
    index('reaction_roles_guild_message_idx').on(t.guildId, t.messageId),
  ],
);

export const levelRewards = pgTable(
  'level_rewards',
  {
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    level: integer('level').notNull(),
    roleId: text('role_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.level] })],
);

export const shopItems = pgTable(
  'shop_items',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    price: bigint('price', { mode: 'number' }).notNull(),
    roleId: text('role_id'),
    stock: integer('stock'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('shop_items_guild_idx').on(t.guildId, t.price)],
);

export const starboardPosts = pgTable(
  'starboard_posts',
  {
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    originalMessageId: text('original_message_id').notNull(),
    starboardMessageId: text('starboard_message_id').notNull(),
    count: integer('count').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.originalMessageId] })],
);

export const statsDaily = pgTable(
  'stats_daily',
  {
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    messages: integer('messages').default(0).notNull(),
    joins: integer('joins').default(0).notNull(),
    leaves: integer('leaves').default(0).notNull(),
    commands: integer('commands').default(0).notNull(),
    voiceSeconds: integer('voice_seconds').default(0).notNull(),
    musicPlays: integer('music_plays').default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.date] })],
);

export const commandUsage = pgTable(
  'command_usage',
  {
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    command: text('command').notNull(),
    count: integer('count').default(0).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.guildId, t.date, t.command] }),
    index('command_usage_guild_date_idx').on(t.guildId, t.date),
  ],
);

export const configAudit = pgTable(
  'config_audit',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull(),
    module: text('module').notNull(),
    before: jsonb('before').$type<unknown>(),
    after: jsonb('after').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('config_audit_guild_created_idx').on(t.guildId, t.createdAt)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const heartbeat = pgTable('heartbeat', {
  id: integer('id').primaryKey().default(1),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
});

export const reminders = pgTable(
  'reminders',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    channelId: text('channel_id').notNull(),
    message: text('message').notNull(),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    sent: boolean('sent').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('reminders_due_idx').on(t.sent, t.remindAt)],
);

/**
 * The billing record behind a guild's premium tier. Manual grants use
 * provider=`manual` and may omit all Stripe fields.
 */
export const premiumSubscriptions = pgTable(
  'premium_subscriptions',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    provider: text('provider').default('stripe').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    tier: text('tier').$type<PremiumTier>().default('premium').notNull(),
    status: text('status').$type<PremiumStatus>().default('inactive').notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('premium_subscriptions_guild_idx').on(t.guildId),
    index('premium_subscriptions_customer_idx').on(t.stripeCustomerId),
  ],
);

/** Stripe webhook idempotency. */
export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export type GuildRow = typeof guilds.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type GuildMembershipRow = typeof guildMemberships.$inferSelect;
export type MemberRow = typeof members.$inferSelect;
export type CaseRow = typeof cases.$inferSelect;
export type TicketRow = typeof tickets.$inferSelect;
export type GiveawayRow = typeof giveaways.$inferSelect;
export type PremiumSubscriptionRow = typeof premiumSubscriptions.$inferSelect;
export type StatsDailyRow = typeof statsDaily.$inferSelect;
