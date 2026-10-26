import Stripe from 'stripe';
import { optionalEnv } from './env';

let client: Stripe | null | undefined;

/** Lazily creates the Stripe client so pages render without billing secrets. */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;

  const key = optionalEnv('STRIPE_SECRET_KEY');
  if (!key) {
    client = null;
    return client;
  }

  client = new Stripe(key);
  return client;
}

export function stripePriceId(): string | null {
  return optionalEnv('STRIPE_PRICE_ID');
}

export function stripeWebhookSecret(): string | null {
  return optionalEnv('STRIPE_WEBHOOK_SECRET');
}

export function billingConfigured(): boolean {
  return Boolean(optionalEnv('STRIPE_SECRET_KEY') && stripePriceId());
}
