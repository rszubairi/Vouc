import { query, internalQuery, internalMutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function callerProfile(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  if (!profile || profile.deleteAccount || profile.isDisabled) return null;
  return profile;
}

// Resolves the authenticated caller's profile. Exposed as internal so the
// "use node" actions in convex/stripe.ts can call it via ctx.runQuery —
// actions never trust a client-supplied profileId for authorization.
export const getCallerProfileInternal = internalQuery({
  args: {},
  handler: async (ctx) => callerProfile(ctx),
});

export const getCallerSubscriptionInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await callerProfile(ctx);
    if (!profile) return null;
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .first();
  },
});

// Self-service: current member's subscription + membership status.
export const mySubscription = query({
  args: {},
  handler: async (ctx) => {
    const profile = await callerProfile(ctx);
    if (!profile) return null;
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .first();
    return {
      fullAccess: profile.fullAccess,
      fullAccessExpiryDate: profile.fullAccessExpiryDate ?? null,
      subscription,
    };
  },
});

// Self-service: current member's payment history, newest first.
export const myPaymentHistory = query({
  args: {},
  handler: async (ctx) => {
    const profile = await callerProfile(ctx);
    if (!profile) return [];
    return await ctx.db
      .query("payments")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .collect();
  },
});

// ── internal mutations, called only from the Stripe webhook (convex/http.js) ──

export const upsertSubscriptionFromStripe = internalMutation({
  args: {
    profileId: v.id("profiles"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    priceId: v.string(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_profileId", (q) => q.eq("profileId", args.profileId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("subscriptions", { ...args, createdAt: now, updatedAt: now });
    }

    const isActive = args.status === "active" || args.status === "trialing";
    await ctx.db.patch(args.profileId, {
      fullAccess: isActive,
      fullAccessExpiryDate: args.currentPeriodEnd,
    });
  },
});

export const recordPayment = internalMutation({
  args: {
    profileId: v.id("profiles"),
    stripeCustomerId: v.string(),
    stripeInvoiceId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("paid"), v.literal("failed"), v.literal("refunded")),
    paidAt: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.stripeInvoiceId) {
      const dup = await ctx.db
        .query("payments")
        .withIndex("by_stripeInvoiceId", (q) => q.eq("stripeInvoiceId", args.stripeInvoiceId))
        .first();
      if (dup) return;
    }
    await ctx.db.insert("payments", args);
  },
});

export const findProfileIdByCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }): Promise<Id<"profiles"> | null> => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();
    return sub?.profileId ?? null;
  },
});

// Idempotency guard: returns alreadyProcessed=true if this Stripe event was
// already handled, so the webhook handler can safely no-op on retries.
export const markEventProcessed = internalMutation({
  args: { stripeEventId: v.string(), type: v.string() },
  handler: async (ctx, { stripeEventId, type }) => {
    const existing = await ctx.db
      .query("stripeEvents")
      .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", stripeEventId))
      .first();
    if (existing) return { alreadyProcessed: true };
    await ctx.db.insert("stripeEvents", { stripeEventId, type, processedAt: Date.now() });
    return { alreadyProcessed: false };
  },
});
