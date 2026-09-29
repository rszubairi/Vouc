"use node";

import Stripe from "stripe";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
}

function priceIdAnnual() {
  return process.env.STRIPE_PRICE_ID_ANNUAL!;
}

// Creates a Stripe Checkout Session (subscription mode) for the caller's
// annual membership. The caller's profile is resolved server-side from
// their auth identity — never trust a client-supplied profileId here.
export const createCheckoutSession = action({
  args: { successUrl: v.string(), cancelUrl: v.string() },
  handler: async (ctx, { successUrl, cancelUrl }): Promise<{ url: string }> => {
    const profile = await ctx.runQuery(internal.payments.getCallerProfileInternal, {});
    if (!profile) throw new Error("Not authenticated");

    const existingSub = await ctx.runQuery(internal.payments.getCallerSubscriptionInternal, {});

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceIdAnnual(), quantity: 1 }],
      client_reference_id: profile._id,
      customer: existingSub?.stripeCustomerId,
      customer_email: existingSub ? undefined : profile.emailAddress,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: { metadata: { profileId: profile._id } },
      metadata: { profileId: profile._id },
    });

    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return { url: session.url };
  },
});

// Creates a Stripe Billing Portal session so members can self-manage
// (cancel, update payment method) without us building those flows.
export const createBillingPortalSession = action({
  args: { returnUrl: v.string() },
  handler: async (ctx, { returnUrl }): Promise<{ url: string }> => {
    const sub = await ctx.runQuery(internal.payments.getCallerSubscriptionInternal, {});
    if (!sub) throw new Error("No active subscription for this member");

    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  },
});
