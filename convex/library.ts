import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseLevel } from "./hierarchy";
import { countEngagement, isEngagedBy } from "./engagements";

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

export const listDivisions = query({
  args: {},
  handler: async (ctx) => {
    // Rows with a `sqlId` predate this feature (migrated from the legacy
    // Nu Skin product catalog) and are excluded from the Directory picker —
    // their posts stay in place, just not reachable via category browsing.
    const divisions = await ctx.db.query("divisions").collect();
    return divisions.filter((d) => d.sqlId === undefined);
  },
});

// Directory only ever deals in "library"-scoped categories (or legacy rows
// with no scope set, which predate the field and are all Library categories).
// Knowledge Hub categories (scope "knowledgeHub") must never leak in here —
// that's what caused the Category picker mixup in Create Library Item.
function isDirectoryScoped(c: { scope?: string }) {
  return (c.scope ?? "library") !== "knowledgeHub";
}

export const listCategories = query({
  args: { divisionId: v.optional(v.id("divisions")) },
  handler: async (ctx, { divisionId }) => {
    if (divisionId) {
      const categories = await ctx.db
        .query("categories")
        .withIndex("by_divisionId", (q) => q.eq("divisionId", divisionId))
        .collect();
      return categories.filter((c) => c.sqlId === undefined && isDirectoryScoped(c));
    }
    const categories = await ctx.db.query("categories").collect();
    return categories.filter((c) => c.sqlId === undefined && isDirectoryScoped(c));
  },
});

function matchesPreference(callerPrefs: string[], itemValues: string[]) {
  if (callerPrefs.length === 0) return true;
  if (itemValues.length === 0) return true;
  return itemValues.some((v) => callerPrefs.includes(v));
}

async function languagesFor(ctx: any, libraryItemId: Id<"libraryItems">) {
  const rows = await ctx.db
    .query("libraryLanguages")
    .withIndex("by_libraryItemId", (q: any) => q.eq("libraryItemId", libraryItemId))
    .collect();
  return rows.map((r: any) => r.language);
}

async function marketsFor(ctx: any, libraryItemId: Id<"libraryItems">) {
  const rows = await ctx.db
    .query("libraryMarkets")
    .withIndex("by_libraryItemId", (q: any) => q.eq("libraryItemId", libraryItemId))
    .collect();
  return rows.map((r: any) => r.market);
}

