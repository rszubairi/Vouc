import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

// App-wide settings, stored as key/value rows owned by the admin account.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", admin._id))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    settingName: v.string(),
    settingValue: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("settings", { ...args, userId: admin._id });
  },
});

export const update = mutation({
  args: {
    id: v.id("settings"),
    settingName: v.string(),
    settingValue: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("settings") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
