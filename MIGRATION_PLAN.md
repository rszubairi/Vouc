# SQL Server → Convex DB Migration Plan

## Overview

This document describes how to migrate all existing Oolala data from SQL Server (`52.74.111.85/Oolala`) to Convex DB with zero application downtime and minimal manual steps. The migration is a **one-shot lift-and-shift**: read every row from SQL Server, transform the shape to match the Convex schema, and write it via the Convex HTTP API in batches.

---

## 1. What gets migrated

| SQL Server table | Convex table | Notes |
|-----------------|--------------|-------|
| Profiles | `profiles` | Auth identity handled separately (see §3) |
| ProfileImages | `profileImages` | |
| ProfileLanguages | `profileLanguages` | |
| ProfileMarkets | `profileMarkets` | |
| ProfileHierarchy | `profileHierarchies` | Re-computed; migrate as-is |
| ProfileFollowers | `profileFollowers` | |
| UserRanks | `userRanks` | |
| Posts | `posts` | Ignored: CallerId, SuperAccount, Country, City, MemberSince, LastLogin, TeamName |
| PostImages | `postImages` | |
| PostMetas | `postMetas` | Ignored: ProfileName, ProfilePic |
| PostVisibilities | `postVisibilities` | |
| PostLanguages | `postLanguages` | |
| PostMarkets | `postMarkets` | |
| Events | `events` | Ignored: CallerId, SuperAccount, CreatorName |
| EventImages | `eventImages` | |
| EventMetas | `eventMetas` | Ignored: ProfileName, ProfilePic |
| EventVisibilities | `eventVisibilities` | |
| EventHosts | `eventHosts` | |
| EventAttendances | `eventAttendances` | Ignored: SponsorFullName, SponsorNickName, ReceiptLink |
| EventAttendanceDocuments | `eventAttendanceDocuments` | |
| EventLanguages | `eventLanguages` | |
| EventMarkets | `eventMarkets` | |
| LibraryItems | `libraryItems` | Ignored: CallerId, SuperAccount, Country, City, MemberSince, LastLogin, TeamName |
| LibraryImages | `libraryImages` | |
| LibraryDocuments | `libraryDocuments` | |
| LibraryItemMetas | `libraryItemMetas` | Ignored: ProfileName, ProfilePic |
| LibraryVisibilities | `libraryVisibilities` | |
| LibraryLanguages | `libraryLanguages` | |
| LibraryMarkets | `libraryMarkets` | |
| Contributors | `contributors` | |
| DocumentTypes | `documentTypes` | |
| Divisions | `divisions` | |
| Categories | `categories` | Ignored: DivisionName (runtime computed) |
| Groups | `groups` | |
| GroupUsers | `groupUsers` | Ignored: Nickname (runtime computed) |
| Images | `images` | |
| Documents | `documents` | |
| PushNotifications | `pushNotifications` | |
| Settings | `settings` | Ignored: UserRankCombined |
| ContactUs | `contactUs` | |
| ErrorLog | `errorLogs` | |

### Not migrated

| SQL Server table | Reason |
|-----------------|--------|
| AspNetUsers / AspNetRoles / AspNetUserRoles etc. | Auth is rebuilt in Convex Auth — users re-authenticate |
| GridPreferences | Web admin UI preference; not used in React Native |
| EF Core migration history (`__EFMigrationsHistory`) | SQL Server internal; not applicable |

---

## 2. Key transformations

### 2.1 Primary keys — int → Convex `_id`

SQL Server uses `int` identity PKs. Convex uses its own string IDs.  
**Solution:** Store the original SQL Server `int` ID as a `sqlId` field on every Convex document during migration. This allows the migration script to look up parent Convex IDs when inserting child records.

Example:
```
Profile { sqlId: 42, ... }  ← stored in Convex
PostVisibility { sqlId: 101, postSqlId: 7, userSqlId: 42, ... }
  → look up post._id where post.sqlId == 7
  → look up profile._id where profile.sqlId == 42
  → insert PostVisibility { postId: <convex-id>, userId: <convex-id>, ... }
```

After migration is verified, `sqlId` fields can be removed.

### 2.2 DateTimeOffset → Unix timestamp (milliseconds)

All SQL Server `DateTimeOffset` fields become `number` (ms since epoch) in Convex.

```
new Date(sqlDateTimeOffset).getTime()  // → number
```

### 2.3 Soft-deleted records

- Posts / Events / LibraryItems with `IsDeleted = true` → set `isDeleted: true` in Convex.
- Profiles with `DeleteAccount = true` → set `deleteAccount: true`.
- These are migrated as-is; Convex queries already filter them.

