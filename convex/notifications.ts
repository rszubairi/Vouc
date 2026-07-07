import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const myNotifications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!profile) return [];

    const notifications = await ctx.db
      .query("pushNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", profile._id))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return 0;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!profile) return 0;

    const unread = await ctx.db
      .query("pushNotifications")
      .withIndex("by_userId_isRead", (q) =>
        q.eq("userId", profile._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("pushNotifications") },
  handler: async (ctx, { notificationId }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return;
    await ctx.db.patch(notificationId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!profile) return;

    const unread = await ctx.db
      .query("pushNotifications")
      .withIndex("by_userId_isRead", (q) =>
        q.eq("userId", profile._id).eq("isRead", false)
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
  },
});
