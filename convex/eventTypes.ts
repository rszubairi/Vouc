import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("eventTypes").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("eventTypes", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("eventTypes"),
    name: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("eventTypes") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// One-off: seeds the table from the legacy hardcoded EVENT_TYPES list.
// Safe to re-run — skips names that already exist.
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("eventTypes").collect();
    const existingNames = new Set(existing.map((e) => e.name));

    const EVENT_TYPES: string[] = [
      "Health Club",
      "Webinar",
      "Networking",
      "Training",
      "Social",
      "Product Launch",
      "Other",
      "Workshop (WS)",
      "Business Opportunity Meetup (BOM)",
      "Business Builder Training (BBT)",
      "Product Opportunity Meetup (POM)",
      "Product Session (PS)",
      "Case Sharing (CS)",
      "Professional Training (PT)",
      "Gathering",
      "Leaders' Training",
      "Conference",
      "Nu Skin Expo (EXPO)",
      "Meet-up",
      "Incentive Trips",
    ];

    let order = existing.length;
    for (const name of EVENT_TYPES) {
      if (existingNames.has(name)) continue;
      await ctx.db.insert("eventTypes", { name, displayOrder: order++ });
    }
  },
});
