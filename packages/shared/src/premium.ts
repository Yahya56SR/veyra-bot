import { z } from 'zod';

export const PREMIUM_TIERS = ['free', 'premium'] as const;
export const PremiumTierSchema = z.enum(PREMIUM_TIERS);
export type PremiumTier = (typeof PREMIUM_TIERS)[number];

export const PREMIUM_PLAN = {
  id: 'premium',
  name: 'Veyra Premium',
  amountCents: 499,
  currency: 'usd',
  interval: 'month',
  trialDays: 0,
} as const;

export const PREMIUM_FEATURES = [
  {
    id: 'personalizer',
    name: 'Server personalizer',
    description:
      'Per-server nickname, embed color, footer, thumbnail, and custom level-up and ticket-panel copy.',
  },
  {
    id: 'music-247',
    name: '24/7 music',
    description: 'Keep the music player connected even when everyone leaves the voice channel.',
  },
  {
    id: 'music-queue',
    name: 'Extended music queue',
    description: 'Queue up to 500 tracks per server instead of the free 100.',
  },
  {
    id: 'analytics',
    name: 'Extended analytics',
    description: 'Keep detailed server activity and command analytics for a full year.',
  },
  {
    id: 'priority',
    name: 'Priority support',
    description: 'Get priority help in the support server and early access to new modules.',
  },
] as const;

export type PremiumFeatureId = (typeof PREMIUM_FEATURES)[number]['id'];

/** Free servers keep the queue at 100 tracks even if the configured maximum is higher. */
export const FREE_MUSIC_QUEUE = 100;

export function premiumActive(
  tier: PremiumTier | string | null | undefined,
  until: Date | string | null | undefined,
  now = Date.now(),
): boolean {
  if (tier !== 'premium') return false;
  if (!until) return true;
  const end = until instanceof Date ? until.getTime() : new Date(until).getTime();
  return Number.isFinite(end) ? end > now : false;
}

export const PREMIUM_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
  'inactive',
] as const;

export type PremiumStatus = (typeof PREMIUM_STATUSES)[number];

export function premiumStatusGrantsAccess(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}
