import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Recursively collect all downline profiles up to maxLevel depth.
async function collectDownline(
  ctx: any,
  profileId: Id<"profiles">,
  level: number,
  maxLevel: number,
  results: Array<{ userId: Id<"profiles">; level: number }>
) {
  const children = await ctx.db
    .query("profiles")
    .withIndex("by_sponsorId", (q: any) => q.eq("sponsorId", profileId))
    .filter((q: any) => q.eq(q.field("sponsorApproved"), true))
    .collect();

  for (const child of children) {
    results.push({ userId: child._id, level });
    if (level < maxLevel) {
      await collectDownline(ctx, child._id, level + 1, maxLevel, results);
    }
  }
}

// Recursively collect all upline profiles up to maxLevel depth.
async function collectUpline(
  ctx: any,
  profileId: Id<"profiles">,
  level: number,
  maxLevel: number,
  results: Array<{ userId: Id<"profiles">; level: number }>
) {
  const profile = await ctx.db.get(profileId);
  if (!profile || !profile.sponsorId || !profile.sponsorApproved) return;

  results.push({ userId: profile.sponsorId, level });
  if (level < maxLevel) {
    await collectUpline(ctx, profile.sponsorId, level + 1, maxLevel, results);
  }
}

// Rebuild and persist the full hierarchy for a given profileId.
// Should be called when sponsorApproved flips to true, or sponsor changes.
export const rebuildHierarchy = internalMutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    // Remove existing entries for this profile
    const existing = await ctx.db
      .query("profileHierarchies")
      .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const upline: Array<{ userId: Id<"profiles">; level: number }> = [];
    await collectUpline(ctx, profileId, 1, 100, upline);

    const downline: Array<{ userId: Id<"profiles">; level: number }> = [];
    await collectDownline(ctx, profileId, 1, 100, downline);

    for (const { userId, level } of upline) {
      await ctx.db.insert("profileHierarchies", {
        profileId,
        userId,
        isUpline: true,
        level,
      });
    }
    for (const { userId, level } of downline) {
      await ctx.db.insert("profileHierarchies", {
        profileId,
        userId,
        isUpline: false,
        level,
      });
    }
  },
});

// Get downline IDs for a profile up to a given max level (for visibility computation).
export const getDownlineIds = internalQuery({
  args: {
    profileId: v.id("profiles"),
    maxLevel: v.optional(v.number()),
  },
  handler: async (ctx, { profileId, maxLevel }) => {
    const rows = await ctx.db
      .query("profileHierarchies")
      .withIndex("by_profileId_isUpline", (q) =>
        q.eq("profileId", profileId).eq("isUpline", false)
      )
      .collect();

    return rows
      .filter((r) => maxLevel === undefined || r.level <= maxLevel)
      .map((r) => ({ userId: r.userId, level: r.level }));
  },
});

// Get upline IDs for a profile up to a given max level.
export const getUplineIds = internalQuery({
  args: {
    profileId: v.id("profiles"),
    maxLevel: v.optional(v.number()),
  },
  handler: async (ctx, { profileId, maxLevel }) => {
    const rows = await ctx.db
      .query("profileHierarchies")
      .withIndex("by_profileId_isUpline", (q) =>
        q.eq("profileId", profileId).eq("isUpline", true)
      )
      .collect();

    return rows
      .filter((r) => maxLevel === undefined || r.level <= maxLevel)
      .map((r) => ({ userId: r.userId, level: r.level }));
  },
});

// Parse "Level 3" → 3. Returns undefined if blank/null.
export function parseLevel(levelStr: string | undefined): number | undefined {
  if (!levelStr) return undefined;
  const match = levelStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : undefined;
}
