import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: { includeDeleted: v.optional(v.boolean()) },
  handler: async (ctx, { includeDeleted }) => {
    const markets = await ctx.db.query("markets").collect();
    return markets
      .filter((m) => (includeDeleted ? true : !m.isDeleted))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("markets", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("markets"),
    name: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("markets") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { isDeleted: true });
  },
});

export const bulkRemove = mutation({
  args: { ids: v.array(v.id("markets")) },
  handler: async (ctx, { ids }) => {
    await requireAdmin(ctx);
    for (const id of ids) {
      await ctx.db.patch(id, { isDeleted: true });
    }
  },
});

export const bulkRestore = mutation({
  args: { ids: v.array(v.id("markets")) },
  handler: async (ctx, { ids }) => {
    await requireAdmin(ctx);
    for (const id of ids) {
      await ctx.db.patch(id, { isDeleted: false });
    }
  },
});

// One-off: seeds the table from the legacy hardcoded MARKETS list.
// Safe to re-run — skips names that already exist.
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("markets").collect();
    const existingNames = new Set(existing.map((e) => e.name));

    const MARKETS: string[] = [
      "Hong Kong",
      "Canada",
      "United States",
      "Taiwan",
      "Mainland China",
    ];

    let order = existing.length;
    for (const name of MARKETS) {
      if (existingNames.has(name)) continue;
      await ctx.db.insert("markets", { name, displayOrder: order++ });
    }
  },
});
