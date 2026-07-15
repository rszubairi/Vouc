import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {
    scope: v.optional(v.union(v.literal("library"), v.literal("discussion"))),
  },
  handler: async (ctx, { scope }) => {
    const categories = await ctx.db.query("categories").order("asc").collect();
    const divisions = await ctx.db.query("divisions").collect();
    const divisionsById = new Map(divisions.map((d) => [d._id, d]));

    return categories
      .filter((c) => (scope ? (c.scope ?? "library") === scope : true))
      .map((c) => ({
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
    scope: v.optional(v.union(v.literal("library"), v.literal("discussion"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("categories", { ...args, scope: args.scope ?? "library" });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    divisionId: v.optional(v.id("divisions")),
    scope: v.optional(v.union(v.literal("library"), v.literal("discussion"))),
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
