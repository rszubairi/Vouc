import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * NOTE: During migration every document gets a temporary `sqlId` field
 * (the original SQL Server int PK). This is used by migration/migrate.ts
 * for FK resolution and idempotency checks. Run migration/cleanup-sqlids.ts
 * after the migration is verified to remove these fields.
 *
 * Because migration.ts casts ctx.db to `any` and bypasses schema validation,
 * the extra field is stored even without declaring it in every table.
 * We only declare it on the tables where findBySqlId() queries are issued.
 */

export default defineSchema(
  {
    ...authTables,

    // ─── User / Identity ─────────────────────────────────────────────────────

    profiles: defineTable({
      sqlId: v.optional(v.number()), // original SQL Server PK — removed after migration
      userId: v.string(), // Convex Auth identity id
      sponsorId: v.optional(v.id("profiles")),
      sponsorApproved: v.boolean(),
      userRankId: v.optional(v.id("userRanks")),
      nickName: v.string(),
      firstName: v.string(),
      middleName: v.optional(v.string()),
      lastName: v.string(),
      emailAddress: v.string(),
      sponsorEmailAddress: v.string(),
      phoneNumber: v.optional(v.string()),
      birthDate: v.optional(v.number()),
      addressLine1: v.optional(v.string()),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      zipCode: v.optional(v.string()),
      country: v.string(),
      bio: v.optional(v.string()),
      deviceToken: v.optional(v.string()), // FCM push token
      fullAccess: v.boolean(),
      fullAccessExpiryDate: v.optional(v.number()),
      deleteAccount: v.boolean(),
      deleteRequestDate: v.optional(v.number()),
      website: v.optional(v.string()),
      facebook: v.optional(v.string()),
      instagram: v.optional(v.string()),
      twitter: v.optional(v.string()),
      line: v.optional(v.string()),
      tiktok: v.optional(v.string()),
      discord: v.optional(v.string()),
      weChat: v.optional(v.string()),
      isAdmin: v.optional(v.boolean()), // grants access to the /dashboard admin console
    })
      .index("by_userId", ["userId"])
      .index("by_email", ["emailAddress"])
      .index("by_sponsorId", ["sponsorId"]),

    profileImages: defineTable({
      profileId: v.id("profiles"),
      imageId: v.id("images"),
      isPrimary: v.boolean(),
    }).index("by_profileId", ["profileId"]),

    profileLanguages: defineTable({
      profileId: v.id("profiles"),
      language: v.string(),
    }).index("by_profileId", ["profileId"]),

    profileMarkets: defineTable({
      profileId: v.id("profiles"),
      market: v.string(),
    }).index("by_profileId", ["profileId"]),

    userRanks: defineTable({
      name: v.string(),
      abbreviation: v.string(),
      displayOrder: v.number(),
    }),

    // ─── Hierarchy ────────────────────────────────────────────────────────────

    // Pre-computed flat map of the entire ancestor/descendant chain per profile.
    // Rebuilt whenever sponsorApproved changes.
    profileHierarchies: defineTable({
      profileId: v.id("profiles"), // reference/root profile
      userId: v.id("profiles"),    // ancestor or descendant
      isUpline: v.boolean(),       // true = userId is ancestor of profileId
      level: v.number(),           // depth from profileId (1 = direct)
    })
      .index("by_profileId", ["profileId"])
      .index("by_profileId_isUpline", ["profileId", "isUpline"]),

    profileFollowers: defineTable({
      followerId: v.id("profiles"),
      followingId: v.id("profiles"),
    })
      .index("by_followerId", ["followerId"])
      .index("by_followingId", ["followingId"]),

    // ─── Groups ───────────────────────────────────────────────────────────────

    groups: defineTable({
      ownerId: v.id("profiles"),
      name: v.string(),
    }).index("by_ownerId", ["ownerId"]),

    groupUsers: defineTable({
      groupId: v.id("groups"),
      userId: v.id("profiles"),
    })
      .index("by_groupId", ["groupId"])
      .index("by_userId", ["userId"]),

    // ─── Posts ────────────────────────────────────────────────────────────────

    posts: defineTable({
      userId: v.id("profiles"),
      topic: v.optional(v.string()),
      details: v.string(),
      chinaVideoLink: v.optional(v.string()),
      nonChinaVideoLink: v.optional(v.string()),
      tag: v.optional(v.string()),
      postDate: v.number(),
      selectedZone: v.optional(v.string()),
      allowRetweet: v.boolean(),
      mustRead: v.boolean(),
      isDeleted: v.boolean(),
      superAccount: v.boolean(),
      // Visibility flags
      toUpline: v.boolean(),
      toDownline: v.boolean(),
      toSelectGroup: v.boolean(),
      toCustom: v.boolean(),
      // Group target (when toSelectGroup = true)
      groupId: v.optional(v.id("groups")),
      // Level/rank constraints
      minLevel: v.optional(v.string()),
      maxLevel: v.optional(v.string()),
      minRank: v.optional(v.string()),
    })
      .index("by_userId", ["userId"])
      .index("by_postDate", ["postDate"]),

    postImages: defineTable({
      postId: v.id("posts"),
      imageId: v.id("images"),
      order: v.number(),
    }).index("by_postId", ["postId"]),

    postMetas: defineTable({
      postId: v.id("posts"),
      userId: v.id("profiles"),
      type: v.union(v.literal("Like"), v.literal("Endorse"), v.literal("Comment")),
      comment: v.optional(v.string()),
    })
      .index("by_postId", ["postId"])
      .index("by_postId_userId_type", ["postId", "userId", "type"]),

    postVisibilities: defineTable({
      postId: v.id("posts"),
      userId: v.id("profiles"),
      isRead: v.boolean(),
    })
      .index("by_postId", ["postId"])
      .index("by_userId", ["userId"])
      .index("by_postId_userId", ["postId", "userId"]),

    postLanguages: defineTable({
      postId: v.id("posts"),
      language: v.string(),
    }).index("by_postId", ["postId"]),

    postMarkets: defineTable({
      postId: v.id("posts"),
      market: v.string(),
    }).index("by_postId", ["postId"]),

    // ─── Events ───────────────────────────────────────────────────────────────

    events: defineTable({
      userId: v.id("profiles"),
      eventType: v.string(),
      title: v.string(),
      details: v.string(),
      speaker: v.optional(v.string()),
      eventLink: v.optional(v.string()),
      eventDateStart: v.number(),
      eventDateEnd: v.number(),
      userEnteredStart: v.optional(v.number()),
      userEnteredEnd: v.optional(v.number()),
      selectedZone: v.optional(v.string()),
      chinaVideoLink: v.optional(v.string()),
      nonChinaVideoLink: v.optional(v.string()),
      noPayment: v.boolean(),
      allowRetweet: v.boolean(),
      mustRead: v.boolean(),
      isDeleted: v.boolean(),
      superAccount: v.boolean(),
      toUpline: v.boolean(),
      toDownline: v.boolean(),
      toSelectGroup: v.boolean(),
      toCustom: v.boolean(),
      groupId: v.optional(v.id("groups")),
      minLevel: v.optional(v.string()),
      maxLevel: v.optional(v.string()),
      minRank: v.optional(v.string()),
    })
      .index("by_userId", ["userId"])
      .index("by_eventDateStart", ["eventDateStart"]),

    eventImages: defineTable({
      eventId: v.id("events"),
      imageId: v.id("images"),
      order: v.number(),
    }).index("by_eventId", ["eventId"]),

    eventMetas: defineTable({
      eventId: v.id("events"),
      userId: v.id("profiles"),
      type: v.union(v.literal("Like"), v.literal("Endorse"), v.literal("Comment")),
      comment: v.optional(v.string()),
    }).index("by_eventId", ["eventId"]),

    eventVisibilities: defineTable({
      eventId: v.id("events"),
      userId: v.id("profiles"),
      isRead: v.boolean(),
    })
      .index("by_eventId", ["eventId"])
      .index("by_userId", ["userId"])
      .index("by_eventId_userId", ["eventId", "userId"]),

    eventHosts: defineTable({
      eventId: v.id("events"),
      userId: v.id("profiles"),
    }).index("by_eventId", ["eventId"]),

    eventAttendances: defineTable({
      eventId: v.id("events"),
      userId: v.id("profiles"),
      guestName: v.optional(v.string()),
      paidBy: v.string(),
      paidTo: v.string(),
      paidVia: v.string(),
      amount: v.number(),
      transactionDate: v.number(),
      hasAttended: v.optional(v.boolean()),
      remarks: v.optional(v.string()),
    })
      .index("by_eventId", ["eventId"])
      .index("by_userId", ["userId"]),

    eventAttendanceDocuments: defineTable({
      eventAttendanceId: v.id("eventAttendances"),
      documentId: v.id("documents"),
    }).index("by_eventAttendanceId", ["eventAttendanceId"]),

    eventLanguages: defineTable({
      eventId: v.id("events"),
      language: v.string(),
    }).index("by_eventId", ["eventId"]),

    eventMarkets: defineTable({
      eventId: v.id("events"),
      market: v.string(),
    }).index("by_eventId", ["eventId"]),

    // ─── Library / Resources ──────────────────────────────────────────────────

    libraryItems: defineTable({
      userId: v.id("profiles"),
      title: v.string(),
      description: v.string(),
      type: v.string(), // "Product" | "Document" | "Article" | etc.
      categoryId: v.optional(v.id("categories")),
      division: v.optional(v.string()),
      tag: v.optional(v.string()),
      postDate: v.number(),
      selectedZone: v.optional(v.string()),
      chinaVideoLink: v.optional(v.string()),
      nonChinaVideoLink: v.optional(v.string()),
      allowRetweet: v.boolean(),
      mustRead: v.boolean(),
      isDeleted: v.boolean(),
      superAccount: v.boolean(),
      toUpline: v.boolean(),
      toDownline: v.boolean(),
      toSelectGroup: v.boolean(),
      toCustom: v.boolean(),
      groupId: v.optional(v.id("groups")),
      minLevel: v.optional(v.string()),
      maxLevel: v.optional(v.string()),
      minRank: v.optional(v.string()),
    })
      .index("by_userId", ["userId"])
      .index("by_categoryId", ["categoryId"]),

    libraryImages: defineTable({
      libraryItemId: v.id("libraryItems"),
      imageId: v.id("images"),
      order: v.number(),
    }).index("by_libraryItemId", ["libraryItemId"]),

    libraryDocuments: defineTable({
      libraryItemId: v.id("libraryItems"),
      documentId: v.id("documents"),
    }).index("by_libraryItemId", ["libraryItemId"]),

    libraryItemMetas: defineTable({
      libraryItemId: v.id("libraryItems"),
      userId: v.id("profiles"),
      type: v.union(v.literal("Like"), v.literal("Endorse"), v.literal("Comment")),
      comment: v.optional(v.string()),
    }).index("by_libraryItemId", ["libraryItemId"]),

    libraryVisibilities: defineTable({
      libraryItemId: v.id("libraryItems"),
      userId: v.id("profiles"),
      isRead: v.boolean(),
    })
      .index("by_libraryItemId", ["libraryItemId"])
      .index("by_userId", ["userId"])
      .index("by_libraryItemId_userId", ["libraryItemId", "userId"]),

    contributors: defineTable({
      libraryItemId: v.id("libraryItems"),
      userId: v.id("profiles"),
    }).index("by_libraryItemId", ["libraryItemId"]),

    documentTypes: defineTable({
      libraryItemId: v.id("libraryItems"),
      name: v.string(),
    }).index("by_libraryItemId", ["libraryItemId"]),

    libraryLanguages: defineTable({
      libraryItemId: v.id("libraryItems"),
      language: v.string(),
    }).index("by_libraryItemId", ["libraryItemId"]),

    libraryMarkets: defineTable({
      libraryItemId: v.id("libraryItems"),
      market: v.string(),
    }).index("by_libraryItemId", ["libraryItemId"]),

    // ─── Products / Divisions ─────────────────────────────────────────────────

    divisions: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      displayOrder: v.number(),
    }),

    categories: defineTable({
      divisionId: v.optional(v.id("divisions")),
      name: v.string(),
      description: v.optional(v.string()),
      displayOrder: v.number(),
    }).index("by_divisionId", ["divisionId"]),

    // ─── Media ────────────────────────────────────────────────────────────────

    images: defineTable({
      userId: v.optional(v.id("profiles")), // absent for legacy images with no known uploader
      url: v.string(),       // CDN URL
      storageId: v.optional(v.string()), // Convex storage id if self-hosted
    }).index("by_userId", ["userId"]),

    documents: defineTable({
      userId: v.id("profiles"),
      name: v.string(),
      url: v.string(),
      storageId: v.optional(v.string()),
    }).index("by_userId", ["userId"]),

    // ─── Notifications ────────────────────────────────────────────────────────

    pushNotifications: defineTable({
      userId: v.id("profiles"),
      subject: v.string(),
      message: v.string(),
      entity: v.string(), // "Post" | "Event" | "LibraryItem"
      entityId: v.string(),
      isRead: v.boolean(),
    })
      .index("by_userId", ["userId"])
      .index("by_userId_isRead", ["userId", "isRead"]),

    // ─── Settings & Support ───────────────────────────────────────────────────

    settings: defineTable({
      userId: v.id("profiles"),
      settingName: v.string(),
      settingValue: v.string(),
      displayOrder: v.number(),
    }).index("by_userId", ["userId"]),

    contactUs: defineTable({
      userId: v.optional(v.id("profiles")),
      email: v.string(),
      message: v.string(),
      deleteAccountRequest: v.boolean(),
    }),

    errorLogs: defineTable({
      userId: v.optional(v.id("profiles")),
      tag: v.string(),
      message: v.string(),
    }),
  },
  { schemaValidation: false } // re-enable after migration is complete
);
