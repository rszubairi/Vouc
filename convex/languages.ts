import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const languages = await ctx.db.query("languages").collect();
    return languages
      .filter((l) => !l.isDeleted)
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
    return await ctx.db.insert("languages", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("languages"),
    name: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("languages") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { isDeleted: true });
  },
});

export const bulkRemove = mutation({
  args: { ids: v.array(v.id("languages")) },
  handler: async (ctx, { ids }) => {
    await requireAdmin(ctx);
    for (const id of ids) {
      await ctx.db.patch(id, { isDeleted: true });
    }
  },
});

// One-off: seeds the table from the legacy hardcoded LANGUAGES list.
// Safe to re-run — skips names that already exist.
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("languages").collect();
    const existingNames = new Set(existing.map((e) => e.name));

    const LANGUAGES: string[] = [
      "English",
      "Cantonese",
      "Mandarin Chinese",
      "Traditional Chinese",
      "Simplified Chinese",
    ];

    let order = existing.length;
    for (const name of LANGUAGES) {
      if (existingNames.has(name)) continue;
      await ctx.db.insert("languages", { name, displayOrder: order++ });
    }
  },
});
