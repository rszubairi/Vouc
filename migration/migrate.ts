/**
 * Oolala SQL Server → Convex DB Migration Script
 *
 * Usage:
 *   npx tsx migrate.ts             # full migration
 *   npx tsx migrate.ts --dry-run   # export SQL data to ./export/*.json only
 *   npx tsx migrate.ts --verify    # compare row counts between SQL and Convex
 */

import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { connect, disconnect, query, toMs, count } from "./sql";
import { insert, findBySqlId, patch, callQuery } from "./convex-client";

const DRY_RUN = process.argv.includes("--dry-run");
const VERIFY = process.argv.includes("--verify");
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

function saveExport(name: string, data: unknown[]) {
  mkdirSync(EXPORT_DIR, { recursive: true });
  writeFileSync(path.join(EXPORT_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

function bool(val: unknown): boolean {
  return val === true || val === 1;
}

/** Run tasks with limited concurrency. */
async function pool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
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
  const rows = await query<any>(`SELECT Id, Name, Abb FROM UserRanks`);
  saveExport("userRanks", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
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
  const rows = await query<any>(`SELECT Id, Name, DisplayOrder FROM Divisions`);
  saveExport("divisions", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
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
  const rows = await query<any>(`SELECT Id, DivisionId, Name, DisplayOrder FROM Categories`);
  saveExport("categories", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
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
  const rows = await query<any>(`
    SELECT Id, SponsorId, UserRankId, NickName, FirstName, MiddleName, LastName,
           EmailAddress, SponsorEmailAddress, PhoneNumber, BirthDate,
           AddLaneOne, AddLaneTwo, City, ZipCode, Country, Bio,
           SponsorApproved, DeviceToken, FullAccess, FullAccessExpiryDate,
           DeleteAccount, DeleteRequestDate,
           YourWebsite, Facebook, Instagram, Twitter, Line, Tiktok, Discord, WeChat
    FROM Profiles
  `);
  saveExport("profiles", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }

  // Pass 1: insert all profiles without sponsorId
  for (const r of rows) {
    await upsert("profiles", r.Id, {
      userId: "",  // linked on first login
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
  const rows = await query<any>(`SELECT Id, UserId, Url FROM Images`);
  saveExport("images", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
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
  const rows = await query<any>(`SELECT Id, UserId, Name, Url FROM Documents`);
  saveExport("documents", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    if (!userId) continue;
    await upsert("documents", r.Id, { userId, name: r.Name ?? "file", url: r.Url ?? "" });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 4: Profile relations ───────────────────────────────────────────────

async function migrateProfileImages() {
  console.log("\n── ProfileImages");
  // UserId in this table IS the profile (no separate ProfileId column)
  const rows = await query<any>(`SELECT Id, UserId, ImageId FROM ProfileImages`);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  // Mark the latest image per profile as primary
  const latestPerProfile: Record<number, number> = {};
  for (const r of rows) {
    latestPerProfile[r.UserId] = r.Id; // last one wins (rows are ordered by Id asc)
  }
  for (const r of rows) {
    const profileId = getId("profiles", r.UserId);
    const imageId = getId("images", r.ImageId);
    if (!profileId || !imageId) continue;
    await upsert("profileImages", r.Id, {
      profileId,
      imageId,
      isPrimary: latestPerProfile[r.UserId] === r.Id,
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

async function migrateProfileLanguagesMarkets() {
  console.log("\n── ProfileLanguage / ProfileMarket");
  // UserId here IS the profile
  const langs = await query<any>(`SELECT Id, UserId, Language FROM ProfileLanguage`);
  const markets = await query<any>(`SELECT Id, UserId, Market FROM ProfileMarket`);
  if (DRY_RUN) { console.log(`  ${langs.length} + ${markets.length} rows (dry run)`); return; }
  for (const r of langs) {
    const profileId = getId("profiles", r.UserId);
    if (!profileId) continue;
    await upsert("profileLanguages", r.Id, { profileId, language: r.Language ?? "" });
  }
  for (const r of markets) {
    const profileId = getId("profiles", r.UserId);
    if (!profileId) continue;
    await upsert("profileMarkets", r.Id, { profileId, market: r.Market ?? "" });
  }
  console.log(`  ✓ langs:${langs.length} markets:${markets.length}`);
}

async function migrateProfileHierarchy() {
  console.log("\n── ProfileHierarchy");
  const rows = await query<any>(`SELECT Id, UserId, ProfileId, IsUpline, Level FROM ProfileHierarchy`);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  await pool(rows, 20, async (r) => {
    const userId = getId("profiles", r.UserId);
    const profileId = getId("profiles", r.ProfileId);
    if (!userId || !profileId) return;
    await upsert("profileHierarchies", r.Id, {
      userId, profileId,
      isUpline: bool(r.IsUpline),
      level: r.Level ?? 1,
    });
  });
  console.log(`  ✓ ${rows.length} rows`);
}

async function migrateProfileFollowers() {
  console.log("\n── ProfileFollower");
  const rows = await query<any>(`SELECT Id, UserId, FollowerOfId FROM ProfileFollower`);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  for (const r of rows) {
    const followerId = getId("profiles", r.UserId);
    const followingId = getId("profiles", r.FollowerOfId);
    if (!followerId || !followingId) continue;
    await upsert("profileFollowers", r.Id, { followerId, followingId });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 5: Groups ──────────────────────────────────────────────────────────

async function migrateGroups() {
  console.log("\n── Group");
  // [Group] needs brackets because it's a SQL reserved word
  const rows = await query<any>(`SELECT Id, UserId, Name FROM [Group]`);
  saveExport("groups", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  for (const r of rows) {
    const ownerId = getId("profiles", r.UserId);
    if (!ownerId) continue;
    await upsert("groups", r.Id, { ownerId, name: r.Name ?? "" });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

async function migrateGroupUsers() {
  console.log("\n── GroupUser");
  const rows = await query<any>(`SELECT Id, UserId, GroupId FROM GroupUser`);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    const groupId = getId("groups", r.GroupId);
    if (!userId || !groupId) continue;
    await upsert("groupUsers", r.Id, { groupId, userId });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 6: Settings ────────────────────────────────────────────────────────

async function migrateSettings() {
  console.log("\n── Settings");
  const rows = await query<any>(`SELECT Id, UserId, SettingName, SettingValue, DisplayOrder FROM Settings`);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    if (!userId) continue;
    await upsert("settings", r.Id, {
      userId,
      settingName: r.SettingName ?? "",
      settingValue: r.SettingValue ?? "",
      displayOrder: r.DisplayOrder ?? 0,
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

// ─── Phase 7: Posts ───────────────────────────────────────────────────────────

async function migratePosts() {
  console.log("\n── Posts");
  const rows = await query<any>(`
    SELECT Id, UserId, Topic, Details, ChinaVideoLink, NonChinaVideoLink,
           MinLevel, MaxLevel, MinRank, Tag, SelectedZone, PostDate,
           Upline, Downline, SelectGroup, Custom, AllowRetweet, MustRead, IsDeleted
    FROM Posts
  `);
  saveExport("posts", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
  for (const r of rows) {
    const userId = getId("profiles", r.UserId);
    if (!userId) continue;
    await upsert("posts", r.Id, {
      userId,
      topic: r.Topic ?? undefined,
      details: r.Details ?? "",
      postDate: toMs(r.PostDate) ?? Date.now(),
      superAccount: false,
      ...visFlags(r),
    });
  }
  console.log(`  ✓ ${rows.length} rows`);
}

async function migratePostChildren() {
  console.log("\n── PostImages");
  const imgs = await query<any>(`SELECT Id, UserId, ImageId, PostId FROM PostImages`);
  if (!DRY_RUN) {
    const orderMap: Record<number, number> = {};
    for (const r of imgs.sort((a: any, b: any) => a.PostId - b.PostId || a.Id - b.Id)) {
      if (!orderMap[r.PostId]) orderMap[r.PostId] = 0;
      const postId = getId("posts", r.PostId);
      const imageId = getId("images", r.ImageId);
      if (!postId || !imageId) continue;
      await upsert("postImages", r.Id, { postId, imageId, order: orderMap[r.PostId]++ });
    }
  }
  console.log(`  ✓ ${imgs.length} rows`);

  console.log("\n── PostMeta");
  const metas = await query<any>(`SELECT Id, UserId, PostId, Type, Comment FROM PostMeta`);
  if (!DRY_RUN) {
    const validTypes = new Set(["Like", "Endorse", "Comment"]);
    for (const r of metas) {
      const postId = getId("posts", r.PostId);
      const userId = getId("profiles", r.UserId);
      if (!postId || !userId) continue;
      await upsert("postMetas", r.Id, {
        postId, userId,
        type: validTypes.has(r.Type) ? r.Type : "Comment",
        comment: r.Comment ?? undefined,
      });
    }
  }
  console.log(`  ✓ ${metas.length} rows`);

  console.log("\n── PostVisibility");
  const vis = await query<any>(`SELECT Id, UserId, PostId, IsRead FROM PostVisibility`);
  if (!DRY_RUN) {
    await pool(vis, 8, async (r) => {
      const postId = getId("posts", r.PostId);
      const userId = getId("profiles", r.UserId);
      if (!postId || !userId) return;
      await upsert("postVisibilities", r.Id, { postId, userId, isRead: bool(r.IsRead) });
    });
  }
  console.log(`  ✓ ${vis.length} rows`);

  const langs = await query<any>(`SELECT Id, UserId, PostId, Language FROM PostLanguage`);
  if (!DRY_RUN) {
    for (const r of langs) {
      const postId = getId("posts", r.PostId);
      if (!postId) continue;
      await upsert("postLanguages", r.Id, { postId, language: r.Language ?? "" });
    }
  }
  const markets = await query<any>(`SELECT Id, UserId, PostId, Market FROM PostMarket`);
  if (!DRY_RUN) {
    for (const r of markets) {
      const postId = getId("posts", r.PostId);
      if (!postId) continue;
      await upsert("postMarkets", r.Id, { postId, market: r.Market ?? "" });
    }
  }
  console.log(`── PostLanguage ✓${langs.length}  PostMarket ✓${markets.length}`);
}

// ─── Phase 8: Events ──────────────────────────────────────────────────────────

async function migrateEvents() {
  console.log("\n── Events");
  const rows = await query<any>(`
    SELECT Id, UserId, EventType, Title, Details, Speaker, EventLink,
           EventDateStart, EventDateEnd, UserEnteredStarted, UserEnteredEnd,
           ChinaVideoLink, NonChinaVideoLink, MinLevel, MaxLevel, MinRank,
           SelectedZone, Upline, Downline, SelectGroup, Custom,
           AllowRetweet, MustRead, IsDeleted
    FROM Events
  `);
  saveExport("events", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
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

async function migrateEventChildren() {
  console.log("\n── EventImage");
  const imgs = await query<any>(`SELECT Id, UserId, ImageId, EventId FROM EventImage`);
  if (!DRY_RUN) {
    const orderMap: Record<number, number> = {};
    for (const r of imgs.sort((a: any, b: any) => a.EventId - b.EventId || a.Id - b.Id)) {
      if (!orderMap[r.EventId]) orderMap[r.EventId] = 0;
      const eventId = getId("events", r.EventId);
      const imageId = getId("images", r.ImageId);
      if (!eventId || !imageId) continue;
      await upsert("eventImages", r.Id, { eventId, imageId, order: orderMap[r.EventId]++ });
    }
  }
  console.log(`  ✓ ${imgs.length} rows`);

  console.log("\n── EventMeta");
  const metas = await query<any>(`SELECT Id, UserId, EventId, Type, Comment FROM EventMeta`);
  if (!DRY_RUN) {
    const validTypes = new Set(["Like", "Endorse", "Comment"]);
    for (const r of metas) {
      const eventId = getId("events", r.EventId);
      const userId = getId("profiles", r.UserId);
      if (!eventId || !userId) continue;
      await upsert("eventMetas", r.Id, {
        eventId, userId,
        type: validTypes.has(r.Type) ? r.Type : "Comment",
        comment: r.Comment ?? undefined,
      });
    }
  }
  console.log(`  ✓ ${metas.length} rows`);

  console.log("\n── EventVisibilities");
  const vis = await query<any>(`SELECT Id, UserId, EventId FROM EventVisibilities`);
  if (!DRY_RUN) {
    await pool(vis, 8, async (r) => {
      const eventId = getId("events", r.EventId);
      const userId = getId("profiles", r.UserId);
      if (!eventId || !userId) return;
      await upsert("eventVisibilities", r.Id, { eventId, userId, isRead: false });
    });
  }
  console.log(`  ✓ ${vis.length} rows`);

  console.log("\n── EventHosts");
  const hosts = await query<any>(`SELECT Id, UserId, EventId FROM EventHosts`);
  if (!DRY_RUN) {
    for (const r of hosts) {
      const eventId = getId("events", r.EventId);
      const userId = getId("profiles", r.UserId);
      if (!eventId || !userId) continue;
      await upsert("eventHosts", r.Id, { eventId, userId });
    }
  }
  console.log(`  ✓ ${hosts.length} rows`);

  console.log("\n── EventAttendance");
  const att = await query<any>(`
    SELECT Id, UserId, EventId, GuestName, PaidBy, PaidTo, PaidVia,
           Amount, TransactionDate, HasAttended, Remarks
    FROM EventAttendance
  `);
  if (!DRY_RUN) {
    for (const r of att) {
      const eventId = getId("events", r.EventId);
      const userId = getId("profiles", r.UserId);
      if (!eventId || !userId) continue;
      await upsert("eventAttendances", r.Id, {
        eventId, userId,
        guestName: r.GuestName ?? undefined,
        paidBy: r.PaidBy ?? "",
        paidTo: r.PaidTo ?? "",
        paidVia: r.PaidVia ?? "",
        amount: Number(r.Amount ?? 0),
        transactionDate: toMs(r.TransactionDate) ?? Date.now(),
        hasAttended: r.HasAttended === null || r.HasAttended === undefined
          ? undefined
          : bool(r.HasAttended),
        remarks: r.Remarks ?? undefined,
      });
    }
  }
  console.log(`  ✓ ${att.length} rows`);

  console.log("\n── EventAttendanceDocument");
  const attDocs = await query<any>(`SELECT Id, UserId, EventAttendanceId, DocumentId FROM EventAttendanceDocument`);
  if (!DRY_RUN) {
    for (const r of attDocs) {
      const eventAttendanceId = getId("eventAttendances", r.EventAttendanceId);
      const documentId = getId("documents", r.DocumentId);
      if (!eventAttendanceId || !documentId) continue;
      await upsert("eventAttendanceDocuments", r.Id, { eventAttendanceId, documentId });
    }
  }
  console.log(`  ✓ ${attDocs.length} rows`);

  const langs = await query<any>(`SELECT Id, UserId, EventId, Language FROM EventLanguage`);
  if (!DRY_RUN) {
    for (const r of langs) {
      const eventId = getId("events", r.EventId);
      if (!eventId) continue;
      await upsert("eventLanguages", r.Id, { eventId, language: r.Language ?? "" });
    }
  }
  const markets = await query<any>(`SELECT Id, UserId, EventId, Market FROM EventMarket`);
  if (!DRY_RUN) {
    for (const r of markets) {
      const eventId = getId("events", r.EventId);
      if (!eventId) continue;
      await upsert("eventMarkets", r.Id, { eventId, market: r.Market ?? "" });
    }
  }
  console.log(`── EventLanguage ✓${langs.length}  EventMarket ✓${markets.length}`);
}

// ─── Phase 9: Library items ───────────────────────────────────────────────────

async function migrateLibraryItems() {
  console.log("\n── LibraryItems");
  const rows = await query<any>(`
    SELECT Id, UserId, CategoryId, Title, Description, Type, Division, Tag,
           PostDate, ChinaVideoLink, NonChinaVideoLink, MinLevel, MaxLevel, MinRank,
           SelectedZone, Upline, Downline, SelectGroup, Custom,
           AllowRetweet, MustRead, IsDeleted
    FROM LibraryItems
  `);
  saveExport("libraryItems", rows);
  if (DRY_RUN) { console.log(`  ${rows.length} rows (dry run)`); return; }
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

async function migrateLibraryChildren() {
  console.log("\n── LibraryImages");
  const imgs = await query<any>(`SELECT Id, UserId, ImageId, LibraryItemId FROM LibraryImages`);
  if (!DRY_RUN) {
    const orderMap: Record<number, number> = {};
    for (const r of imgs.sort((a: any, b: any) => a.LibraryItemId - b.LibraryItemId || a.Id - b.Id)) {
      if (!orderMap[r.LibraryItemId]) orderMap[r.LibraryItemId] = 0;
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      const imageId = getId("images", r.ImageId);
      if (!libraryItemId || !imageId) continue;
      await upsert("libraryImages", r.Id, { libraryItemId, imageId, order: orderMap[r.LibraryItemId]++ });
    }
  }
  console.log(`  ✓ ${imgs.length} rows`);

  console.log("\n── LibraryDocuments");
  const docs = await query<any>(`SELECT Id, UserId, DocumentId, LibraryItemId FROM LibraryDocuments`);
  if (!DRY_RUN) {
    for (const r of docs) {
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      const documentId = getId("documents", r.DocumentId);
      if (!libraryItemId || !documentId) continue;
      await upsert("libraryDocuments", r.Id, { libraryItemId, documentId });
    }
  }
  console.log(`  ✓ ${docs.length} rows`);

  console.log("\n── LibraryItemMeta");
  const metas = await query<any>(`SELECT Id, UserId, LibraryItemId, Type, Comment FROM LibraryItemMeta`);
  if (!DRY_RUN) {
    const validTypes = new Set(["Like", "Endorse", "Comment"]);
    for (const r of metas) {
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      const userId = getId("profiles", r.UserId);
      if (!libraryItemId || !userId) continue;
      await upsert("libraryItemMetas", r.Id, {
        libraryItemId, userId,
        type: validTypes.has(r.Type) ? r.Type : "Comment",
        comment: r.Comment ?? undefined,
      });
    }
  }
  console.log(`  ✓ ${metas.length} rows`);

  console.log("\n── LibraryVisibilities");
  const vis = await query<any>(`SELECT Id, UserId, LibraryItemId, IsRead FROM LibraryVisibilities`);
  if (!DRY_RUN) {
    await pool(vis, 8, async (r) => {
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      const userId = getId("profiles", r.UserId);
      if (!libraryItemId || !userId) return;
      await upsert("libraryVisibilities", r.Id, { libraryItemId, userId, isRead: bool(r.IsRead) });
    });
  }
  console.log(`  ✓ ${vis.length} rows`);

  console.log("\n── Contributors");
  const contribs = await query<any>(`SELECT Id, UserId, LibraryItemId FROM Contributors`);
  if (!DRY_RUN) {
    for (const r of contribs) {
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      const userId = getId("profiles", r.UserId);
      if (!libraryItemId || !userId) continue;
      await upsert("contributors", r.Id, { libraryItemId, userId });
    }
  }
  console.log(`  ✓ ${contribs.length} rows`);

  console.log("\n── DocumentTypes");
  const docTypes = await query<any>(`SELECT Id, UserId, LibraryItemId, TypeName FROM DocumentTypes`);
  if (!DRY_RUN) {
    for (const r of docTypes) {
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      if (!libraryItemId) continue;
      await upsert("documentTypes", r.Id, { libraryItemId, name: r.TypeName ?? "" });
    }
  }
  console.log(`  ✓ ${docTypes.length} rows`);

  const langs = await query<any>(`SELECT Id, UserId, LibraryItemId, Language FROM LibraryLanguage`);
  if (!DRY_RUN) {
    for (const r of langs) {
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      if (!libraryItemId) continue;
      await upsert("libraryLanguages", r.Id, { libraryItemId, language: r.Language ?? "" });
    }
  }
  const markets = await query<any>(`SELECT Id, UserId, LibraryItemId, Market FROM LibraryMarket`);
  if (!DRY_RUN) {
    for (const r of markets) {
      const libraryItemId = getId("libraryItems", r.LibraryItemId);
      if (!libraryItemId) continue;
      await upsert("libraryMarkets", r.Id, { libraryItemId, market: r.Market ?? "" });
    }
  }
  console.log(`── LibraryLanguage ✓${langs.length}  LibraryMarket ✓${markets.length}`);
}

// ─── Phase 10: Support data ───────────────────────────────────────────────────

async function migrateSupportData() {
  console.log("\n── PushNotifications");
  const notifs = await query<any>(`SELECT Id, UserId, Subject, Message, IsRead, Entity, EntityId FROM PushNotifications`);
  if (!DRY_RUN) {
    let done = 0;
    await pool(notifs, 8, async (r) => {
      const userId = getId("profiles", r.UserId);
      if (!userId) return;
      await upsert("pushNotifications", r.Id, {
        userId,
        subject: r.Subject ?? "",
        message: r.Message ?? "",
        isRead: bool(r.IsRead),
        entity: r.Entity ?? "",
        entityId: String(r.EntityId ?? ""),
      });
      done++;
      if (done % 5000 === 0) console.log(`  … ${done}/${notifs.length}`);
    });
  }
  console.log(`  ✓ ${notifs.length} rows`);

  console.log("\n── ContactUs");
  const contacts = await query<any>(`SELECT Id, UserId, Email, Message, DeleteAccount FROM ContactUs`);
  if (!DRY_RUN) {
    for (const r of contacts) {
      const userId = getId("profiles", r.UserId);
      await upsert("contactUs", r.Id, {
        userId: userId ?? undefined,
        email: r.Email ?? "",
        message: r.Message ?? "",
        deleteAccountRequest: bool(r.DeleteAccount),
      });
    }
  }
  console.log(`  ✓ ${contacts.length} rows`);

  console.log("\n── ErrorLog");
  const errors = await query<any>(`SELECT Id, UserId, ErrorMessage, Tag FROM ErrorLog`);
  if (!DRY_RUN) {
    for (const r of errors) {
      const userId = getId("profiles", r.UserId);
      await upsert("errorLogs", r.Id, {
        userId: userId ?? undefined,
        tag: String(r.Tag ?? ""),
        message: r.ErrorMessage ?? "",
      });
    }
  }
  console.log(`  ✓ ${errors.length} rows`);
}

// ─── Verification ─────────────────────────────────────────────────────────────

const VERIFY_PAIRS: Array<{ sql: string; convex: string }> = [
  { sql: "Profiles", convex: "profiles" },
  { sql: "Posts", convex: "posts" },
  { sql: "Events", convex: "events" },
  { sql: "LibraryItems", convex: "libraryItems" },
  { sql: "PostVisibility", convex: "postVisibilities" },
  { sql: "EventAttendance", convex: "eventAttendances" },
  { sql: "ProfileHierarchy", convex: "profileHierarchies" },
  { sql: "[Group]", convex: "groups" },
  { sql: "Images", convex: "images" },
  { sql: "Documents", convex: "documents" },
  { sql: "PushNotifications", convex: "pushNotifications" },
];

async function verify() {
  console.log("\n── Verification\n");
  console.log("Table".padEnd(28) + "SQL".padStart(8) + "Convex".padStart(10) + "Match".padStart(8));
  console.log("─".repeat(54));
  for (const { sql: t, convex } of VERIFY_PAIRS) {
    const sqlCount = await count(t);
    const convexCount = (await callQuery("migration:countTable", { table: convex })) as number;
    const ok = sqlCount === convexCount;
    const label = t.replace("[", "").replace("]", "");
    console.log(
      label.padEnd(28) +
      String(sqlCount).padStart(8) +
      String(convexCount).padStart(10) +
      (ok ? "  ✓" : "  ✗ MISMATCH").padStart(8)
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Oolala  SQL Server → Convex Migration");
  if (DRY_RUN) console.log("MODE: DRY RUN (no writes to Convex)");
  if (VERIFY)  console.log("MODE: VERIFY");
  console.log("=".repeat(60));

  await connect();

  if (VERIFY) { await verify(); await disconnect(); return; }

  await migrateUserRanks();
  await migrateDivisions();
  await migrateCategories();
  await migrateProfiles();
  await migrateImages();
  await migrateDocuments();
  await migrateProfileImages();
  await migrateProfileLanguagesMarkets();
  await migrateProfileHierarchy();
  await migrateProfileFollowers();
  await migrateGroups();
  await migrateGroupUsers();
  await migrateSettings();
  await migratePosts();
  await migratePostChildren();
  await migrateEvents();
  await migrateEventChildren();
  await migrateLibraryItems();
  await migrateLibraryChildren();
  await migrateSupportData();

  console.log("\n" + "=".repeat(60));
  console.log("Migration complete!");
  console.log("=".repeat(60));
  console.log("\nNext: run --verify, then notify users to reset passwords.");

  await disconnect();
}

main().catch(async (err) => {
  console.error("\n✗ Migration failed:", err.message ?? err);
  await disconnect().catch(() => {});
  process.exit(1);
});
