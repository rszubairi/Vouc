import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Get the currently authenticated user's profile.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.deleteAccount) return null;

    const image = await ctx.db
      .query("profileImages")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();

    if (image) {
      const img = await ctx.db.get(image.imageId);
      return { ...profile, profileImageUrl: img?.url ?? null };
    }

    return { ...profile, profileImageUrl: null };
  },
});

// Create a new profile at registration.
export const create = mutation({
  args: {
    nickName: v.string(),
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    emailAddress: v.string(),
    sponsorEmailAddress: v.string(),
    city: v.string(),
    country: v.string(),
    userRankId: v.optional(v.id("userRanks")),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    // Find sponsor by email
    const sponsor = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("emailAddress", args.sponsorEmailAddress))
      .first();
    if (!sponsor) throw new Error("Sponsor not found. Check the sponsor email address.");
    if (sponsor.deleteAccount) throw new Error("Sponsor account is not active.");

    // Prevent duplicate profile
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (existing) throw new Error("Profile already exists for this account.");

    const profileId = await ctx.db.insert("profiles", {
      userId: authUserId,
      sponsorId: sponsor._id,
      sponsorApproved: false, // awaits sponsor approval
      userRankId: args.userRankId,
      nickName: args.nickName,
      firstName: args.firstName,
      middleName: args.middleName,
      lastName: args.lastName,
      emailAddress: args.emailAddress,
      sponsorEmailAddress: args.sponsorEmailAddress,
      city: args.city,
      country: args.country,
      fullAccess: false,
      deleteAccount: false,
    });

    return profileId;
  },
});

// Update own profile.
export const updateProfile = mutation({
  args: {
    nickName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    middleName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    birthDate: v.optional(v.number()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    facebook: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    line: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    discord: v.optional(v.string()),
    weChat: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!profile) throw new Error("Profile not found");

    // Only pass defined fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) updates[key] = value;
    }

    await ctx.db.patch(profile._id, updates);
  },
});

// Get a short-lived URL the client can POST an image file to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// Set (or replace) the current user's profile picture from an uploaded file.
export const setProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!profile) throw new Error("Profile not found");

    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Uploaded file not found");

    const imageId = await ctx.db.insert("images", {
      userId: profile._id,
      url,
      storageId,
    });

    const existing = await ctx.db
      .query("profileImages")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();
    for (const img of existing) {
      await ctx.db.patch(img._id, { isPrimary: false });
    }

    await ctx.db.insert("profileImages", {
      profileId: profile._id,
      imageId,
      isPrimary: true,
    });

    return url;
  },
});

// Update FCM device token.
export const updateDeviceToken = mutation({
  args: { deviceToken: v.string() },
  handler: async (ctx, { deviceToken }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (profile) {
      await ctx.db.patch(profile._id, { deviceToken });
    }
  },
});

// View any profile by id (read-only, for network browsing).
export const getById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.deleteAccount) return null;

    const image = await ctx.db
      .query("profileImages")
      .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();

    const imgUrl = image ? (await ctx.db.get(image.imageId))?.url ?? null : null;

    return { ...profile, profileImageUrl: imgUrl };
  },
});

// Approve a downline member (called by the sponsor).
export const approveSponsor = mutation({
  args: { downlineProfileId: v.id("profiles") },
  handler: async (ctx, { downlineProfileId }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile) throw new Error("Caller profile not found");

    const target = await ctx.db.get(downlineProfileId);
    if (!target) throw new Error("Profile not found");
    if (!target.sponsorId || target.sponsorId !== callerProfile._id)
      throw new Error("You are not this member's sponsor");

    await ctx.db.patch(downlineProfileId, { sponsorApproved: true });

    // Rebuild hierarchy for the newly approved member
    await ctx.runMutation(internal.hierarchy.rebuildHierarchy, {
      profileId: downlineProfileId,
    });
  },
});

// Follow / unfollow another user.
export const toggleFollow = mutation({
  args: { targetProfileId: v.id("profiles") },
  handler: async (ctx, { targetProfileId }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile) throw new Error("Profile not found");

    const existing = await ctx.db
      .query("profileFollowers")
      .withIndex("by_followerId", (q) => q.eq("followerId", callerProfile._id))
      .filter((q) => q.eq(q.field("followingId"), targetProfileId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { following: false };
    } else {
      await ctx.db.insert("profileFollowers", {
        followerId: callerProfile._id,
        followingId: targetProfileId,
      });
      return { following: true };
    }
  },
});

// Soft-delete own account.
export const requestDeleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      deleteAccount: true,
      deleteRequestDate: Date.now(),
    });
  },
});

// Get list of all profiles (admin use).
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("deleteAccount"), false))
      .collect();
  },
});

// Get pending sponsor approvals for the current user.
export const pendingApprovals = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile) return [];

    return await ctx.db
      .query("profiles")
      .withIndex("by_sponsorId", (q) => q.eq("sponsorId", callerProfile._id))
      .filter((q) => q.eq(q.field("sponsorApproved"), false))
      .collect();
  },
});

// List all user ranks (for dropdowns).
export const listRanks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userRanks").collect();
  },
});
