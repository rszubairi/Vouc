import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userRanks").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    abbreviation: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("userRanks", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("userRanks"),
    name: v.string(),
    abbreviation: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("userRanks") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
