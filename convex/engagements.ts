import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const targetType = v.union(
  v.literal("discussion"),
  v.literal("libraryItem"),
  v.literal("profile")
);
const kind = v.union(v.literal("Like"), v.literal("Star"));

async function getCallerProfile(ctx: any) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", authUserId))
    .first();
  if (!profile || profile.deleteAccount || profile.isDisabled) throw new Error("Profile not found");
  return profile;
}

// Toggle a Like or Star on a discussion, library item, or profile.
export const toggleEngagement = mutation({
  args: { targetType, targetId: v.string(), kind },
  handler: async (ctx, args) => {
    const profile = await getCallerProfile(ctx);

    const existing = await ctx.db
      .query("engagements")
      .withIndex("by_target_kind_user", (q: any) =>
        q
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
          .eq("kind", args.kind)
          .eq("userId", profile._id)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("engagements", {
        userId: profile._id,
        targetType: args.targetType,
        targetId: args.targetId,
        kind: args.kind,
      });
    }
  },
});

// ─── Query-side helpers (used by other Convex functions, not exported as API) ──

export async function countEngagement(
  ctx: any,
  targetType: "discussion" | "libraryItem" | "profile",
  targetId: string,
  kind: "Like" | "Star"
): Promise<number> {
  const rows = await ctx.db
    .query("engagements")
    .withIndex("by_target_kind", (q: any) =>
      q.eq("targetType", targetType).eq("targetId", targetId).eq("kind", kind)
    )
    .collect();
  return rows.length;
}

export async function isEngagedBy(
  ctx: any,
  targetType: "discussion" | "libraryItem" | "profile",
  targetId: string,
  kind: "Like" | "Star",
  userId: string
): Promise<boolean> {
  const row = await ctx.db
    .query("engagements")
    .withIndex("by_target_kind_user", (q: any) =>
      q.eq("targetType", targetType).eq("targetId", targetId).eq("kind", kind).eq("userId", userId)
    )
    .first();
  return row !== null;
}