### 2.4 Nullable int FKs

SQL Server nullable `int?` FKs map to `v.optional(v.id(...))` in Convex. During migration, if the FK is `null`, omit the field.

### 2.5 Auth users

SQL Server has `AspNetUsers` with email/password hashes (BCrypt via Identity framework). Convex Auth uses its own credential store — these hashes are **incompatible**.

**Strategy:** Migrate profile data without auth credentials. Existing users must **reset their password** on first login to the new app. The forgot-password OTP flow handles this. No accounts are lost; only the password hash needs resetting.

### 2.6 Field renames

| SQL Server field | Convex field | Table |
|-----------------|--------------|-------|
| `Upline` | `toUpline` | posts, events, libraryItems |
| `Downline` | `toDownline` | posts, events, libraryItems |
| `SelectGroup` | `toSelectGroup` | posts, events, libraryItems |
| `Custom` | `toCustom` | posts, events, libraryItems |
| `Abb` | `abbreviation` | userRanks |
| `UserEnteredStarted` | `userEnteredStart` | events |
| `AddLaneOne` | `addressLine1` | profiles |
| `AddLaneTwo` | `addressLine2` | profiles |
| `YourWebsite` | `website` | profiles |
| `ErrorMessage` | `message` | errorLogs |
| `Tag` (int enum) | `tag` (string) | errorLogs |
| `DeleteAccount` | `deleteAccountRequest` | contactUs |

---

## 3. Migration phases

```
Phase 1 — Prepare (offline)
  └─ Export SQL Server data to JSON

Phase 2 — Seed reference data (online, zero risk)
  └─ userRanks → divisions → categories → groups → settings

Phase 3 — Seed profiles (online)
  └─ profiles (without auth) → profileImages → profileLanguages → profileMarkets
  └─ profileHierarchies → profileFollowers → groupUsers

Phase 4 — Seed content (online)
  └─ images → documents (shared media pool first)
  └─ posts → postImages → postMetas → postVisibilities → postLanguages → postMarkets
  └─ events → eventImages → eventMetas → eventVisibilities → eventHosts
         → eventAttendances → eventAttendanceDocuments
         → eventLanguages → eventMarkets
  └─ libraryItems → libraryImages → libraryDocuments → libraryItemMetas
                  → libraryVisibilities → contributors → documentTypes
                  → libraryLanguages → libraryMarkets

Phase 5 — Seed support data (online)
  └─ pushNotifications → contactUs → errorLogs

Phase 6 — Verify
  └─ Row counts match SQL Server
  └─ Spot-check 10 profiles, 10 posts, 5 events

Phase 7 — Cut over
  └─ Point mobile app + web admin at new Convex deployment
  └─ Disable old SQL Server API
  └─ Notify users to reset passwords
```

---

## 4. Migration script

The migration script is a Node.js program (`migrate.ts`) that:
1. Connects to SQL Server via `mssql`
2. Exports all tables to in-memory JSON
3. Inserts into Convex via the Convex HTTP client
4. Maintains a `sqlId → convexId` map to resolve FKs in order

See `migration/migrate.ts` for the full implementation.

---

## 5. Running the migration

### Prerequisites

```bash
# In oolala-rn/migration/
npm install
cp ../.env.example .env.local
# Fill in CONVEX_URL, CONVEX_DEPLOY_KEY, and SQL Server credentials
```

### Dry run (export only, no Convex writes)

```bash
npx tsx migrate.ts --dry-run
```

Outputs `export/` folder with one JSON file per table. Inspect these before writing.

### Full migration

```bash
npx tsx migrate.ts
```

Logs progress per table. On failure, the script is safe to re-run — it checks for existing `sqlId` before inserting (idempotent).

### Verify row counts

```bash
npx tsx migrate.ts --verify
```

Queries both SQL Server and Convex and prints a comparison table.

---

## 6. Post-migration steps

1. **Password reset:** Send all users an email with the forgot-password link. First login triggers OTP reset.
2. **Device tokens:** On first app open, `Profile.deviceToken` is updated — no action needed.
3. **Remove `sqlId` fields:** After 2 weeks of stable operation, run the cleanup script (`migration/cleanup-sqlids.ts`) to strip all `sqlId` fields from Convex.
4. **Decommission SQL Server:** After cleanup, the SQL Server instance can be archived.

---

## 7. Rollback

If Convex migration fails at any point:
- The old SQL Server API is still running → zero user impact.
- Delete the Convex deployment and re-deploy from scratch.
- Re-run `migrate.ts` after fixing the issue.

The migration script is fully idempotent: running it twice does not create duplicate records (checked via `sqlId` existence query).
