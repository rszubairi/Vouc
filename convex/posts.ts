import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseLevel } from "./hierarchy";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCallerProfile(ctx: any) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", authUserId))
    .first();
  if (!profile || profile.deleteAccount) throw new Error("Profile not found");
  return profile;
}

// Compute and insert PostVisibility records based on distribution flags.
async function distributePost(
  ctx: any,
  postId: Id<"posts">,
  creatorProfile: any,
  post: {
    toUpline: boolean;
    toDownline: boolean;
    toSelectGroup: boolean;
    groupId?: Id<"groups">;
    toCustom: boolean;
    minLevel?: string;
    maxLevel?: string;
    minRank?: string;
  }
) {
  const recipientIds = new Set<string>();

  // Creator always gets visibility
  recipientIds.add(creatorProfile._id);

  const maxLevelNum = parseLevel(post.maxLevel);
  const minLevelNum = parseLevel(post.minLevel);

  if (post.toUpline) {
    const upline: Array<{ userId: Id<"profiles">; level: number }> =
      await ctx.runQuery(internal.hierarchy.getUplineIds, {
        profileId: creatorProfile._id,
        maxLevel: maxLevelNum,
      });
    for (const { userId } of upline) recipientIds.add(userId);
  }

  if (post.toDownline) {
    const downline: Array<{ userId: Id<"profiles">; level: number }> =
      await ctx.runQuery(internal.hierarchy.getDownlineIds, {
        profileId: creatorProfile._id,
        maxLevel: minLevelNum, // confusingly, minLevel on post = how deep downline goes
      });
    for (const { userId } of downline) recipientIds.add(userId);
  }

  if (post.toSelectGroup && post.groupId) {
    const groupUsers = await ctx.db
      .query("groupUsers")
      .withIndex("by_groupId", (q: any) => q.eq("groupId", post.groupId))
      .collect();
    for (const gu of groupUsers) recipientIds.add(gu.userId);
  }

  // Rank filtering
  let minRankOrder: number | undefined;
  if (post.minRank) {
    const rank = await ctx.db
      .query("userRanks")
      .filter((q: any) => q.eq(q.field("name"), post.minRank))
      .first();
    minRankOrder = rank?.displayOrder;
  }

  for (const userId of recipientIds) {
    const profileId = userId as Id<"profiles">;

    // Apply rank filter
    if (minRankOrder !== undefined) {
      const recipientProfile = await ctx.db.get(profileId);
      if (recipientProfile?.userRankId) {
        const recipientRank = await ctx.db.get(recipientProfile.userRankId);
        if (recipientRank && recipientRank.displayOrder < minRankOrder) continue;
      } else {
        continue; // No rank assigned → below minimum
      }
    }

    // Check for existing record (idempotent)
    const existing = await ctx.db
      .query("postVisibilities")
      .withIndex("by_postId_userId", (q: any) =>
        q.eq("postId", postId).eq("userId", profileId)
      )
      .first();
    if (!existing) {
      await ctx.db.insert("postVisibilities", {
        postId,
        userId: profileId,
        isRead: profileId === creatorProfile._id,
      });
    }
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

// Feed: returns all posts visible to the current user, newest first.
export const feed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 30 }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile || callerProfile.deleteAccount) return [];

    let allIds: Set<Id<"posts">>;
    let visibilities: Array<{ postId: Id<"posts">; isRead: boolean }>;

    if (callerProfile.fullAccess) {
      // Full-access accounts see every post regardless of visibility records.
      const all = await ctx.db
        .query("posts")
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
      allIds = new Set(all.map((p) => p._id));
      visibilities = [];
    } else {
      // Get all visibility records for this user
      visibilities = await ctx.db
        .query("postVisibilities")
        .withIndex("by_userId", (q) => q.eq("userId", callerProfile._id))
        .collect();

      const postIds = visibilities.map((v) => v.postId);

      // Also include own posts (in case visibility wasn't created)
      const ownPosts = await ctx.db
        .query("posts")
        .withIndex("by_userId", (q) => q.eq("userId", callerProfile._id))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

      allIds = new Set([...postIds, ...ownPosts.map((p) => p._id)]);
    }

    // Fetch posts and sort by postDate descending
    const posts = [];
    for (const postId of allIds) {
      const post = await ctx.db.get(postId);
      if (!post || post.isDeleted) continue;
      posts.push(post);
    }

    posts.sort((a, b) => b.postDate - a.postDate);

    // Attach metadata
    const result = [];
    for (const post of posts.slice(0, limit)) {
      const creator = await ctx.db.get(post.userId);
      const creatorImage = creator
        ? await ctx.db
            .query("profileImages")
            .withIndex("by_profileId", (q) => q.eq("profileId", creator._id))
            .filter((q) => q.eq(q.field("isPrimary"), true))
            .first()
        : null;
      const creatorProfileImageUrl = creatorImage
        ? (await ctx.db.get(creatorImage.imageId))?.url ?? null
        : null;

      const images = await ctx.db
        .query("postImages")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .collect();
      const imageUrls: string[] = [];
      for (const pi of images.sort((a, b) => a.order - b.order)) {
        const img = await ctx.db.get(pi.imageId);
        if (img) imageUrls.push(img.url);
      }

      const metas = await ctx.db
        .query("postMetas")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .collect();

      const visibility = visibilities.find((v) => v.postId === post._id);
      const isRead = visibility?.isRead ?? true;

      result.push({
        ...post,
        creatorNickName: creator?.nickName ?? "",
        creatorProfileImageUrl,
        images: imageUrls,
        likeCount: metas.filter((m) => m.type === "Like").length,
        endorseCount: metas.filter((m) => m.type === "Endorse").length,
        commentCount: metas.filter((m) => m.type === "Comment").length,
        isRead,
        isOwner: post.userId === callerProfile._id,
      });
    }

    return result;
  },
});

