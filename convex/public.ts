import { query } from "./_generated/server";
import { v } from "convex/values";
import { toExcerpt } from "./lib/text";
import { getDiscussionReplies } from "./discussions";
import { getLibraryComments } from "./library";
import { getKnowledgeHubComments } from "./knowledgeHub";

// Fully public, unauthenticated surface for shareable links (`/share/[type]/[id]`).
// Once an item is shared, anyone with the link can view it read-only — the
// normal network-visibility flags (toUpline/toDownline/toSelectGroup/etc.)
// are intentionally bypassed here. Only PII-free fields are returned.

const TABLE_BY_TYPE = {
  discussion: "discussions",
  "knowledge-hub": "knowledgeHubItems",
  directory: "libraryItems",
} as const;

type SharedType = keyof typeof TABLE_BY_TYPE;

async function firstDiscussionImageUrl(ctx: any, discussionId: string) {
  const rows = await ctx.db
    .query("discussionImages")
    .withIndex("by_discussionId", (q: any) => q.eq("discussionId", discussionId))
    .collect();
  if (rows.length === 0) return null;
  const first = rows.sort((a: any, b: any) => a.order - b.order)[0];
  return (await ctx.db.get(first.imageId))?.url ?? null;
}

async function firstKnowledgeHubImageUrl(ctx: any, knowledgeHubItemId: string) {
  const rows = await ctx.db
    .query("knowledgeHubImages")
    .withIndex("by_knowledgeHubItemId", (q: any) => q.eq("knowledgeHubItemId", knowledgeHubItemId))
    .collect();
  if (rows.length === 0) return null;
  const first = rows.sort((a: any, b: any) => a.order - b.order)[0];
  return (await ctx.db.get(first.imageId))?.url ?? null;
}

async function firstLibraryImageUrl(ctx: any, libraryItemId: string) {
  const rows = await ctx.db
    .query("libraryImages")
    .withIndex("by_libraryItemId", (q: any) => q.eq("libraryItemId", libraryItemId))
    .collect();
  if (rows.length === 0) return null;
  const first = rows.sort((a: any, b: any) => a.order - b.order)[0];
  return (await ctx.db.get(first.imageId))?.url ?? null;
}

export const getSharedItem = query({
  args: {
    type: v.union(v.literal("discussion"), v.literal("knowledge-hub"), v.literal("directory")),
    id: v.string(),
  },
  handler: async (ctx, { type, id }) => {
    const tableName = TABLE_BY_TYPE[type as SharedType];
    const itemId: any = ctx.db.normalizeId(tableName, id);
    if (!itemId) return null;

    const item: any = await ctx.db.get(itemId);
    if (!item || item.isDeleted) return null;

    // Discussions hide scheduled (future-dated) posts from everyone but their
    // author — mirror that gate here since shared links skip auth entirely.
    if (type === "discussion" && item.postDate > Date.now()) return null;

    const author: any = await ctx.db.get(item.userId);
    const authorName = author?.nickName ?? "";

    let title = "";
    let body = "";
    let imageUrl: string | null = null;
    let comments: Array<{
      _id: string;
      comment: string;
      commentDate: number;
      commenterNickName: string;
      commenterProfileImageUrl: string | null;
    }> = [];

    if (type === "discussion") {
      title = item.topic ?? "";
      body = item.details;
      imageUrl = await firstDiscussionImageUrl(ctx, itemId);
      const replies = await getDiscussionReplies(ctx, itemId);
      comments = replies.map((r: any) => ({
        _id: r._id,
        comment: r.body,
        commentDate: r.replyDate,
        commenterNickName: r.replierNickName,
        commenterProfileImageUrl: null,
      }));
    } else if (type === "knowledge-hub") {
      title = item.title;
      body = item.description;
      imageUrl = await firstKnowledgeHubImageUrl(ctx, itemId);
      comments = await getKnowledgeHubComments(ctx, itemId);
    } else {
      title = item.title;
      body = item.description;
      imageUrl = await firstLibraryImageUrl(ctx, itemId);
      const libraryComments = await getLibraryComments(ctx, itemId);
      comments = libraryComments.map((c: any) => ({
        _id: c._id,
        comment: c.comment,
        commentDate: c.commentDate,
        commenterNickName: c.commenterNickName,
        commenterProfileImageUrl: c.commenterProfileImageUrl,
      }));
    }

    return {
      type,
      id,
      title,
      body,
      excerpt: toExcerpt(body),
      imageUrl,
      authorName,
      postDate: item.postDate,
      comments,
    };
  },
});
