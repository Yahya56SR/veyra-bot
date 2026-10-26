import { members, shopItems, type Database } from '@veyra/db';
import { formatDuration, randomInt } from '@veyra/shared';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { EconomyConfig } from '@veyra/shared';
import { UserFacingError } from '../../core/errors.js';

export const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const DAILY_STREAK_WINDOW_MS = 48 * 60 * 60 * 1000;

export type MemberRow = typeof members.$inferSelect;
export type ShopItemRow = typeof shopItems.$inferSelect;

export function formatCurrency(amount: number, config: EconomyConfig): string {
  return `${config.currencySymbol}${amount.toLocaleString()} ${config.currency}`;
}

export function parseAmount(raw: number): number {
  if (!Number.isSafeInteger(raw) || raw <= 0) {
    throw new UserFacingError('The amount must be a positive whole number.');
  }
  if (raw > 1_000_000_000) {
    throw new UserFacingError('That amount is too large.');
  }
  return raw;
}

/** The next daily streak value, using the 48-hour forgiveness window. */
export function nextDailyStreak(
  lastDaily: Date | null,
  currentStreak: number,
  now: number,
): number {
  if (!lastDaily) return 1;
  const elapsed = now - lastDaily.getTime();
  return elapsed < DAILY_STREAK_WINDOW_MS ? currentStreak + 1 : 1;
}

export async function ensureMember(
  db: Database,
  guildId: string,
  userId: string,
): Promise<MemberRow> {
  await db.insert(members).values({ guildId, userId }).onConflictDoNothing();
  const rows = await db
    .select()
    .from(members)
    .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new UserFacingError('Could not load that member.');
  return row;
}

export async function getBalance(
  db: Database,
  guildId: string,
  userId: string,
): Promise<MemberRow> {
  return ensureMember(db, guildId, userId);
}

export interface DailyResult {
  payout: number;
  streak: number;
  bonus: number;
  balance: number;
}

export async function claimDaily(
  db: Database,
  guildId: string,
  userId: string,
  config: EconomyConfig,
  now = Date.now(),
): Promise<DailyResult> {
  return db.transaction(async (tx) => {
    await tx.insert(members).values({ guildId, userId }).onConflictDoNothing();
    const locked = await tx
      .select()
      .from(members)
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .for('update');
    const member = locked[0];
    if (!member) throw new UserFacingError('Could not load that member.');

    const last = member.lastDaily?.getTime() ?? 0;
    if (last > 0 && now - last < DAILY_INTERVAL_MS) {
      throw new UserFacingError(
        `Your daily is available in ${formatDuration(DAILY_INTERVAL_MS - (now - last))}.`,
      );
    }

    const streak = nextDailyStreak(member.lastDaily, member.dailyStreak, now);
    const bonus = Math.max(0, streak - 1) * config.dailyStreakBonus;
    const payout = config.dailyAmount + bonus;

    const updated = await tx
      .update(members)
      .set({
        balance: sql`${members.balance} + ${payout}`,
        lastDaily: new Date(now),
        dailyStreak: streak,
        updatedAt: new Date(now),
      })
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .returning({ balance: members.balance });

    return {
      payout,
      streak,
      bonus,
      balance: updated[0]?.balance ?? member.balance + payout,
    };
  });
}

export interface WorkResult {
  payout: number;
  balance: number;
  nextAt: Date;
}

export async function work(
  db: Database,
  guildId: string,
  userId: string,
  config: EconomyConfig,
  now = Date.now(),
): Promise<WorkResult> {
  return db.transaction(async (tx) => {
    await tx.insert(members).values({ guildId, userId }).onConflictDoNothing();
    const locked = await tx
      .select()
      .from(members)
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .for('update');
    const member = locked[0];
    if (!member) throw new UserFacingError('Could not load that member.');

    const cooldownMs = config.workCooldownSeconds * 1000;
    const last = member.lastWork?.getTime() ?? 0;
    if (last > 0 && now - last < cooldownMs) {
      throw new UserFacingError(
        `You can work again in ${formatDuration(cooldownMs - (now - last))}.`,
      );
    }

    const payout = randomInt(config.workMin, config.workMax);
    const nextAt = new Date(now + cooldownMs);

    const updated = await tx
      .update(members)
      .set({
        balance: sql`${members.balance} + ${payout}`,
        lastWork: new Date(now),
        updatedAt: new Date(now),
      })
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .returning({ balance: members.balance });

    return {
      payout,
      balance: updated[0]?.balance ?? member.balance + payout,
      nextAt,
    };
  });
}

