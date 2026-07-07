import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("contactUs").order("desc").take(500);
    const users = await Promise.all(
      rows.map((r) => (r.userId ? ctx.db.get(r.userId) : null))
    );
    return rows.map((r, i) => ({
      ...r,
      userName: users[i]?.nickName ?? null,
    }));
  },
});

export const remove = mutation({
  args: { id: v.id("contactUs") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
