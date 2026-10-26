import { guildMemberships, guilds, type Database } from '@veyra/db';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getSessionUser, requireUser, type SessionUser } from './auth';
import { getDb } from './db';
import { adminIds } from './env';

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface GuildAccess {
  guild: typeof guilds.$inferSelect;
  membership: typeof guildMemberships.$inferSelect | null;
  admin: boolean;
}

const MANAGE_GUILD = 1n << 5n;
const ADMINISTRATOR = 1n << 3n;

export function canManageGuild(permissions: string, owner: boolean): boolean {
  if (owner) return true;
  try {
    const bits = BigInt(permissions);
    return (bits & MANAGE_GUILD) === MANAGE_GUILD || (bits & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

export function isPlatformAdmin(userId: string): boolean {
  return adminIds().has(userId);
}

/** Returns the guild when the user may manage it, otherwise null. */
export async function getGuildAccess(
  guildId: string,
  user: SessionUser,
): Promise<GuildAccess | null> {
  const db = getDb();
  const guildRows = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);
  const guild = guildRows[0];
  if (!guild || guild.leftAt) return null;

  if (isPlatformAdmin(user.id)) return { guild, membership: null, admin: true };

  const rows = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.guildId, guildId), eq(guildMemberships.userId, user.id)))
    .limit(1);
  const membership = rows[0] ?? null;
  if (!membership || !canManageGuild(membership.permissions, membership.owner)) return null;

  return { guild, membership, admin: false };
}

/** Server-component guard: redirects instead of rendering a forbidden page. */
export async function requireGuildAccess(
  guildId: string,
): Promise<{ user: SessionUser; access: GuildAccess }> {
  const user = await requireUser();
  const access = await getGuildAccess(guildId, user);
  if (!access) redirect('/servers?error=forbidden');
  return { user, access };
}

export async function hasGuildAccess(guildId: string, userId: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user || user.id !== userId) return false;
  return (await getGuildAccess(guildId, user)) !== null;
}

export interface DashboardGuild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  premiumTier: string;
  premiumUntil: Date | null;
  leftAt: Date | null;
}

export async function listDashboardGuilds(userId: string): Promise<DashboardGuild[]> {
  const db = getDb();

  if (isPlatformAdmin(userId)) {
    return db
      .select({
        id: guilds.id,
        name: guilds.name,
        icon: guilds.icon,
        memberCount: guilds.memberCount,
        premiumTier: guilds.premiumTier,
        premiumUntil: guilds.premiumUntil,
        leftAt: guilds.leftAt,
      })
      .from(guilds)
      .where(isNull(guilds.leftAt))
      .orderBy(guilds.name);
  }

  return db
    .select({
      id: guilds.id,
      name: guilds.name,
      icon: guilds.icon,
      memberCount: guilds.memberCount,
      premiumTier: guilds.premiumTier,
      premiumUntil: guilds.premiumUntil,
      leftAt: guilds.leftAt,
      permissions: guildMemberships.permissions,
      owner: guildMemberships.owner,
    })
    .from(guildMemberships)
    .innerJoin(guilds, eq(guilds.id, guildMemberships.guildId))
    .where(and(eq(guildMemberships.userId, userId), isNull(guilds.leftAt)))
    .orderBy(guilds.name)
    .then((rows) =>
      rows
        .filter((row) => canManageGuild(row.permissions, row.owner))
        .map(({ permissions: _permissions, owner: _owner, ...guild }) => guild),
    );
}

/**
 * Stores which bot guilds the signed-in user can manage. This is a cache of the
 * Discord `guilds` scope, refreshed on every login; the bot remains the source
 * of truth for guild existence.
 */
export async function syncGuildMemberships(
  db: Database,
  userId: string,
  discordGuilds: readonly DiscordGuild[],
): Promise<void> {
  const ids = discordGuilds.map((guild) => guild.id);
  const botGuilds =
    ids.length === 0
      ? []
      : await db.select({ id: guilds.id }).from(guilds).where(inArray(guilds.id, ids));
  const botGuildIds = new Set(botGuilds.map((guild) => guild.id));

  await db.delete(guildMemberships).where(eq(guildMemberships.userId, userId));

  const values = discordGuilds
    .filter((guild) => botGuildIds.has(guild.id))
    .map((guild) => ({
      guildId: guild.id,
      userId,
      permissions: guild.permissions,
      owner: guild.owner,
      updatedAt: new Date(),
    }));

  if (values.length > 0) {
    await db.insert(guildMemberships).values(values).onConflictDoNothing();
  }
}
