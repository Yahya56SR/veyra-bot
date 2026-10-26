import { stripeEvents } from '@veyra/db';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { syncStripeSubscription } from '@/lib/billing';
import { getStripe, stripeWebhookSecret } from '@/lib/stripe';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return new Response('Billing is not configured', { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const db = getDb();
  const seen = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id))
    .limit(1);
  if (seen[0]) return Response.json({ received: true, duplicate: true });

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncStripeSubscription(db, event.data.object as Stripe.Subscription);
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const id =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(id);
        await syncStripeSubscription(db, subscription);
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === 'string'
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncStripeSubscription(db, subscription);
      }
    }

    await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
    return Response.json({ received: true });
  } catch (error) {
    console.error(
      'Stripe webhook failed:',
      error instanceof Error ? error.message : error,
      event.type,
      event.id,
    );
    // Returning 500 makes Stripe retry. The event row is only written after success.
    return new Response('Webhook handler failed', { status: 500 });
  }
}
