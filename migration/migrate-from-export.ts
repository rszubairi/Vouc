/**
 * Oolala export/*.json → Convex DB migration script.
 *
 * Same as migrate.ts but sources rows from the local export/*.json dumps
 * instead of querying SQL Server live. Only covers the top-level tables
 * that were dumped by migrate.ts's saveExport() calls:
 *   userRanks, divisions, categories, profiles, images, documents,
 *   groups, posts, events, libraryItems
 * Child/relation tables (postMetas, eventAttendances, pushNotifications,
 * etc.) are not present in export/ and are skipped.
 *
 * Usage:
 *   npx tsx migrate-from-export.ts
 */

import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { insert, findBySqlId, patch } from "./convex-client";

const EXPORT_DIR = path.join(__dirname, "export");

// FK map: "table:sqlId" → Convex _id
const idMap = new Map<string, string>();

function setId(table: string, sqlId: number, convexId: string) {
  idMap.set(`${table}:${sqlId}`, convexId);
}
function getId(table: string, sqlId: number | null | undefined): string | undefined {
  if (sqlId == null) return undefined;
  const id = idMap.get(`${table}:${sqlId}`);
  if (!id) console.warn(`  ⚠ No Convex ID for ${table}:${sqlId}`);
  return id;
}

async function upsert(
  table: string,
  sqlId: number,
  doc: Record<string, unknown>
): Promise<string> {
  const existing = await findBySqlId(table, sqlId);
  if (existing) {
    setId(table, sqlId, existing);
    return existing;
  }
  const convexId = await insert(table, { ...doc, sqlId });
  setId(table, sqlId, convexId as string);
  return convexId as string;
}

function bool(val: unknown): boolean {
  return val === true || val === 1;
}

function toMs(val: string | null | undefined): number | undefined {
  if (val == null) return undefined;
  const ms = new Date(val).getTime();
  return isNaN(ms) ? undefined : ms;
}

function loadExport<T = any>(name: string): T[] {
  const file = path.join(EXPORT_DIR, `${name}.json`);
  return JSON.parse(readFileSync(file, "utf-8"));
}

function visFlags(r: any) {
  return {
    toUpline: bool(r.Upline),
    toDownline: bool(r.Downline),
    toSelectGroup: bool(r.SelectGroup),
    toCustom: bool(r.Custom),
    minLevel: r.MinLevel ?? undefined,
    maxLevel: r.MaxLevel ?? undefined,
    minRank: r.MinRank ?? undefined,
    allowRetweet: bool(r.AllowRetweet),
    mustRead: bool(r.MustRead),
    isDeleted: bool(r.IsDeleted),
    selectedZone: r.SelectedZone ?? undefined,
    chinaVideoLink: r.ChinaVideoLink ?? undefined,
    nonChinaVideoLink: r.NonChinaVideoLink ?? undefined,
    tag: r.Tag ?? undefined,
  };
}

// ─── Phase 1: Reference data ──────────────────────────────────────────────────

