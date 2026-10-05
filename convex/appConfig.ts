import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./adminAuth";

// Global flag: while true, every member gets pro-feature access for free,
// regardless of their own profiles.fullAccess/subscription state. Public —
// clients (including signed-out ones) need it to decide what UI to show.
async function getBetaModeEnabled(ctx: QueryCtx): Promise<boolean> {
  const config = await ctx.db.query("appConfig").first();
  return config?.betaModeEnabled ?? false;
}

export const isBetaModeEnabled = query({
  args: {},
  handler: async (ctx) => getBetaModeEnabled(ctx),
});

export const adminSetBetaMode = mutation({
  args: { betaModeEnabled: v.boolean() },
  handler: async (ctx, { betaModeEnabled }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("appConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { betaModeEnabled });
    } else {
      await ctx.db.insert("appConfig", { betaModeEnabled });
    }
  },
});

// Shared gate used everywhere pro-feature access is checked (discussions,
// library, knowledgeHub, events). Beta mode grants access on top of a
// profile's own fullAccess — it never has to be written to profiles itself,
// so the real subscription state is untouched and takes over cleanly when
// beta mode is turned off.
export async function hasProAccess(
  ctx: QueryCtx,
  profile: Pick<Doc<"profiles">, "fullAccess"> | null | undefined
): Promise<boolean> {
  if (profile?.fullAccess) return true;
  return getBetaModeEnabled(ctx);
}

export { getBetaModeEnabled };
