import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").order("asc").collect();
    const divisions = await ctx.db.query("divisions").collect();
    const divisionsById = new Map(divisions.map((d) => [d._id, d]));

    return categories.map((c) => ({
      ...c,
      divisionName: c.divisionId
        ? divisionsById.get(c.divisionId)?.name ?? "—"
        : "—",
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    divisionId: v.optional(v.id("divisions")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("categories", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    divisionId: v.optional(v.id("divisions")),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
