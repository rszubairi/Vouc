// Temporary, one-off helper for manual Stripe billing testing. Not part of
// the app — delete after use.
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const setTestState = internalMutation({
  args: { profileId: v.id("profiles"), isAdmin: v.boolean(), fullAccess: v.boolean() },
  handler: async (ctx, { profileId, isAdmin, fullAccess }) => {
    await ctx.db.patch(profileId, { isAdmin, fullAccess });
  },
});

export const setBetaMode = internalMutation({
  args: { betaModeEnabled: v.boolean() },
  handler: async (ctx, { betaModeEnabled }) => {
    const existing = await ctx.db.query("appConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { betaModeEnabled });
    } else {
      await ctx.db.insert("appConfig", { betaModeEnabled });
    }
  },
});
