import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

const KNOWLEDGE_HUB_CATEGORIES = [
  "Articles & Guides",
  "Training Courses",
  "Seminars & Webinars",
  "Templates & Downloads",
  "Tools & Resources",
];

// One-off/idempotent seed for the launch set of Knowledge Hub categories.
// Run via `npx convex run categories:seedKnowledgeHubCategories`.
export const seedKnowledgeHubCategories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_scope", (q) => q.eq("scope", "library"))
      .collect();
    const existingNames = new Set(existing.map((c) => c.name));

    for (let i = 0; i < KNOWLEDGE_HUB_CATEGORIES.length; i++) {
      const name = KNOWLEDGE_HUB_CATEGORIES[i];
      if (existingNames.has(name)) continue;
      await ctx.db.insert("categories", {
        name,
        displayOrder: i,
        scope: "library",
      });
    }
  },
});

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
