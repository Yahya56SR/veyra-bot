import { premiumSubscriptions, recomputeGuildPremium, type Database } from '@veyra/db';
import { premiumStatusGrantsAccess, type PremiumStatus } from '@veyra/shared';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

function customerId(subscription: Stripe.Subscription): string | null {
  if (typeof subscription.customer === 'string') return subscription.customer;
  return subscription.customer?.id ?? null;
}

/**
 * Stripe moved `current_period_end` between API versions. Read the subscription
 * field first, then the first item so either shape is handled.
 */
function periodEnd(subscription: Stripe.Subscription): Date | null {
  const raw = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const seconds = raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

export function subscriptionEntitled(subscription: Stripe.Subscription): boolean {
  if (!premiumStatusGrantsAccess(subscription.status)) return false;
  const end = periodEnd(subscription);
  return !end || end.getTime() > Date.now();
}

export async function syncStripeSubscription(
  db: Database,
  subscription: Stripe.Subscription,
): Promise<void> {
  const existing = await db
    .select({ guildId: premiumSubscriptions.guildId, userId: premiumSubscriptions.userId })
    .from(premiumSubscriptions)
    .where(eq(premiumSubscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  const guildId = subscription.metadata.guildId ?? existing[0]?.guildId;
  if (!guildId) return;

  const userId = subscription.metadata.userId ?? existing[0]?.userId ?? 'stripe';
  const status = subscription.status as PremiumStatus;
  const end = periodEnd(subscription);

  await db
    .insert(premiumSubscriptions)
    .values({
      guildId,
      userId,
      provider: 'stripe',
      stripeCustomerId: customerId(subscription),
      stripeSubscriptionId: subscription.id,
      tier: 'premium',
      status,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: premiumSubscriptions.stripeSubscriptionId,
      set: {
        stripeCustomerId: customerId(subscription),
        tier: 'premium',
        status,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });

  await recomputeGuildPremium(db, guildId);
}

/** Platform-staff comp. Uses the same entitlement recomputation as Stripe. */
export async function grantManualPremium(
  db: Database,
  guildId: string,
  userId: string,
  days: number,
): Promise<void> {
  const until = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

  await db.insert(premiumSubscriptions).values({
    guildId,
    userId,
    provider: 'manual',
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: until,
    cancelAtPeriodEnd: false,
    updatedAt: new Date(),
  });

  await recomputeGuildPremium(db, guildId);
}
