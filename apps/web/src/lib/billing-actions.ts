'use server';

import { premiumSubscriptions } from '@veyra/db';
import { and, eq, isNotNull, or, isNull, gt } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth';
import { grantManualPremium } from '@/lib/billing';
import { getDb } from '@/lib/db';
import { optionalEnv } from '@/lib/env';
import { getGuildAccess, isPlatformAdmin } from '@/lib/guilds';
import { getStripe, stripePriceId } from '@/lib/stripe';

async function baseUrl(): Promise<string> {
  const configured = optionalEnv('DASHBOARD_URL');
  if (configured) return configured.replace(/\/$/, '');
  const headerList = await headers();
  const origin = headerList.get('origin');
  return (origin ?? 'http://localhost:3000').replace(/\/$/, '');
}

function premiumPath(guildId: string, query: string): string {
  return `/g/${guildId}/premium?${query}`;
}

async function existingCustomer(guildId: string): Promise<string | null> {
  const rows = await getDb()
    .select({ customerId: premiumSubscriptions.stripeCustomerId })
    .from(premiumSubscriptions)
    .where(
      and(
        eq(premiumSubscriptions.guildId, guildId),
        isNotNull(premiumSubscriptions.stripeCustomerId),
        or(
          isNull(premiumSubscriptions.currentPeriodEnd),
          gt(premiumSubscriptions.currentPeriodEnd, new Date()),
        ),
      ),
    )
    .limit(1);
  return rows[0]?.customerId ?? null;
}

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const guildId = String(formData.get('guildId') ?? '');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!/^\d{17,20}$/.test(guildId)) redirect('/servers');

  const access = await getGuildAccess(guildId, user);
  if (!access) redirect('/servers?error=forbidden');

  const stripe = getStripe();
  const price = stripePriceId();
  if (!stripe || !price) redirect(premiumPath(guildId, 'billing=missing'));

  const base = await baseUrl();

  let checkoutUrl: string;
  try {
    const customer =
      (await existingCustomer(guildId)) ??
      (
        await stripe.customers.create({
          name: access.guild.name,
          metadata: { guildId, userId: user.id },
        })
      ).id;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: `${guildId}:${user.id}`,
      metadata: { guildId, userId: user.id },
      subscription_data: { metadata: { guildId, userId: user.id } },
      success_url: `${base}/g/${guildId}/premium?checkout=success`,
      cancel_url: `${base}/g/${guildId}/premium?checkout=cancel`,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    checkoutUrl = session.url;
  } catch {
    redirect(premiumPath(guildId, 'billing=error'));
  }

  redirect(checkoutUrl);
}

export async function openBillingPortalAction(formData: FormData): Promise<void> {
  const guildId = String(formData.get('guildId') ?? '');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!/^\d{17,20}$/.test(guildId)) redirect('/servers');

  const access = await getGuildAccess(guildId, user);
  if (!access) redirect('/servers?error=forbidden');

  const stripe = getStripe();
  if (!stripe) redirect(premiumPath(guildId, 'billing=missing'));

  const customer = await existingCustomer(guildId);
  if (!customer) redirect(premiumPath(guildId, 'billing=no-customer'));

  let portalUrl: string;
  try {
    const base = await baseUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${base}/g/${guildId}/premium`,
    });
    portalUrl = session.url;
  } catch {
    redirect(premiumPath(guildId, 'billing=error'));
  }

  redirect(portalUrl);
}

export async function grantManualPremiumAction(formData: FormData): Promise<void> {
  const guildId = String(formData.get('guildId') ?? '');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!/^\d{17,20}$/.test(guildId)) redirect('/servers');
  if (!isPlatformAdmin(user.id)) redirect('/servers?error=forbidden');
  if (!(await getGuildAccess(guildId, user))) redirect('/servers?error=forbidden');

  const days = Number.parseInt(String(formData.get('days') ?? ''), 10);
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    redirect(premiumPath(guildId, 'manual=invalid'));
  }

  await grantManualPremium(getDb(), guildId, user.id, days);
  revalidatePath(`/g/${guildId}/premium`);
  revalidatePath(`/g/${guildId}`);
  redirect(premiumPath(guildId, 'manual=granted'));
}
