import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    void admin;

    const groups = await ctx.db.query("groups").order("desc").take(500);
    const owners = await Promise.all(groups.map((g) => ctx.db.get(g.ownerId)));
    const memberCounts = await Promise.all(
      groups.map((g) =>
        ctx.db
          .query("groupUsers")
          .withIndex("by_groupId", (q) => q.eq("groupId", g._id))
          .collect()
          .then((rows) => rows.length)
      )
    );

    return groups.map((g, i) => ({
      ...g,
      ownerName: owners[i]?.nickName ?? "Unknown",
      memberCount: memberCounts[i],
    }));
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("groups", { name: args.name, ownerId: admin._id });
  },
});

export const update = mutation({
  args: { id: v.id("groups"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { name });
  },
});

export const remove = mutation({
  args: { id: v.id("groups") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const members = await ctx.db
      .query("groupUsers")
      .withIndex("by_groupId", (q) => q.eq("groupId", id))
      .take(1000);
    for (const m of members) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(id);
  },
});
