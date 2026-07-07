/**
 * Post-migration cleanup: remove sqlId fields from all Convex documents.
 * Run this 2 weeks after migration once everything is verified stable.
 *
 * Usage: npx tsx cleanup-sqlids.ts
 */
import "dotenv/config";
import { callMutation } from "./convex-client";

const TABLES = [
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
];

async function main() {
  console.log("Removing sqlId fields from all Convex documents...\n");
  let total = 0;
  for (const table of TABLES) {
    const count = await callMutation("migration:removeSqlIds", { table }) as number;
    if (count > 0) {
      console.log(`  ${table}: removed sqlId from ${count} documents`);
      total += count;
    }
  }
  console.log(`\nDone. Cleaned ${total} documents total.`);
  console.log("You can now delete convex/migration.ts and migration/ folder.");
}

main().catch(console.error);
