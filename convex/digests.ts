import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { countEngagement } from "./engagements";

const BATCH_SIZE = 200;
const EXCERPT_LENGTH = 140;

// Scans the engagements table in batches looking for Star rows on
// discussions, and for each one, notifies the starrer if the discussion has
// picked up replies since their last digest. Self-continues via the
// scheduler (like convex/hierarchy.ts's rebuild jobs) so a large engagements
// table doesn't blow the per-mutation transaction limits.
export const runDigestBatch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("engagements").paginate({ numItems: BATCH_SIZE, cursor });

    for (const row of page.page) {
      if (row.kind !== "Star" || row.targetType !== "discussion") continue;

      const discussionId = row.targetId as Id<"discussions">;
      const discussion = await ctx.db.get(discussionId);
      if (!discussion || discussion.isDeleted) continue;

      const checkpoint = await ctx.db
        .query("discussionDigestState")
        .withIndex("by_userId_discussionId", (q) =>
          q.eq("userId", row.userId).eq("discussionId", discussionId)
        )
        .first();
      const since = checkpoint?.lastNotifiedAt ?? row._creationTime;

      const allReplies = await ctx.db
        .query("discussionReplies")
        .withIndex("by_discussionId", (q) => q.eq("discussionId", discussionId))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
      const newReplies = allReplies.filter((r) => r.replyDate > since);
      if (newReplies.length === 0) continue;

      const metas = await ctx.db
        .query("discussionMetas")
        .withIndex("by_discussionId", (q) => q.eq("discussionId", discussionId))
        .collect();
      const likeCount = metas.filter((m) => m.type === "Like").length;
      const endorseCount = metas.filter((m) => m.type === "Endorse").length;
      const starCount = await countEngagement(ctx, "discussion", discussionId, "Star");
      const interactionCount = likeCount + endorseCount + allReplies.length + starCount;

      const excerpt = (
        discussion.topic || discussion.details
      ).slice(0, EXCERPT_LENGTH);

      await ctx.db.insert("pushNotifications", {
        userId: row.userId,
        subject: "Discussion digest",
        message: `${newReplies.length} new repl${newReplies.length === 1 ? "y" : "ies"} on "${excerpt}" — ${interactionCount} people engaging`,
        entity: "Discussion",
        entityId: discussionId,
        isRead: false,
      });

      if (checkpoint) {
        await ctx.db.patch(checkpoint._id, { lastNotifiedAt: Date.now() });
      } else {
        await ctx.db.insert("discussionDigestState", {
          userId: row.userId,
          discussionId,
          lastNotifiedAt: Date.now(),
        });
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.digests.runDigestBatch, {
        cursor: page.continueCursor,
      });
    }
  },
});
