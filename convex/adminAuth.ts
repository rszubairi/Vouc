import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Resolve the authenticated caller's profile, throwing if they are not
// signed in or are not an admin. Shared by every admin-only Convex function.
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"profiles">> {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", authUserId))
    .first();

  if (!profile || !profile.isAdmin) throw new Error("Admin access required");

  return profile;
}