export interface TransferResult {
  amount: number;
  senderBalance: number;
  receiverBalance: number;
}

/**
 * Transfers coins with both rows locked in sorted order. Sorting avoids the
 * classic A->B / B->A deadlock when two members pay each other at once.
 */
export async function transferBalance(
  db: Database,
  guildId: string,
  senderId: string,
  receiverId: string,
  amount: number,
): Promise<TransferResult> {
  const value = parseAmount(amount);
  if (senderId === receiverId) {
    throw new UserFacingError('You cannot pay yourself.');
  }

  const ids = [senderId, receiverId].sort();

  return db.transaction(async (tx) => {
    await tx
      .insert(members)
      .values(ids.map((userId) => ({ guildId, userId })))
      .onConflictDoNothing();

    const locked = await tx
      .select()
      .from(members)
      .where(and(eq(members.guildId, guildId), inArray(members.userId, ids)))
      .orderBy(asc(members.userId))
      .for('update');

    const sender = locked.find((row) => row.userId === senderId);
    const receiver = locked.find((row) => row.userId === receiverId);
    if (!sender || !receiver) throw new UserFacingError('Could not load both members.');
    if (sender.balance < value) throw new UserFacingError('You do not have enough coins.');

    const senderRows = await tx
      .update(members)
      .set({
        balance: sql`${members.balance} - ${value}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(members.guildId, guildId),
          eq(members.userId, senderId),
          gte(members.balance, value),
        ),
      )
      .returning({ balance: members.balance });

    if (!senderRows[0]) throw new UserFacingError('You do not have enough coins.');

    const receiverRows = await tx
      .update(members)
      .set({
        balance: sql`${members.balance} + ${value}`,
        updatedAt: new Date(),
      })
      .where(and(eq(members.guildId, guildId), eq(members.userId, receiverId)))
      .returning({ balance: members.balance });

    return {
      amount: value,
      senderBalance: senderRows[0].balance,
      receiverBalance: receiverRows[0]?.balance ?? receiver.balance + value,
    };
  });
}

export interface GambleResult {
  won: boolean;
  amount: number;
  balance: number;
}

export async function gamble(
  db: Database,
  guildId: string,
  userId: string,
  amount: number,
): Promise<GambleResult> {
  const value = parseAmount(amount);

  return db.transaction(async (tx) => {
    await tx.insert(members).values({ guildId, userId }).onConflictDoNothing();
    const locked = await tx
      .select()
      .from(members)
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .for('update');
    const member = locked[0];
    if (!member) throw new UserFacingError('Could not load that member.');
    if (member.balance < value) throw new UserFacingError('You do not have enough coins.');

    const won = randomInt(0, 1) === 1;
    const delta = won ? value : -value;

    const updated = await tx
      .update(members)
      .set({
        balance: sql`${members.balance} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .returning({ balance: members.balance });

    return {
      won,
      amount: value,
      balance: updated[0]?.balance ?? member.balance + delta,
    };
  });
}

export async function listShop(db: Database, guildId: string): Promise<ShopItemRow[]> {
  return db
    .select()
    .from(shopItems)
    .where(eq(shopItems.guildId, guildId))
    .orderBy(asc(shopItems.price), asc(shopItems.id));
}

export async function findShopItem(
  db: Database,
  guildId: string,
  query: string,
): Promise<ShopItemRow | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const rows = await db
      .select()
      .from(shopItems)
      .where(and(eq(shopItems.guildId, guildId), eq(shopItems.id, Number(trimmed))))
      .limit(1);
    if (rows[0]) return rows[0];
  }

  const rows = await db
    .select()
    .from(shopItems)
    .where(and(eq(shopItems.guildId, guildId), eq(shopItems.name, trimmed)))
    .limit(1);
  return rows[0] ?? null;
}

export interface PurchaseResult {
  item: ShopItemRow;
  balance: number;
  stock: number | null;
}

/**
 * Deducts the price and stock atomically, then grants the role. If Discord
 * rejects the role grant, the transaction is compensated before surfacing the
 * error so a failed purchase cannot silently consume coins.
 */
