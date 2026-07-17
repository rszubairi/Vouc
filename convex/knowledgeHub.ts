import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseLevel } from "./hierarchy";
import { countEngagement, isEngagedBy } from "./engagements";

// Knowledge Hub's own item store — separate from Directory's libraryItems
// table so the two modules can never cross-contaminate data or routes.

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

function isKnowledgeHubScoped(c: { scope?: string }) {
  return c.scope === "knowledgeHub";
}

export const listItems = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
    sortBy: v.optional(
      v.union(v.literal("recent"), v.literal("liked"), v.literal("starred"))
    ),
  },
  handler: async (ctx, { categoryId, limit = 30, sortBy = "recent" }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile || callerProfile.deleteAccount || callerProfile.isDisabled) return [];

    let itemIds: Set<Id<"knowledgeHubItems">>;
    if (callerProfile.fullAccess) {
      const all = await ctx.db
        .query("knowledgeHubItems")
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
      itemIds = new Set(all.map((i) => i._id));
    } else {
      const visibilities = await ctx.db
        .query("knowledgeHubVisibilities")
        .withIndex("by_userId", (q) => q.eq("userId", callerProfile._id))
        .collect();
      itemIds = new Set(visibilities.map((v) => v.knowledgeHubItemId));

      const ownItems = await ctx.db
        .query("knowledgeHubItems")
        .withIndex("by_userId", (q) => q.eq("userId", callerProfile._id))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
      for (const item of ownItems) itemIds.add(item._id);
    }

    const results = [];
    for (const itemId of itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item || item.isDeleted) continue;
      if (categoryId && !item.categoryIds.includes(categoryId)) continue;

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

      const likeCount = await countEngagement(ctx, "knowledgeHubItem", item._id, "Like");
      const starCount = await countEngagement(ctx, "knowledgeHubItem", item._id, "Star");
      const isLiked = await isEngagedBy(ctx, "knowledgeHubItem", item._id, "Like", callerProfile._id);
      const isStarred = await isEngagedBy(ctx, "knowledgeHubItem", item._id, "Star", callerProfile._id);

      results.push({
        ...item,
        creatorNickName: creator?.nickName ?? "",
        creatorProfileImageUrl,
        likeCount,
        starCount,
        isLiked,
        isStarred,
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
  args: { itemId: v.id("knowledgeHubItems") },
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
      .query("knowledgeHubImages")
      .withIndex("by_knowledgeHubItemId", (q) => q.eq("knowledgeHubItemId", itemId))
      .collect();
    const imageUrls: string[] = [];
    for (const li of images.sort((a, b) => a.order - b.order)) {
      const img = await ctx.db.get(li.imageId);
      if (img) imageUrls.push(img.url);
    }

    const docs = await ctx.db
      .query("knowledgeHubDocuments")
      .withIndex("by_knowledgeHubItemId", (q) => q.eq("knowledgeHubItemId", itemId))
      .collect();
    const docList = [];
    for (const ld of docs) {
      const doc = await ctx.db.get(ld.documentId);
      if (doc) docList.push(doc);
    }

    const metas = await ctx.db
      .query("knowledgeHubItemMetas")
      .withIndex("by_knowledgeHubItemId", (q) => q.eq("knowledgeHubItemId", itemId))
      .collect();

    const categories = (
      await Promise.all(item.categoryIds.map((id) => ctx.db.get(id)))
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      ...item,
      creatorNickName: creator?.nickName ?? "",
      creatorProfileImageUrl,
      categoryNames: categories.map((c) => c.name),
      images: imageUrls,
      documents: docList,
      likeCount: await countEngagement(ctx, "knowledgeHubItem", itemId, "Like"),
      endorseCount: metas.filter((m) => m.type === "Endorse").length,
      commentCount: metas.filter((m) => m.type === "Comment").length,
      starCount: await countEngagement(ctx, "knowledgeHubItem", itemId, "Star"),
      isLiked: callerProfile
        ? await isEngagedBy(ctx, "knowledgeHubItem", itemId, "Like", callerProfile._id)
        : false,
      isStarred: callerProfile
        ? await isEngagedBy(ctx, "knowledgeHubItem", itemId, "Star", callerProfile._id)
        : false,
    };
  },
});

const attachmentInput = v.object({
  storageId: v.id("_storage"),
  kind: v.union(v.literal("image"), v.literal("file")),
  fileName: v.optional(v.string()),
});

export const createItem = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    categoryIds: v.optional(v.array(v.id("categories"))),
    nonChinaVideoLink: v.optional(v.string()),
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

    for (const categoryId of args.categoryIds ?? []) {
      const category = await ctx.db.get(categoryId);
      if (!category || !isKnowledgeHubScoped(category)) {
        throw new Error("Invalid category for Knowledge Hub item");
      }
    }

    const itemId = await ctx.db.insert("knowledgeHubItems", {
      userId: profile._id,
      title: args.title,
      description: args.description,
      categoryIds: args.categoryIds ?? [],
      postDate: Date.now(),
      nonChinaVideoLink: args.nonChinaVideoLink,
      allowRetweet: args.allowRetweet,
      mustRead: args.mustRead,
      isDeleted: false,
      toUpline: args.toUpline,
      toDownline: args.toDownline,
      toSelectGroup: args.toSelectGroup,
      groupId: args.groupId,
      toCustom: args.toCustom,
      minLevel: args.minLevel,
      maxLevel: args.maxLevel,
      minRank: args.minRank,
    });

    let imageOrder = 0;
    for (const a of args.attachments ?? []) {
      const url = await ctx.storage.getUrl(a.storageId);
      if (!url) continue;
      if (a.kind === "image") {
        const imageId = await ctx.db.insert("images", { userId: profile._id, url, storageId: a.storageId });
        await ctx.db.insert("knowledgeHubImages", { knowledgeHubItemId: itemId, imageId, order: imageOrder++ });
      } else {
        const documentId = await ctx.db.insert("documents", {
          userId: profile._id,
          name: a.fileName ?? "File",
          url,
          storageId: a.storageId,
        });
        await ctx.db.insert("knowledgeHubDocuments", { knowledgeHubItemId: itemId, documentId });
      }
    }

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
        .query("knowledgeHubVisibilities")
        .withIndex("by_knowledgeHubItemId_userId", (q) =>
          q.eq("knowledgeHubItemId", itemId).eq("userId", profileId)
        )
        .first();
      if (!existing) {
        await ctx.db.insert("knowledgeHubVisibilities", {
          knowledgeHubItemId: itemId,
          userId: profileId,
          isRead: profileId === profile._id,
        });
      }
    }

    return itemId;
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("knowledgeHubItems") },
  handler: async (ctx, { itemId }) => {
    const profile = await getCallerProfile(ctx);
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Item not found");
    if (item.userId !== profile._id) throw new Error("Not authorized");
    await ctx.db.patch(itemId, { isDeleted: true });
  },
});