async function migrateUserRanks() {
  console.log("\n── UserRanks");
  const rows = loadExport<any>("userRanks");
  for (const r of rows) {
    await upsert("userRanks", r.Id, {
      name: r.Name ?? "",
      abbreviation: r.Abb ?? "",
      displayOrder: 0,
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

async function migrateDivisions() {
  console.log("\n── Divisions");
  const rows = loadExport<any>("divisions");
  for (const r of rows) {
    await upsert("divisions", r.Id, {
      name: r.Name ?? "",
      displayOrder: r.DisplayOrder ?? 0,
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

async function migrateCategories() {
  console.log("\n── Categories");
  const rows = loadExport<any>("categories");
  for (const r of rows) {
    await upsert("categories", r.Id, {
      divisionId: getId("divisions", r.DivisionId),
      name: r.Name ?? "",
      displayOrder: r.DisplayOrder ?? 0,
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 2: Profiles (two passes for self-referential FK) ──────────────────

async function migrateProfiles() {
  console.log("\n── Profiles");
  const rows = loadExport<any>("profiles");

  // Pass 1: insert all profiles without sponsorId
  for (const r of rows) {
    await upsert("profiles", r.Id, {
      userId: "", // linked on first login
      nickName: r.NickName ?? "",
      firstName: r.FirstName ?? "",
      middleName: r.MiddleName ?? undefined,
      lastName: r.LastName ?? "",
      emailAddress: r.EmailAddress ?? "",
      sponsorEmailAddress: r.SponsorEmailAddress ?? "",
      phoneNumber: r.PhoneNumber ?? undefined,
      birthDate: toMs(r.BirthDate),
      addressLine1: r.AddLaneOne ?? undefined,
      addressLine2: r.AddLaneTwo ?? undefined,
      city: r.City ?? "",
      zipCode: r.ZipCode ?? undefined,
      country: r.Country ?? "",
      bio: r.Bio ?? undefined,
      userRankId: getId("userRanks", r.UserRankId),
      sponsorApproved: bool(r.SponsorApproved),
      deviceToken: r.DeviceToken ?? undefined,
      fullAccess: bool(r.FullAccess),
      fullAccessExpiryDate: toMs(r.FullAccessExpiryDate),
      deleteAccount: bool(r.DeleteAccount),
      deleteRequestDate: toMs(r.DeleteRequestDate),
      website: r.YourWebsite ?? undefined,
      facebook: r.Facebook ?? undefined,
      instagram: r.Instagram ?? undefined,
      twitter: r.Twitter ?? undefined,
      line: r.Line ?? undefined,
      tiktok: r.Tiktok ?? undefined,
      discord: r.Discord ?? undefined,
      weChat: r.WeChat ?? undefined,
    });
  }

  // Pass 2: patch sponsorId now that all profiles have Convex IDs
  console.log(`  Patching ${rows.filter((r: any) => r.SponsorId).length} sponsor references...`);
  for (const r of rows) {
    if (!r.SponsorId) continue;
    const convexId = getId("profiles", r.Id);
    const sponsorConvexId = getId("profiles", r.SponsorId);
    if (!convexId || !sponsorConvexId) continue;
    await patch("profiles", convexId, { sponsorId: sponsorConvexId });
  }

  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 3: Shared media ────────────────────────────────────────────────────

async function migrateImages() {
  console.log("\n── Images");
  const rows = loadExport<any>("images");
  for (const r of rows) {
    // Some legacy images have no known uploader (UserId is null) — still
    // migrate them, since they're linked to their post/library item/event
    // via the *Images join tables regardless of ownership.
    const userId = getId("profiles", r.UserId) ?? undefined;
    await upsert("images", r.Id, { userId, url: r.Url ?? "" });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

async function migrateDocuments() {
  console.log("\n── Documents");
  const rows = loadExport<any>("documents");
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    if (!userId) continue;
    await upsert("documents", r.Id, { userId, name: r.Name ?? "file", url: r.Url ?? "" });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 4: Groups ──────────────────────────────────────────────────────────

async function migrateGroups() {
  console.log("\n── Group");
  const rows = loadExport<any>("groups");
  for (const r of rows) {
    const ownerId = getId("profiles", r.UserId);
    if (!ownerId) continue;
    await upsert("groups", r.Id, { ownerId, name: r.Name ?? "" });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 5: Discussions (formerly Posts) ─────────────────────────────────────

async function migratePosts() {
  console.log("\n── Discussions");
  const rows = loadExport<any>("posts");
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    if (!userId) continue;
    const discussionId = await upsert("discussions", r.Id, {
      userId,
      topic: r.Topic ?? undefined,
      details: r.Details ?? "",
      status: "Open",
      postDate: toMs(r.PostDate) ?? Date.now(),
      superAccount: false,
      ...visFlags(r),
    });
    if (r.Tag) {
      const tag = String(r.Tag).toLowerCase().trim();
      if (tag) await upsert("discussionTags", `tag:${r.Id}`, { discussionId, tag });
    }
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 6: Events ──────────────────────────────────────────────────────────

async function migrateEvents() {
  console.log("\n── Events");
  const rows = loadExport<any>("events");
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    if (!userId) continue;
    await upsert("events", r.Id, {
      userId,
      eventType: r.EventType ?? "General",
      title: r.Title ?? "",
      details: r.Details ?? "",
      speaker: r.Speaker ?? undefined,
      eventLink: r.EventLink ?? undefined,
      eventDateStart: toMs(r.EventDateStart) ?? Date.now(),
      eventDateEnd: toMs(r.EventDateEnd) ?? Date.now(),
      userEnteredStart: toMs(r.UserEnteredStarted),
      userEnteredEnd: toMs(r.UserEnteredEnd),
      noPayment: false,
      superAccount: false,
      ...visFlags(r),
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 7: Library items ───────────────────────────────────────────────────

async function migrateLibraryItems() {
  console.log("\n── LibraryItems");
  const rows = loadExport<any>("libraryItems");
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    if (!userId) continue;
    await upsert("libraryItems", r.Id, {
      userId,
      title: r.Title ?? "",
      description: r.Description ?? "",
      type: r.Type ?? "General",
      categoryId: getId("categories", r.CategoryId),
      division: r.Division ?? undefined,
      postDate: toMs(r.PostDate) ?? Date.now(),
      superAccount: false,
      ...visFlags(r),
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Oolala  export/*.json → Convex Migration");
  console.log("(top-level tables only — child/relation tables skipped)");
  console.log("=".repeat(60));

  await migrateUserRanks();
  await migrateDivisions();
  await migrateCategories();
  await migrateProfiles();
  await migrateImages();
  await migrateDocuments();
  await migrateGroups();
  await migratePosts();
  await migrateEvents();
  await migrateLibraryItems();

  console.log("\n" + "=".repeat(60));
  console.log("Migration from export/ complete!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n✗ Migration failed:", err.message ?? err);
  process.exit(1);
});
