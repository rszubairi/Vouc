import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Returns the signed-in admin's profile, or null if not signed in / not an
// admin. Used by the dashboard shell to gate access and by the login page
// to redirect an already-authenticated admin.
export const currentAdmin = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();

    if (!profile || !profile.isAdmin) return null;
    return profile;
  },
});

// Whether any admin account exists yet — used by the login page to decide
// whether to offer the "create admin account" bootstrap flow.
export const anyAdminExists = query({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();
    return admin !== null;
  },
});

// Claims admin access for the signed-in account. Only succeeds if no admin
// exists yet in the system (first-run bootstrap) — after that, additional
// admins must be created by an existing admin.
export const claimAdmin = mutation({
  args: {
    nickName: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    emailAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const existingAdmin = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();
    if (existingAdmin) {
      throw new Error(
        "An admin account already exists. Ask an existing admin to grant you access."
      );
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, { isAdmin: true });
      return existingProfile._id;
    }

    return await ctx.db.insert("profiles", {
      userId: authUserId,
      sponsorApproved: true,
      nickName: args.nickName,
      firstName: args.firstName,
      lastName: args.lastName,
      emailAddress: args.emailAddress,
      sponsorEmailAddress: args.emailAddress,
      city: "",
      country: "",
      fullAccess: true,
      deleteAccount: false,
      isAdmin: true,
    });
  },
});