export const listItems = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
    sortBy: v.optional(
      v.union(v.literal("recent"), v.literal("liked"), v.literal("starred"))
    ),
  },
  handler: async (ctx, { categoryId, type, limit = 30, sortBy = "recent" }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile || callerProfile.deleteAccount || callerProfile.isDisabled) return [];

    const callerLanguages = (
      await ctx.db
        .query("profileLanguages")
        .withIndex("by_profileId", (q) => q.eq("profileId", callerProfile._id))
        .collect()
    ).map((r) => r.language);
    const callerMarkets = (
      await ctx.db
        .query("profileMarkets")
        .withIndex("by_profileId", (q) => q.eq("profileId", callerProfile._id))
        .collect()
    ).map((r) => r.market);

    let itemIds: Set<Id<"libraryItems">>;
    if (callerProfile.fullAccess) {
      // Full-access accounts see every library item regardless of visibility records.
      const all = await ctx.db
        .query("libraryItems")
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
      itemIds = new Set(all.map((i) => i._id));
    } else {
      const visibilities = await ctx.db
        .query("libraryVisibilities")
        .withIndex("by_userId", (q) => q.eq("userId", callerProfile._id))
        .collect();
      itemIds = new Set(visibilities.map((v) => v.libraryItemId));

      // Also own items
      const ownItems = await ctx.db
        .query("libraryItems")
        .withIndex("by_userId", (q) => q.eq("userId", callerProfile._id))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
      for (const item of ownItems) itemIds.add(item._id);
    }

    const now = Date.now();
    const results = [];
    for (const itemId of itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item || item.isDeleted) continue;
      // Scheduled (future-dated) items stay hidden from everyone but their author until due.
      if (item.postDate > now && item.userId !== callerProfile._id && !callerProfile.fullAccess) continue;
      if (categoryId && !item.categoryIds.includes(categoryId)) continue;
      if (type && item.type !== type) continue;
      const itemLanguages = await languagesFor(ctx, item._id);
      const itemMarkets = await marketsFor(ctx, item._id);
      if (!matchesPreference(callerLanguages, itemLanguages)) continue;
      if (!matchesPreference(callerMarkets, itemMarkets)) continue;

      const creator = await ctx.db.get(item.userId);
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

      const likeCount = await countEngagement(ctx, "libraryItem", item._id, "Like");
      const starCount = await countEngagement(ctx, "libraryItem", item._id, "Star");
      const isLiked = await isEngagedBy(ctx, "libraryItem", item._id, "Like", callerProfile._id);
      const isStarred = await isEngagedBy(ctx, "libraryItem", item._id, "Star", callerProfile._id);
      const commentCount = (
        await ctx.db
          .query("libraryItemMetas")
          .withIndex("by_libraryItemId", (q) => q.eq("libraryItemId", item._id))
          .collect()
      ).filter((m) => m.type === "Comment").length;

      results.push({
        ...item,
        creatorNickName: creator?.nickName ?? "",
        creatorProfileImageUrl,
        languages: itemLanguages,
        markets: itemMarkets,
        likeCount,
        starCount,
        isLiked,
        isStarred,
        commentCount,
      });
    }

    if (sortBy === "liked") {
      results.sort((a, b) => b.likeCount - a.likeCount || b.postDate - a.postDate);
    } else if (sortBy === "starred") {
      results.sort((a, b) => b.starCount - a.starCount || b.postDate - a.postDate);
    } else {
      results.sort((a, b) => b.postDate - a.postDate);
    }
    return results.slice(0, limit);
  },
});

export const getItem = query({
  args: { itemId: v.id("libraryItems") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.isDeleted) return null;

    const authUserId = await getAuthUserId(ctx);
    const callerProfile = authUserId
      ? await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", authUserId))
          .first()
      : null;

    // Scheduled (future-dated) items stay hidden from everyone but their
    // author until due — mirrors the gating in `listItems`.
    const isOwnerCaller = callerProfile ? item.userId === callerProfile._id : false;
    if (item.postDate > Date.now() && !isOwnerCaller && !callerProfile?.fullAccess) return null;

    const creator = await ctx.db.get(item.userId);
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
      .query("libraryImages")
      .withIndex("by_libraryItemId", (q) => q.eq("libraryItemId", itemId))
      .collect();
    const imageUrls: string[] = [];
    for (const li of images.sort((a, b) => a.order - b.order)) {
      const img = await ctx.db.get(li.imageId);
      if (img) imageUrls.push(img.url);
    }

    const docs = await ctx.db
      .query("libraryDocuments")
      .withIndex("by_libraryItemId", (q) => q.eq("libraryItemId", itemId))
      .collect();
    const docList = [];
    for (const ld of docs) {
      const doc = await ctx.db.get(ld.documentId);
      if (doc) docList.push(doc);
    }

    const metas = await ctx.db
      .query("libraryItemMetas")
      .withIndex("by_libraryItemId", (q) => q.eq("libraryItemId", itemId))
      .collect();

    const categories = (
      await Promise.all(item.categoryIds.map((id) => ctx.db.get(id)))
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      ...item,
      creatorNickName: creator?.nickName ?? "",
      creatorProfileImageUrl,
      categoryNames: categories.map((c) => c.name),
      languages: await languagesFor(ctx, itemId),
      markets: await marketsFor(ctx, itemId),
      images: imageUrls,
      documents: docList,
      likeCount: await countEngagement(ctx, "libraryItem", itemId, "Like"),
      endorseCount: metas.filter((m) => m.type === "Endorse").length,
      commentCount: metas.filter((m) => m.type === "Comment").length,
      starCount: await countEngagement(ctx, "libraryItem", itemId, "Star"),
      isLiked: callerProfile
        ? await isEngagedBy(ctx, "libraryItem", itemId, "Like", callerProfile._id)
        : false,
      isStarred: callerProfile
        ? await isEngagedBy(ctx, "libraryItem", itemId, "Star", callerProfile._id)
        : false,
    };
  },
});

