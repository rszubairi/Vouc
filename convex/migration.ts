/**
 * Convex-side helpers for the migration script.
 * These are internal functions callable via the HTTP API with a deploy key.
 * They are NOT exposed to the mobile app or web admin.
 *
 * After migration is complete and verified, this file can be deleted.
 */
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Generic insert with sqlId tagging ───────────────────────────────────────

// Allowed table names (whitelist for security)
const ALLOWED_TABLES = new Set([
  "profiles", "profileImages", "profileLanguages", "profileMarkets",
  "profileHierarchies", "profileFollowers", "userRanks",
  "posts", "postImages", "postMetas", "postVisibilities", "postLanguages", "postMarkets",
  "events", "eventImages", "eventMetas", "eventVisibilities", "eventHosts",
  "eventAttendances", "eventAttendanceDocuments", "eventLanguages", "eventMarkets",
  "libraryItems", "libraryImages", "libraryDocuments", "libraryItemMetas",
  "libraryVisibilities", "contributors", "documentTypes", "libraryLanguages", "libraryMarkets",
  "divisions", "categories", "groups", "groupUsers",
  "images", "documents",
  "pushNotifications", "settings", "contactUs", "errorLogs",
]);

// Insert a single document into any allowed table.
// The doc must include sqlId (the original SQL Server int PK).
export const insert = mutation({
  args: {
    table: v.string(),
    doc: v.any(),
  },
  handler: async (ctx, { table, doc }) => {
    if (!ALLOWED_TABLES.has(table)) throw new Error(`Table '${table}' is not allowed`);
    return await (ctx.db as any).insert(table, doc);
  },
});

// Find a document by its original SQL Server integer ID.
export const findBySqlId = query({
  args: {
    table: v.string(),
    sqlId: v.number(),
  },
  handler: async (ctx, { table, sqlId }) => {
    if (!ALLOWED_TABLES.has(table)) return null;
    const doc = await (ctx.db as any)
      .query(table)
      .filter((q: any) => q.eq(q.field("sqlId"), sqlId))
      .first();
    return doc?._id ?? null;
  },
});

// Count all documents in a table (for verification).
export const countTable = query({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    if (!ALLOWED_TABLES.has(table)) return 0;
    const all = await (ctx.db as any).query(table).collect();
    return all.length;
  },
});

// Patch specific fields on a document by its Convex _id.
export const patch = mutation({
  args: {
    table: v.string(),
    id: v.string(),
    fields: v.any(),
  },
  handler: async (ctx, { table, id, fields }) => {
    if (!ALLOWED_TABLES.has(table)) throw new Error(`Table '${table}' is not allowed`);
    await ctx.db.patch(id as any, fields);
  },
});

// Remove sqlId field from all documents in a table (post-migration cleanup).
export const removeSqlIds = internalMutation({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    if (!ALLOWED_TABLES.has(table)) return 0;
    const all = await (ctx.db as any).query(table).collect();
    let count = 0;
    for (const doc of all) {
      if ("sqlId" in doc) {
        const { sqlId: _, ...rest } = doc;
        await ctx.db.replace(doc._id, rest);
        count++;
      }
    }
    return count;
  },
});
