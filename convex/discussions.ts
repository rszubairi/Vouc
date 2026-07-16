import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseLevel } from "./hierarchy";
import { countEngagement, isEngagedBy } from "./engagements";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Compute and insert DiscussionVisibility records based on distribution flags.
async function distributeDiscussion(
  ctx: any,
  discussionId: Id<"discussions">,
  creatorProfile: any,
  discussion: {
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

  const maxLevelNum = parseLevel(discussion.maxLevel);
  const minLevelNum = parseLevel(discussion.minLevel);

  if (discussion.toUpline) {
    const upline: Array<{ userId: Id<"profiles">; level: number }> =
      await ctx.runQuery(internal.hierarchy.getUplineIds, {
        profileId: creatorProfile._id,
        maxLevel: maxLevelNum,
      });
    for (const { userId } of upline) recipientIds.add(userId);
  }

  if (discussion.toDownline) {
    const downline: Array<{ userId: Id<"profiles">; level: number }> =
      await ctx.runQuery(internal.hierarchy.getDownlineIds, {
        profileId: creatorProfile._id,
        maxLevel: minLevelNum, // confusingly, minLevel on discussion = how deep downline goes
      });
    for (const { userId } of downline) recipientIds.add(userId);
  }

  if (discussion.toSelectGroup && discussion.groupId) {
    const groupUsers = await ctx.db
      .query("groupUsers")
      .withIndex("by_groupId", (q: any) => q.eq("groupId", discussion.groupId))
      .collect();
    for (const gu of groupUsers) recipientIds.add(gu.userId);
  }

  // Rank filtering
  let minRankOrder: number | undefined;
  if (discussion.minRank) {
    const rank = await ctx.db
      .query("userRanks")
      .filter((q: any) => q.eq(q.field("name"), discussion.minRank))
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
      .query("discussionVisibilities")
      .withIndex("by_discussionId_userId", (q: any) =>
        q.eq("discussionId", discussionId).eq("userId", profileId)
      )
      .first();
    if (!existing) {
      await ctx.db.insert("discussionVisibilities", {
        discussionId,
        userId: profileId,
        isRead: profileId === creatorProfile._id,
      });
    }
  }
}

async function attachmentsFor(ctx: any, discussionId: Id<"discussions">) {
  const imageRows = await ctx.db
    .query("discussionImages")
    .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
    .collect();
  const fileRows = await ctx.db
    .query("discussionFiles")
    .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
    .collect();

  const attachments: Array<{ kind: "image" | "file"; url: string; name?: string; order: number }> = [];
  for (const row of imageRows) {
    const img = await ctx.db.get(row.imageId);
    if (img) attachments.push({ kind: "image", url: img.url, order: row.order });
  }
  for (const row of fileRows) {
    const doc = await ctx.db.get(row.documentId);
    if (doc) attachments.push({ kind: "file", url: doc.url, name: doc.name, order: row.order });
  }
  attachments.sort((a, b) => a.order - b.order);
  return attachments;
}

async function tagsFor(ctx: any, discussionId: Id<"discussions">) {
  const rows = await ctx.db
    .query("discussionTags")
    .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
    .collect();
  return rows.map((r: any) => r.tag);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

// List/search discussions visible to the current user, newest-first by default.
export const list = query({
  args: {
    limit: v.optional(v.number()),
    keyword: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    authorId: v.optional(v.id("profiles")),
    status: v.optional(v.union(v.literal("Open"), v.literal("Closed"))),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    sort: v.optional(
      v.union(v.literal("recent"), v.literal("active"), v.literal("liked"), v.literal("starred"))
    ),
  },
  handler: async (ctx, args) => {
    const { limit = 30, keyword, categoryId, authorId, status, dateFrom, dateTo, sort = "recent" } = args;

    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile || callerProfile.deleteAccount || callerProfile.isDisabled) return [];

    let allIds: Set<Id<"discussions">>;
    let visibilities: Array<{ discussionId: Id<"discussions">; isRead: boolean }>;

    if (callerProfile.fullAccess) {
      const all = await ctx.db
        .query("discussions")
        .filter((q: any) => q.eq(q.field("isDeleted"), false))
        .collect();
      allIds = new Set(all.map((d: any) => d._id));
      visibilities = [];
    } else {
      visibilities = await ctx.db
        .query("discussionVisibilities")
        .withIndex("by_userId", (q: any) => q.eq("userId", callerProfile._id))
        .collect();

      const ownDiscussions = await ctx.db
        .query("discussions")
        .withIndex("by_userId", (q: any) => q.eq("userId", callerProfile._id))
        .filter((q: any) => q.eq(q.field("isDeleted"), false))
        .collect();

      allIds = new Set([
        ...visibilities.map((v: any) => v.discussionId),
        ...ownDiscussions.map((d: any) => d._id),
      ]);
    }

    // Fetch and apply filters
    const now = Date.now();
    let discussions = [];
    for (const id of allIds) {
      const d = await ctx.db.get(id);
      if (!d || d.isDeleted) continue;
      // Scheduled (future-dated) posts stay hidden from everyone but their author until due.
      if (d.postDate > now && d.userId !== callerProfile._id) continue;
      if (categoryId && d.categoryId !== categoryId) continue;
      if (authorId && d.userId !== authorId) continue;
      if (status && d.status !== status) continue;
      if (dateFrom !== undefined && d.postDate < dateFrom) continue;
      if (dateTo !== undefined && d.postDate > dateTo) continue;
      discussions.push(d);
    }

    if (keyword?.trim()) {
      const q = keyword.trim().toLowerCase();
      const creatorCache = new Map<string, any>();
      const filtered = [];
      for (const d of discussions) {
        if (d.topic?.toLowerCase().includes(q) || d.details?.toLowerCase().includes(q)) {
          filtered.push(d);
          continue;
        }
        if (!creatorCache.has(d.userId)) creatorCache.set(d.userId, await ctx.db.get(d.userId));
        const creator = creatorCache.get(d.userId);
        if (creator?.nickName?.toLowerCase().includes(q)) filtered.push(d);
      }
      discussions = filtered;
    }

    // Attach metadata
    const result = [];
    for (const d of discussions) {
      const creator = await ctx.db.get(d.userId);
      const creatorImage = creator
        ? await ctx.db
            .query("profileImages")
            .withIndex("by_profileId", (q: any) => q.eq("profileId", creator._id))
            .filter((q: any) => q.eq(q.field("isPrimary"), true))
            .first()
        : null;
      const creatorProfileImageUrl = creatorImage
        ? (await ctx.db.get(creatorImage.imageId))?.url ?? null
        : null;

      const category = d.categoryId ? await ctx.db.get(d.categoryId) : null;
      const attachments = await attachmentsFor(ctx, d._id);
      const tags = await tagsFor(ctx, d._id);

      const metas = await ctx.db
        .query("discussionMetas")
        .withIndex("by_discussionId", (q: any) => q.eq("discussionId", d._id))
        .collect();
      const replies = await ctx.db
        .query("discussionReplies")
        .withIndex("by_discussionId", (q: any) => q.eq("discussionId", d._id))
        .filter((q: any) => q.eq(q.field("isDeleted"), false))
        .collect();

      const visibility = visibilities.find((v: any) => v.discussionId === d._id);
      const isRead = visibility?.isRead ?? true;

      const likeCount = metas.filter((m: any) => m.type === "Like").length;
      const endorseCount = metas.filter((m: any) => m.type === "Endorse").length;
      const replyCount = replies.length;
      const starCount = await countEngagement(ctx, "discussion", d._id, "Star");
      const isStarred = await isEngagedBy(ctx, "discussion", d._id, "Star", callerProfile._id);

      result.push({
        ...d,
        creatorNickName: creator?.nickName ?? "",
        creatorProfileImageUrl,
        categoryName: category?.name ?? null,
        tags,
        attachments,
        images: attachments.filter((a) => a.kind === "image").map((a) => a.url),
        likeCount,
        endorseCount,
        replyCount,
        starCount,
        isStarred,
        isRead,
        isOwner: d.userId === callerProfile._id,
        isLiked: metas.some((m: any) => m.userId === callerProfile._id && m.type === "Like"),
        isEndorsed: metas.some((m: any) => m.userId === callerProfile._id && m.type === "Endorse"),
        activityScore: likeCount + endorseCount + replyCount,
      });
    }

    if (sort === "active") {
      result.sort((a, b) => b.activityScore - a.activityScore || b.postDate - a.postDate);
    } else if (sort === "liked") {
      result.sort((a, b) => b.likeCount - a.likeCount || b.postDate - a.postDate);
    } else if (sort === "starred") {
      result.sort((a, b) => b.starCount - a.starCount || b.postDate - a.postDate);
    } else {
      result.sort((a, b) => b.postDate - a.postDate);
    }

    return result.slice(0, limit);
  },
});

// Full detail of a single discussion.
export const getDiscussion = query({
  args: { discussionId: v.id("discussions") },
  handler: async (ctx, { discussionId }) => {
    const discussion = await ctx.db.get(discussionId);
    if (!discussion || discussion.isDeleted) return null;

    const authUserId = await getAuthUserId(ctx);
    const callerProfile = authUserId
      ? await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", authUserId))
          .first()
      : null;

    const creator = await ctx.db.get(discussion.userId);
    const creatorImage = creator
      ? await ctx.db
          .query("profileImages")
          .withIndex("by_profileId", (q: any) => q.eq("profileId", creator._id))
          .filter((q: any) => q.eq(q.field("isPrimary"), true))
          .first()
      : null;
    const creatorImageUrl = creatorImage ? (await ctx.db.get(creatorImage.imageId))?.url : null;

    const category = discussion.categoryId ? await ctx.db.get(discussion.categoryId) : null;
    const attachments = await attachmentsFor(ctx, discussionId);
    const tags = await tagsFor(ctx, discussionId);

    const metas = await ctx.db
      .query("discussionMetas")
      .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
      .collect();

    const replyDocs = await ctx.db
      .query("discussionReplies")
      .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
      .filter((q: any) => q.eq(q.field("isDeleted"), false))
      .collect();

    const replies = [];
    for (const r of replyDocs.sort((a: any, b: any) => a.replyDate - b.replyDate)) {
      const replier = await ctx.db.get(r.userId);
      const imageRows = await ctx.db
        .query("discussionReplyImages")
        .withIndex("by_replyId", (q: any) => q.eq("replyId", r._id))
        .collect();
      const fileRows = await ctx.db
        .query("discussionReplyFiles")
        .withIndex("by_replyId", (q: any) => q.eq("replyId", r._id))
        .collect();
      const replyAttachments: Array<{ kind: "image" | "file"; url: string; name?: string }> = [];
      for (const row of imageRows) {
        const img = await ctx.db.get(row.imageId);
        if (img) replyAttachments.push({ kind: "image", url: img.url });
      }
      for (const row of fileRows) {
        const doc = await ctx.db.get(row.documentId);
        if (doc) replyAttachments.push({ kind: "file", url: doc.url, name: doc.name });
      }
      replies.push({
        ...r,
        replierNickName: replier?.nickName ?? "",
        attachments: replyAttachments,
      });
    }

    const followers = await ctx.db
      .query("discussionFollowers")
      .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
      .collect();

    return {
      ...discussion,
      creator: { ...creator, profileImageUrl: creatorImageUrl },
      categoryName: category?.name ?? null,
      tags,
      attachments,
      images: attachments.filter((a) => a.kind === "image").map((a) => a.url),
      likeCount: metas.filter((m: any) => m.type === "Like").length,
      endorseCount: metas.filter((m: any) => m.type === "Endorse").length,
      replies,
      isOwner: callerProfile ? discussion.userId === callerProfile._id : false,
      isAdmin: callerProfile ? !!callerProfile.isAdmin : false,
      isLiked: callerProfile
        ? metas.some((m: any) => m.userId === callerProfile._id && m.type === "Like")
        : false,
      isEndorsed: callerProfile
        ? metas.some((m: any) => m.userId === callerProfile._id && m.type === "Endorse")
        : false,
      starCount: await countEngagement(ctx, "discussion", discussionId, "Star"),
      isStarred: callerProfile
        ? await isEngagedBy(ctx, "discussion", discussionId, "Star", callerProfile._id)
        : false,
      isFollowing: callerProfile
        ? followers.some((f: any) => f.followerId === callerProfile._id)
        : false,
      followerCount: followers.length,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

const attachmentInput = v.object({
  storageId: v.id("_storage"),
  kind: v.union(v.literal("image"), v.literal("file")),
  fileName: v.optional(v.string()),
});

async function saveAttachments(
  ctx: any,
  profileId: Id<"profiles">,
  attachments: Array<{ storageId: Id<"_storage">; kind: "image" | "file"; fileName?: string }> | undefined,
  insertLink: (kind: "image" | "file", refId: any, order: number) => Promise<void>
) {
  if (!attachments) return;
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    const url = await ctx.storage.getUrl(a.storageId);
    if (!url) continue;
    if (a.kind === "image") {
      const imageId = await ctx.db.insert("images", { userId: profileId, url, storageId: a.storageId });
      await insertLink("image", imageId, i);
    } else {
      const documentId = await ctx.db.insert("documents", {
        userId: profileId,
        name: a.fileName ?? "File",
        url,
        storageId: a.storageId,
      });
      await insertLink("file", documentId, i);
    }
  }
}

export const createDiscussion = mutation({
  args: {
    topic: v.optional(v.string()),
    details: v.string(),
    chinaVideoLink: v.optional(v.string()),
    nonChinaVideoLink: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    tags: v.optional(v.array(v.string())),
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
    attachments: v.optional(v.array(attachmentInput)),
  },
  handler: async (ctx, args) => {
    const profile = await getCallerProfile(ctx);

    const discussionId = await ctx.db.insert("discussions", {
      userId: profile._id,
      topic: args.topic,
      details: args.details,
      chinaVideoLink: args.chinaVideoLink,
      nonChinaVideoLink: args.nonChinaVideoLink,
      categoryId: args.categoryId,
      status: "Open",
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

    await saveAttachments(ctx, profile._id, args.attachments, async (kind, refId, order) => {
      if (kind === "image") {
        await ctx.db.insert("discussionImages", { discussionId, imageId: refId, order });
      } else {
        await ctx.db.insert("discussionFiles", { discussionId, documentId: refId, order });
      }
    });

    const seenTags = new Set<string>();
    for (const raw of args.tags ?? []) {
      const tag = raw.toLowerCase().trim();
      if (!tag || seenTags.has(tag)) continue;
      seenTags.add(tag);
      await ctx.db.insert("discussionTags", { discussionId, tag });
    }

    await distributeDiscussion(ctx, discussionId, profile, {
      toUpline: args.toUpline,
      toDownline: args.toDownline,
      toSelectGroup: args.toSelectGroup,
      groupId: args.groupId,
      toCustom: args.toCustom,
      minLevel: args.minLevel,
      maxLevel: args.maxLevel,
      minRank: args.minRank,
    });

    return discussionId;
  },
});

export const deleteDiscussion = mutation({
  args: { discussionId: v.id("discussions") },
  handler: async (ctx, { discussionId }) => {
    const profile = await getCallerProfile(ctx);
    const discussion = await ctx.db.get(discussionId);
    if (!discussion) throw new Error("Discussion not found");
    if (discussion.userId !== profile._id) throw new Error("Not authorized");
    await ctx.db.patch(discussionId, { isDeleted: true });
  },
});

// Owner-only open/close toggle.
export const updateStatus = mutation({
  args: {
    discussionId: v.id("discussions"),
    status: v.union(v.literal("Open"), v.literal("Closed")),
  },
  handler: async (ctx, { discussionId, status }) => {
    const profile = await getCallerProfile(ctx);
    const discussion = await ctx.db.get(discussionId);
    if (!discussion) throw new Error("Discussion not found");
    if (discussion.userId !== profile._id) throw new Error("Not authorized");
    await ctx.db.patch(discussionId, { status });
  },
});

// Add a reply, optionally with attachments. Blocked once the discussion is Closed.
export const addReply = mutation({
  args: {
    discussionId: v.id("discussions"),
    body: v.string(),
    attachments: v.optional(v.array(attachmentInput)),
  },
  handler: async (ctx, { discussionId, body, attachments }) => {
    const profile = await getCallerProfile(ctx);
    const discussion = await ctx.db.get(discussionId);
    if (!discussion || discussion.isDeleted) throw new Error("Discussion not found");
    if (discussion.status === "Closed") throw new Error("This discussion is closed to new replies");
    if (!body.trim()) throw new Error("Reply cannot be empty");

    const replyId = await ctx.db.insert("discussionReplies", {
      discussionId,
      userId: profile._id,
      body,
      isDeleted: false,
      replyDate: Date.now(),
    });

    await saveAttachments(ctx, profile._id, attachments, async (kind, refId, order) => {
      if (kind === "image") {
        await ctx.db.insert("discussionReplyImages", { replyId, imageId: refId, order });
      } else {
        await ctx.db.insert("discussionReplyFiles", { replyId, documentId: refId, order });
      }
    });

    const followers = await ctx.db
      .query("discussionFollowers")
      .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
      .collect();
    for (const follower of followers) {
      if (follower.followerId === profile._id) continue;
      await ctx.db.insert("pushNotifications", {
        userId: follower.followerId,
        subject: "New reply",
        message: `${profile.nickName} replied to a discussion you follow`,
        entity: "Discussion",
        entityId: discussionId,
        isRead: false,
      });
    }

    return replyId;
  },
});

// Toggle following a discussion for reply notifications.
export const toggleFollow = mutation({
  args: { discussionId: v.id("discussions") },
  handler: async (ctx, { discussionId }) => {
    const profile = await getCallerProfile(ctx);
    const existing = await ctx.db
      .query("discussionFollowers")
      .withIndex("by_discussionId_followerId", (q: any) =>
        q.eq("discussionId", discussionId).eq("followerId", profile._id)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { following: false };
    } else {
      await ctx.db.insert("discussionFollowers", { discussionId, followerId: profile._id });
      return { following: true };
    }
  },
});

// Like or Endorse a discussion. Toggle (upsert/delete).
export const engage = mutation({
  args: {
    discussionId: v.id("discussions"),
    type: v.union(v.literal("Like"), v.literal("Endorse")),
  },
  handler: async (ctx, { discussionId, type }) => {
    const profile = await getCallerProfile(ctx);

    const existing = await ctx.db
      .query("discussionMetas")
      .withIndex("by_discussionId_userId_type", (q: any) =>
        q.eq("discussionId", discussionId).eq("userId", profile._id).eq("type", type)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("discussionMetas", { discussionId, userId: profile._id, type });
    }
  },
});

// Mark a discussion as read.
export const markRead = mutation({
  args: { discussionId: v.id("discussions") },
  handler: async (ctx, { discussionId }) => {
    const profile = await getCallerProfile(ctx);
    const vis = await ctx.db
      .query("discussionVisibilities")
      .withIndex("by_discussionId_userId", (q: any) =>
        q.eq("discussionId", discussionId).eq("userId", profile._id)
      )
      .first();
    if (vis && !vis.isRead) {
      await ctx.db.patch(vis._id, { isRead: true });
    }
  },
});