// Full detail of a single post.
export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.isDeleted) return null;

    const authUserId = await getAuthUserId(ctx);
    const callerProfile = authUserId
      ? await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", authUserId))
          .first()
      : null;

    const creator = await ctx.db.get(post.userId);
    const creatorImage = creator
      ? await ctx.db
          .query("profileImages")
          .withIndex("by_profileId", (q) => q.eq("profileId", creator._id))
          .filter((q) => q.eq(q.field("isPrimary"), true))
          .first()
      : null;
    const creatorImageUrl = creatorImage
      ? (await ctx.db.get(creatorImage.imageId))?.url
      : null;

    const images = await ctx.db
      .query("postImages")
      .withIndex("by_postId", (q) => q.eq("postId", postId))
      .collect();
    const imageUrls: string[] = [];
    for (const pi of images.sort((a, b) => a.order - b.order)) {
      const img = await ctx.db.get(pi.imageId);
      if (img) imageUrls.push(img.url);
    }

    const metas = await ctx.db
      .query("postMetas")
      .withIndex("by_postId", (q) => q.eq("postId", postId))
      .collect();

    const comments = metas
      .filter((m) => m.type === "Comment")
      .map((m) => ({ ...m }));

    const commentProfiles: Record<string, any> = {};
    for (const c of comments) {
      if (!commentProfiles[c.userId]) {
        commentProfiles[c.userId] = await ctx.db.get(c.userId);
      }
    }

    return {
      ...post,
      creator: { ...creator, profileImageUrl: creatorImageUrl },
      images: imageUrls,
      likeCount: metas.filter((m) => m.type === "Like").length,
      endorseCount: metas.filter((m) => m.type === "Endorse").length,
      comments: comments.map((c) => ({
        ...c,
        commenterNickName: commentProfiles[c.userId]?.nickName ?? "",
      })),
      isOwner: callerProfile ? post.userId === callerProfile._id : false,
      isLiked: callerProfile
        ? metas.some((m) => m.userId === callerProfile._id && m.type === "Like")
        : false,
      isEndorsed: callerProfile
        ? metas.some((m) => m.userId === callerProfile._id && m.type === "Endorse")
        : false,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createPost = mutation({
  args: {
    topic: v.optional(v.string()),
    details: v.string(),
    chinaVideoLink: v.optional(v.string()),
    nonChinaVideoLink: v.optional(v.string()),
    tag: v.optional(v.string()),
    postDate: v.optional(v.number()),
    selectedZone: v.optional(v.string()),
    allowRetweet: v.boolean(),
    mustRead: v.boolean(),
    toUpline: v.boolean(),
    toDownline: v.boolean(),
    toSelectGroup: v.boolean(),
    groupId: v.optional(v.id("groups")),
    toCustom: v.boolean(),
    minLevel: v.optional(v.string()),
    maxLevel: v.optional(v.string()),
    minRank: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const profile = await getCallerProfile(ctx);

    const postId = await ctx.db.insert("posts", {
      userId: profile._id,
      topic: args.topic,
      details: args.details,
      chinaVideoLink: args.chinaVideoLink,
      nonChinaVideoLink: args.nonChinaVideoLink,
      tag: args.tag,
      postDate: args.postDate ?? Date.now(),
      selectedZone: args.selectedZone,
      allowRetweet: args.allowRetweet,
      mustRead: args.mustRead,
      isDeleted: false,
      superAccount: false,
      toUpline: args.toUpline,
      toDownline: args.toDownline,
      toSelectGroup: args.toSelectGroup,
      groupId: args.groupId,
      toCustom: args.toCustom,
      minLevel: args.minLevel,
      maxLevel: args.maxLevel,
      minRank: args.minRank,
    });

    // Save images
    if (args.imageUrls) {
      for (let i = 0; i < args.imageUrls.length; i++) {
        const imageId = await ctx.db.insert("images", {
          userId: profile._id,
          url: args.imageUrls[i],
        });
        await ctx.db.insert("postImages", { postId, imageId, order: i });
      }
    }

    // Distribute visibility
    await distributePost(ctx, postId, profile, {
      toUpline: args.toUpline,
      toDownline: args.toDownline,
      toSelectGroup: args.toSelectGroup,
      groupId: args.groupId,
      toCustom: args.toCustom,
      minLevel: args.minLevel,
      maxLevel: args.maxLevel,
      minRank: args.minRank,
    });

    return postId;
  },
});

export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const profile = await getCallerProfile(ctx);
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== profile._id) throw new Error("Not authorized");
    await ctx.db.patch(postId, { isDeleted: true });
  },
});

// Like, Endorse, or Comment on a post. Like/Endorse are toggle (upsert).
export const engage = mutation({
  args: {
    postId: v.id("posts"),
    type: v.union(v.literal("Like"), v.literal("Endorse"), v.literal("Comment")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { postId, type, comment }) => {
    const profile = await getCallerProfile(ctx);

    if (type === "Comment") {
      if (!comment?.trim()) throw new Error("Comment cannot be empty");
      await ctx.db.insert("postMetas", {
        postId,
        userId: profile._id,
        type,
        comment,
      });
      return;
    }

    // Toggle for Like / Endorse
    const existing = await ctx.db
      .query("postMetas")
      .withIndex("by_postId_userId_type", (q) =>
        q.eq("postId", postId).eq("userId", profile._id).eq("type", type)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("postMetas", { postId, userId: profile._id, type });
    }
  },
});

// Mark a post as read.
export const markRead = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const profile = await getCallerProfile(ctx);
    const vis = await ctx.db
      .query("postVisibilities")
      .withIndex("by_postId_userId", (q) =>
        q.eq("postId", postId).eq("userId", profile._id)
      )
      .first();
    if (vis && !vis.isRead) {
      await ctx.db.patch(vis._id, { isRead: true });
    }
  },
});