const attachmentInput = v.object({
  storageId: v.id("_storage"),
  kind: v.union(v.literal("image"), v.literal("file")),
  fileName: v.optional(v.string()),
});

export const createLibraryItem = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    categoryIds: v.optional(v.array(v.id("categories"))),
    division: v.optional(v.string()),
    tag: v.optional(v.string()),
    languages: v.array(v.string()),
    markets: v.array(v.string()),
    chinaVideoLink: v.optional(v.string()),
    nonChinaVideoLink: v.optional(v.string()),
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

    if (args.languages.length === 0) throw new Error("Select at least one language to target.");
    if (args.markets.length === 0) throw new Error("Select at least one market to target.");

    for (const categoryId of args.categoryIds ?? []) {
      const category = await ctx.db.get(categoryId);
      if (!category || !isDirectoryScoped(category)) {
        throw new Error("Invalid category for Directory item");
      }
    }

    const itemId = await ctx.db.insert("libraryItems", {
      userId: profile._id,
      title: args.title,
      description: args.description,
      categoryIds: args.categoryIds ?? [],
      division: args.division,
      tag: args.tag,
      postDate: args.postDate ?? Date.now(),
      selectedZone: args.selectedZone,
      chinaVideoLink: args.chinaVideoLink,
      nonChinaVideoLink: args.nonChinaVideoLink,
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

    for (const language of args.languages) {
      await ctx.db.insert("libraryLanguages", { libraryItemId: itemId, language });
    }
    for (const market of args.markets) {
      await ctx.db.insert("libraryMarkets", { libraryItemId: itemId, market });
    }

    let imageOrder = 0;
    for (const a of args.attachments ?? []) {
      const url = await ctx.storage.getUrl(a.storageId);
      if (!url) continue;
      if (a.kind === "image") {
        const imageId = await ctx.db.insert("images", { userId: profile._id, url, storageId: a.storageId });
        await ctx.db.insert("libraryImages", { libraryItemId: itemId, imageId, order: imageOrder++ });
      } else {
        const documentId = await ctx.db.insert("documents", {
          userId: profile._id,
          name: a.fileName ?? "File",
          url,
          storageId: a.storageId,
        });
        await ctx.db.insert("libraryDocuments", { libraryItemId: itemId, documentId });
      }
    }

    // Distribute visibility (same logic as posts/events)
    const maxLevelNum = parseLevel(args.maxLevel);
    const minLevelNum = parseLevel(args.minLevel);
    const recipientIds = new Set<string>();
    recipientIds.add(profile._id);

    if (args.toUpline) {
      const upline = await ctx.runQuery(internal.hierarchy.getUplineIds, {
        profileId: profile._id,
        maxLevel: maxLevelNum,
      });
      for (const { userId } of upline) recipientIds.add(userId);
    }
    if (args.toDownline) {
      const downline = await ctx.runQuery(internal.hierarchy.getDownlineIds, {
        profileId: profile._id,
        maxLevel: minLevelNum,
      });
      for (const { userId } of downline) recipientIds.add(userId);
    }
    if (args.toSelectGroup && args.groupId) {
      const groupUsers = await ctx.db
        .query("groupUsers")
        .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId!))
        .collect();
      for (const gu of groupUsers) recipientIds.add(gu.userId);
    }

    for (const userId of recipientIds) {
      const profileId = userId as Id<"profiles">;
      const existing = await ctx.db
        .query("libraryVisibilities")
        .withIndex("by_libraryItemId_userId", (q) =>
          q.eq("libraryItemId", itemId).eq("userId", profileId)
        )
        .first();
      if (!existing) {
        await ctx.db.insert("libraryVisibilities", {
          libraryItemId: itemId,
          userId: profileId,
          isRead: profileId === profile._id,
        });
      }
    }

    return itemId;
  },
});