export async function purchaseItem(
  db: Database,
  guildId: string,
  userId: string,
  itemId: number,
): Promise<PurchaseResult> {
  return db.transaction(async (tx) => {
    const items = await tx
      .select()
      .from(shopItems)
      .where(and(eq(shopItems.guildId, guildId), eq(shopItems.id, itemId)))
      .for('update');
    const item = items[0];
    if (!item) throw new UserFacingError('That shop item no longer exists.');
    if (item.stock !== null && item.stock <= 0) throw new UserFacingError('That item is sold out.');

    await tx.insert(members).values({ guildId, userId }).onConflictDoNothing();
    const locked = await tx
      .select()
      .from(members)
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .for('update');
    const member = locked[0];
    if (!member) throw new UserFacingError('Could not load that member.');
    if (member.balance < item.price) throw new UserFacingError('You do not have enough coins.');

    const memberRows = await tx
      .update(members)
      .set({
        balance: sql`${members.balance} - ${item.price}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(members.guildId, guildId),
          eq(members.userId, userId),
          gte(members.balance, item.price),
        ),
      )
      .returning({ balance: members.balance });

    if (!memberRows[0]) throw new UserFacingError('You do not have enough coins.');

    const itemRows = await tx
      .update(shopItems)
      .set({ stock: item.stock === null ? null : item.stock - 1 })
      .where(and(eq(shopItems.guildId, guildId), eq(shopItems.id, item.id)))
      .returning({ stock: shopItems.stock });

    return {
      item,
      balance: memberRows[0].balance,
      stock: itemRows[0]?.stock ?? null,
    };
  });
}

export async function refundPurchase(
  db: Database,
  guildId: string,
  userId: string,
  item: ShopItemRow,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({
        balance: sql`${members.balance} + ${item.price}`,
        updatedAt: new Date(),
      })
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)));

    if (item.stock !== null) {
      await tx
        .update(shopItems)
        .set({ stock: sql`${shopItems.stock} + 1` })
        .where(and(eq(shopItems.guildId, guildId), eq(shopItems.id, item.id)));
    }
  });
}

export async function inventoryForRoleIds(
  db: Database,
  guildId: string,
  roleIds: readonly string[],
): Promise<ShopItemRow[]> {
  if (roleIds.length === 0) return [];
  return db
    .select()
    .from(shopItems)
    .where(and(eq(shopItems.guildId, guildId), inArray(shopItems.roleId, [...roleIds])))
    .orderBy(asc(shopItems.price));
}

export async function topBalances(
  db: Database,
  guildId: string,
  limit = 10,
): Promise<{ userId: string; balance: number }[]> {
  return db
    .select({ userId: members.userId, balance: members.balance })
    .from(members)
    .where(eq(members.guildId, guildId))
    .orderBy(sql`${members.balance} DESC`)
    .limit(limit);
}

export interface AdminAdjustResult {
  balance: number;
}

export async function adjustBalance(
  db: Database,
  guildId: string,
  userId: string,
  delta: number,
): Promise<AdminAdjustResult> {
  if (!Number.isSafeInteger(delta)) throw new UserFacingError('Use a whole number.');

  return db.transaction(async (tx) => {
    await tx.insert(members).values({ guildId, userId }).onConflictDoNothing();
    const locked = await tx
      .select()
      .from(members)
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .for('update');
    const member = locked[0];
    if (!member) throw new UserFacingError('Could not load that member.');
    if (delta < 0 && member.balance + delta < 0) {
      throw new UserFacingError('That would make the balance negative.');
    }

    const updated = await tx
      .update(members)
      .set({
        balance: member.balance + delta,
        updatedAt: new Date(),
      })
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .returning({ balance: members.balance });

    return { balance: updated[0]?.balance ?? member.balance + delta };
  });
}

export async function setBalance(
  db: Database,
  guildId: string,
  userId: string,
  amount: number,
): Promise<AdminAdjustResult> {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new UserFacingError('Use a non-negative whole number.');
  }

  return db.transaction(async (tx) => {
    await tx.insert(members).values({ guildId, userId }).onConflictDoNothing();
    const updated = await tx
      .update(members)
      .set({ balance: amount, updatedAt: new Date() })
      .where(and(eq(members.guildId, guildId), eq(members.userId, userId)))
      .returning({ balance: members.balance });

    return { balance: updated[0]?.balance ?? amount };
  });
}
