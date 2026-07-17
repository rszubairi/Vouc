/**
 * One-off migration: copy legacy posts* documents into the new discussions*
 * tables. Safe to re-run (skips discussions that already have a matching
 * sqlId... but since these tables have no sqlId tagging, guard via a marker
 * query instead). Delete this file after running once and verifying.
 */
import { internalMutation } from "./_generated/server";

const DEFAULT_DISCUSSION_CATEGORIES = [
  "Business Opportunities",
  "Jobs & Career",
  "Events",
  "Buy • Sell • Give Away",
  "Recommendations & Referrals",
  "Knowledge & Advice",
  "Promotions & Member Offers",
  "Community Lounge",
];

// Seed the fixed starter set of Discussion categories (admin can add/edit/remove afterward).
export const seedDiscussionCategories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_scope", (q) => q.eq("scope", "discussion"))
      .collect();
    const existingNames = new Set(existing.map((c) => c.name));

    let inserted = 0;
    for (let i = 0; i < DEFAULT_DISCUSSION_CATEGORIES.length; i++) {
      const name = DEFAULT_DISCUSSION_CATEGORIES[i];
      if (existingNames.has(name)) continue;
      await ctx.db.insert("categories", { name, displayOrder: i, scope: "discussion" });
      inserted++;
    }
    return { inserted };
  },
});

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const db = ctx.db as any; // legacy `posts*` tables are no longer declared in schema.ts

    const already = await ctx.db.query("discussions").first();
    if (already) {
      return { skipped: true, reason: "discussions table is not empty" };
    }

    const idMap = new Map<string, any>();

    const posts = await db.query("posts").collect();
    for (const p of posts) {
      const discussionId = await ctx.db.insert("discussions", {
        userId: p.userId,
        topic: p.topic,
        details: p.details,
        chinaVideoLink: (p as any).chinaVideoLink,
        nonChinaVideoLink: (p as any).nonChinaVideoLink,
        categoryIds: [],
        status: "Open",
        postDate: p.postDate,
        selectedZone: p.selectedZone,
        allowRetweet: p.allowRetweet,
        mustRead: p.mustRead,
        isDeleted: p.isDeleted,
        superAccount: p.superAccount,
        toUpline: p.toUpline,
        toDownline: p.toDownline,
        toSelectGroup: p.toSelectGroup,
        toCustom: p.toCustom,
        groupId: p.groupId,
        minLevel: p.minLevel,
        maxLevel: p.maxLevel,
        minRank: p.minRank,
      });
      idMap.set(p._id, discussionId);

      const tag = (p as any).tag;
      if (tag) {
        const normalized = String(tag).toLowerCase().trim();
        if (normalized) await ctx.db.insert("discussionTags", { discussionId, tag: normalized });
      }
    }

    const postImages = await db.query("postImages").collect();
    for (const row of postImages) {
      const discussionId = idMap.get(row.postId);
      if (!discussionId) continue;
      await ctx.db.insert("discussionImages", {
        discussionId,
        imageId: row.imageId,
        order: row.order,
      });
    }

    const postMetas = await db.query("postMetas").collect();
    let likeEndorseCount = 0;
    let replyCount = 0;
    for (const row of postMetas) {
      const discussionId = idMap.get(row.postId);
      if (!discussionId) continue;
      if (row.type === "Like" || row.type === "Endorse") {
        await ctx.db.insert("discussionMetas", {
          discussionId,
          userId: row.userId,
          type: row.type,
        });
        likeEndorseCount++;
      } else {
        await ctx.db.insert("discussionReplies", {
          discussionId,
          userId: row.userId,
          body: row.comment ?? "",
          isDeleted: false,
          replyDate: row._creationTime,
        });
        replyCount++;
      }
    }

    const postVisibilities = await db.query("postVisibilities").collect();
    for (const row of postVisibilities) {
      const discussionId = idMap.get(row.postId);
      if (!discussionId) continue;
      await ctx.db.insert("discussionVisibilities", {
        discussionId,
        userId: row.userId,
        isRead: row.isRead,
      });
    }

    const postLanguages = await db.query("postLanguages").collect();
    for (const row of postLanguages) {
      const discussionId = idMap.get(row.postId);
      if (!discussionId) continue;
      await ctx.db.insert("discussionLanguages", { discussionId, language: row.language });
    }

    const postMarkets = await db.query("postMarkets").collect();
    for (const row of postMarkets) {
      const discussionId = idMap.get(row.postId);
      if (!discussionId) continue;
      await ctx.db.insert("discussionMarkets", { discussionId, market: row.market });
    }

    return {
      skipped: false,
      discussions: posts.length,
      images: postImages.length,
      likesEndorses: likeEndorseCount,
      replies: replyCount,
      visibilities: postVisibilities.length,
    };
  },
});
