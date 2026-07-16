import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseLevel } from "./hierarchy";

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

export const listDivisions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("divisions").collect();
  },
});

export const listCategories = query({
  args: { divisionId: v.optional(v.id("divisions")) },
  handler: async (ctx, { divisionId }) => {
    if (divisionId) {
      return await ctx.db
        .query("categories")
        .withIndex("by_divisionId", (q) => q.eq("divisionId", divisionId))
        .collect();
    }
    return await ctx.db.query("categories").collect();
  },
});

export const listItems = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { categoryId, type, limit = 30 }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile || callerProfile.deleteAccount) return [];

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

    const results = [];
    for (const itemId of itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item || item.isDeleted) continue;
      if (categoryId && item.categoryId !== categoryId) continue;
      if (type && item.type !== type) continue;

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

      results.push({
        ...item,
        creatorNickName: creator?.nickName ?? "",
        creatorProfileImageUrl,
      });
    }

    results.sort((a, b) => b.postDate - a.postDate);
    return results.slice(0, limit);
  },
});

export const getItem = query({
  args: { itemId: v.id("libraryItems") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.isDeleted) return null;

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

    return {
      ...item,
      creatorNickName: creator?.nickName ?? "",
      creatorProfileImageUrl,
      images: imageUrls,
      documents: docList,
      likeCount: metas.filter((m) => m.type === "Like").length,
      endorseCount: metas.filter((m) => m.type === "Endorse").length,
      commentCount: metas.filter((m) => m.type === "Comment").length,
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
    categoryId: v.optional(v.id("categories")),
    division: v.optional(v.string()),
    tag: v.optional(v.string()),
    chinaVideoLink: v.optional(v.string()),
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

    const itemId = await ctx.db.insert("libraryItems", {
      userId: profile._id,
      title: args.title,
      description: args.description,
      categoryId: args.categoryId,
      division: args.division,
      tag: args.tag,
      postDate: Date.now(),
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
