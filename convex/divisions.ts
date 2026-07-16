import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import { DIRECTORY_DIVISIONS } from "./directoryCategoriesData";

// One-off/idempotent seed for the launch set of Directory divisions and
// their categories. Run via `npx convex run divisions:seedDirectory`.
export const seedDirectory = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingDivisions = await ctx.db.query("divisions").collect();
    const divisionsByName = new Map(existingDivisions.map((d) => [d.name, d]));

    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_scope", (q) => q.eq("scope", "library"))
      .collect();

    for (let i = 0; i < DIRECTORY_DIVISIONS.length; i++) {
      const { name: divisionName, categories } = DIRECTORY_DIVISIONS[i];

      let division = divisionsByName.get(divisionName);
      if (!division) {
        const id = await ctx.db.insert("divisions", {
          name: divisionName,
          displayOrder: i,
        });
        division = { _id: id, _creationTime: Date.now(), name: divisionName, displayOrder: i };
        divisionsByName.set(divisionName, division);
      }

      const existingNamesForDivision = new Set(
        existingCategories
          .filter((c) => c.divisionId === division!._id)
          .map((c) => c.name)
      );

      for (let j = 0; j < categories.length; j++) {
        const categoryName = categories[j];
        if (existingNamesForDivision.has(categoryName)) continue;
        await ctx.db.insert("categories", {
          divisionId: division._id,
          name: categoryName,
          displayOrder: j,
          scope: "library",
        });
      }
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("divisions").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("divisions", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("divisions"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("divisions") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
