import type { AppConfig } from '@nervana/shared';
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
 * Single-tenant design: there is exactly one `settings` row and no `guild_id`
 * columns. See README for the multi-guild migration path.
 */
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  modules: jsonb('modules').$type<AppConfig>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  discordId: text('discord_id').primaryKey(),
  username: text('username').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const members = pgTable(
  'members',
  {
    userId: text('user_id').primaryKey(),
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
    index('members_xp_idx').on(t.xp.desc()),
    index('members_balance_idx').on(t.balance.desc()),
  ],
);

export const cases = pgTable(
  'cases',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
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
    index('cases_target_idx').on(t.targetId),
    index('cases_created_idx').on(t.createdAt),
    index('cases_expiry_idx').on(t.active, t.expiresAt),
  ],
);

export const warnings = pgTable('warnings', {
  caseId: bigint('case_id', { mode: 'number' })
    .primaryKey()
    .references(() => cases.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  active: boolean('active').default(true).notNull(),
});

export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
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
  (t) => [index('tickets_status_idx').on(t.status), index('tickets_user_idx').on(t.userId)],
);

export const giveaways = pgTable('giveaways', {
  id: serial('id').primaryKey(),
  channelId: text('channel_id').notNull(),
  messageId: text('message_id').notNull().unique(),
  prize: text('prize').notNull(),
  winnerCount: integer('winner_count').default(1).notNull(),
  requirements: jsonb('requirements').$type<{ level?: number; roleId?: string } | null>(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  ended: boolean('ended').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
    messageId: text('message_id').notNull(),
    emoji: text('emoji').notNull(),
    roleId: text('role_id').notNull(),
    mode: text('mode').default('toggle').notNull(),
    groupKey: text('group_key'),
  },
  (t) => [
    uniqueIndex('reaction_roles_message_emoji_idx').on(t.messageId, t.emoji),
    index('reaction_roles_message_idx').on(t.messageId),
  ],
);

export const levelRewards = pgTable('level_rewards', {
  level: integer('level').primaryKey(),
  roleId: text('role_id').notNull(),
});

export const shopItems = pgTable('shop_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: bigint('price', { mode: 'number' }).notNull(),
  roleId: text('role_id'),
  stock: integer('stock'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const starboardPosts = pgTable('starboard_posts', {
  originalMessageId: text('original_message_id').primaryKey(),
  starboardMessageId: text('starboard_message_id').notNull(),
  count: integer('count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const statsDaily = pgTable('stats_daily', {
  date: date('date').primaryKey(),
  messages: integer('messages').default(0).notNull(),
  joins: integer('joins').default(0).notNull(),
  leaves: integer('leaves').default(0).notNull(),
  commands: integer('commands').default(0).notNull(),
  voiceSeconds: integer('voice_seconds').default(0).notNull(),
  musicPlays: integer('music_plays').default(0).notNull(),
});

export const commandUsage = pgTable(
  'command_usage',
  {
    date: date('date').notNull(),
    command: text('command').notNull(),
    count: integer('count').default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.date, t.command] }), index('command_usage_date_idx').on(t.date)],
);

export const configAudit = pgTable(
  'config_audit',
  {
    id: serial('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    module: text('module').notNull(),
    before: jsonb('before').$type<unknown>(),
    after: jsonb('after').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('config_audit_created_idx').on(t.createdAt)],
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
    userId: text('user_id').notNull(),
    channelId: text('channel_id').notNull(),
    message: text('message').notNull(),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    sent: boolean('sent').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('reminders_due_idx').on(t.sent, t.remindAt)],
);

export type SettingsRow = typeof settings.$inferSelect;
export type MemberRow = typeof members.$inferSelect;
export type CaseRow = typeof cases.$inferSelect;
export type TicketRow = typeof tickets.$inferSelect;
export type GiveawayRow = typeof giveaways.$inferSelect;
export type StatsDailyRow = typeof statsDaily.$inferSelect;
