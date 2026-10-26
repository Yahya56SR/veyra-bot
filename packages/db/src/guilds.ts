import { premiumActive, type PremiumTier } from '@veyra/shared';
import { and, eq, gt, inArray, isNull, or } from 'drizzle-orm';
import type { Database } from './client.js';
import { guilds, premiumSubscriptions } from './schema.js';

export interface GuildIdentity {
  id: string;
  name: string;
  icon?: string | null;
  ownerId?: string | null;
  memberCount?: number;
}

type GuildRecord = typeof guilds.$inferSelect;

/** Upserts the guild metadata the bot can see from Discord. */
export async function ensureGuild(db: Database, guild: GuildIdentity): Promise<GuildRecord> {
  const rows = await db
    .insert(guilds)
    .values({
      id: guild.id,
      name: guild.name,
      icon: guild.icon ?? null,
      ownerId: guild.ownerId ?? null,
      memberCount: guild.memberCount ?? 0,
      leftAt: null,
    })
    .onConflictDoUpdate({
      target: guilds.id,
      set: {
        name: guild.name,
        icon: guild.icon ?? null,
        ownerId: guild.ownerId ?? null,
        memberCount: guild.memberCount ?? 0,
        leftAt: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  const row = rows[0];
  if (!row) throw new Error('Could not persist guild.');
  return row;
}

export async function markGuildLeft(db: Database, guildId: string): Promise<void> {
  await db
    .update(guilds)
    .set({ leftAt: new Date(), updatedAt: new Date() })
    .where(eq(guilds.id, guildId));
}

export async function readGuild(db: Database, guildId: string): Promise<GuildRecord | null> {
  const rows = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);
  return rows[0] ?? null;
}

export async function listActiveGuilds(db: Database): Promise<GuildRecord[]> {
  return db.select().from(guilds).where(isNull(guilds.leftAt));
}

export async function setGuildPremium(
  db: Database,
  guildId: string,
  tier: PremiumTier,
  until: Date | null,
): Promise<void> {
  await db
    .update(guilds)
    .set({ premiumTier: tier, premiumUntil: until, updatedAt: new Date() })
    .where(eq(guilds.id, guildId));
}

export async function isGuildPremium(db: Database, guildId: string): Promise<boolean> {
  const row = await readGuild(db, guildId);
  return row ? premiumActive(row.premiumTier, row.premiumUntil) : false;
}

/**
 * Recomputes the guild entitlement from every active grant. This makes webhook
 * retries, manual comps, and stacked subscriptions converge on the same state.
 */
export async function recomputeGuildPremium(db: Database, guildId: string): Promise<void> {
  const now = new Date();
  const grants = await db
    .select({
      currentPeriodEnd: premiumSubscriptions.currentPeriodEnd,
      tier: premiumSubscriptions.tier,
    })
    .from(premiumSubscriptions)
    .where(
      and(
        eq(premiumSubscriptions.guildId, guildId),
        inArray(premiumSubscriptions.status, ['active', 'trialing']),
        or(
          isNull(premiumSubscriptions.currentPeriodEnd),
          gt(premiumSubscriptions.currentPeriodEnd, now),
        ),
      ),
    );

  if (grants.length === 0) {
    await setGuildPremium(db, guildId, 'free', null);
    return;
  }

  const permanent = grants.some((grant) => grant.currentPeriodEnd === null);
  if (permanent) {
    await setGuildPremium(db, guildId, 'premium', null);
    return;
  }

  const latest = grants.reduce<Date | null>((max, grant) => {
    const end = grant.currentPeriodEnd;
    if (!end) return max;
    return !max || end > max ? end : max;
  }, null);

  await setGuildPremium(db, guildId, 'premium', latest);
}

/** Active grants for dashboard billing views. */
export async function listPremiumSubscriptions(db: Database, guildId: string) {
  return db
    .select()
    .from(premiumSubscriptions)
    .where(
      and(
        eq(premiumSubscriptions.guildId, guildId),
        inArray(premiumSubscriptions.status, ['active', 'trialing']),
        or(
          isNull(premiumSubscriptions.currentPeriodEnd),
          gt(premiumSubscriptions.currentPeriodEnd, new Date()),
        ),
      ),
    );
}
