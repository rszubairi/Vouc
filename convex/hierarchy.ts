import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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

const MAX_HIERARCHY_LEVEL = 100;

// Rebuild and persist the full hierarchy for a given profileId.
// Should be called when sponsorApproved flips to true, or sponsor changes.
// Upline (bounded by chain depth) is written directly; downline can be
// arbitrarily large, so it's written level-by-level across scheduled
// mutations to stay under Convex's per-execution read/write limits.
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
    await collectUpline(ctx, profileId, 1, MAX_HIERARCHY_LEVEL, upline);

    for (const { userId, level } of upline) {
      await ctx.db.insert("profileHierarchies", {
        profileId,
        userId,
        isUpline: true,
        level,
      });
    }

    await ctx.scheduler.runAfter(0, internal.hierarchy.rebuildDownlineLevel, {
      profileId,
      frontier: [profileId],
      level: 1,
    });
  },
});

// Writes one level of profileId's downline, then schedules the next level.
// Splitting the (potentially huge) downline across scheduled mutations keeps
// each execution's document reads/writes well under Convex's per-call limits.
export const rebuildDownlineLevel = internalMutation({
  args: {
    profileId: v.id("profiles"),
    frontier: v.array(v.id("profiles")),
    level: v.number(),
  },
  handler: async (ctx, { profileId, frontier, level }) => {
    if (level > MAX_HIERARCHY_LEVEL || frontier.length === 0) return;

    const nextFrontier: Id<"profiles">[] = [];
    for (const parentId of frontier) {
      const children = await ctx.db
        .query("profiles")
        .withIndex("by_sponsorId", (q) => q.eq("sponsorId", parentId))
        .filter((q) => q.eq(q.field("sponsorApproved"), true))
        .collect();

      for (const child of children) {
        await ctx.db.insert("profileHierarchies", {
          profileId,
          userId: child._id,
          isUpline: false,
          level,
        });
        nextFrontier.push(child._id);
      }
    }

    if (nextFrontier.length > 0) {
      await ctx.scheduler.runAfter(0, internal.hierarchy.rebuildDownlineLevel, {
        profileId,
        frontier: nextFrontier,
        level: level + 1,
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