export const deleteLibraryItem = mutation({
  args: { itemId: v.id("libraryItems") },
  handler: async (ctx, { itemId }) => {
    const profile = await getCallerProfile(ctx);
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Item not found");
    if (item.userId !== profile._id) throw new Error("Not authorized");
    await ctx.db.patch(itemId, { isDeleted: true });
  },
});

export const listComments = query({
  args: { itemId: v.id("libraryItems") },
  handler: async (ctx, { itemId }) => {
    const metas = await ctx.db
      .query("libraryItemMetas")
      .withIndex("by_libraryItemId", (q) => q.eq("libraryItemId", itemId))
      .collect();
    const comments = metas
      .filter((m) => m.type === "Comment")
      .sort((a, b) => (a.commentDate ?? 0) - (b.commentDate ?? 0));

    const results = [];
    for (const c of comments) {
      const commenter = await ctx.db.get(c.userId);
      const commenterImage = commenter
        ? await ctx.db
            .query("profileImages")
            .withIndex("by_profileId", (q) => q.eq("profileId", commenter._id))
            .filter((q) => q.eq(q.field("isPrimary"), true))
            .first()
        : null;
      const commenterProfileImageUrl = commenterImage
        ? (await ctx.db.get(commenterImage.imageId))?.url ?? null
        : null;

      const imageRows = await ctx.db
        .query("libraryCommentImages")
        .withIndex("by_commentId", (q) => q.eq("commentId", c._id))
        .collect();
      const fileRows = await ctx.db
        .query("libraryCommentFiles")
        .withIndex("by_commentId", (q) => q.eq("commentId", c._id))
        .collect();
      const attachments: Array<{ kind: "image" | "file"; url: string; name?: string }> = [];
      for (const row of imageRows.sort((a, b) => a.order - b.order)) {
        const img = await ctx.db.get(row.imageId);
        if (img) attachments.push({ kind: "image", url: img.url });
      }
      for (const row of fileRows.sort((a, b) => a.order - b.order)) {
        const doc = await ctx.db.get(row.documentId);
        if (doc) attachments.push({ kind: "file", url: doc.url, name: doc.name });
      }

      results.push({
        _id: c._id,
        comment: c.comment ?? "",
        commentDate: c.commentDate ?? 0,
        commenterNickName: commenter?.nickName ?? "",
        commenterProfileImageUrl,
        attachments,
      });
    }
    return results;
  },
});

const commentAttachmentInput = v.object({
  storageId: v.id("_storage"),
  kind: v.union(v.literal("image"), v.literal("file")),
  fileName: v.optional(v.string()),
});

export const addComment = mutation({
  args: {
    itemId: v.id("libraryItems"),
    comment: v.string(),
    attachments: v.optional(v.array(commentAttachmentInput)),
  },
  handler: async (ctx, { itemId, comment, attachments }) => {
    const profile = await getCallerProfile(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.isDeleted) throw new Error("Item not found");
    if (!comment.trim()) throw new Error("Comment cannot be empty");

    const commentId = await ctx.db.insert("libraryItemMetas", {
      libraryItemId: itemId,
      userId: profile._id,
      type: "Comment",
      comment,
      commentDate: Date.now(),
    });

    let order = 0;
    for (const a of attachments ?? []) {
      const url = await ctx.storage.getUrl(a.storageId);
      if (!url) continue;
      if (a.kind === "image") {
        const imageId = await ctx.db.insert("images", { userId: profile._id, url, storageId: a.storageId });
        await ctx.db.insert("libraryCommentImages", { commentId, imageId, order: order++ });
      } else {
        const documentId = await ctx.db.insert("documents", {
          userId: profile._id,
          name: a.fileName ?? "File",
          url,
          storageId: a.storageId,
        });
        await ctx.db.insert("libraryCommentFiles", { commentId, documentId, order: order++ });
      }
    }

    return commentId;
  },
});
