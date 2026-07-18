import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseLevel } from "./hierarchy";
import { requireAdmin } from "./adminAuth";

const attachmentInput = v.object({
  storageId: v.id("_storage"),
  kind: v.union(v.literal("image"), v.literal("file")),
  fileName: v.optional(v.string()),
});

async function saveAttachments(
  ctx: any,
  profileId: Id<"profiles">,
  eventId: Id<"events">,
  attachments: Array<{ storageId: Id<"_storage">; kind: "image" | "file"; fileName?: string }> | undefined
) {
  if (!attachments) return;
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    const url = await ctx.storage.getUrl(a.storageId);
    if (!url) continue;
    if (a.kind === "image") {
      const imageId = await ctx.db.insert("images", { userId: profileId, url, storageId: a.storageId });
      await ctx.db.insert("eventImages", { eventId, imageId, order: i });
    } else {
      const documentId = await ctx.db.insert("documents", {
        userId: profileId,
        name: a.fileName ?? "File",
        url,
        storageId: a.storageId,
      });
      await ctx.db.insert("eventFiles", { eventId, documentId, order: i });
    }
  }
}

async function attachmentsFor(ctx: any, eventId: Id<"events">) {
  const imageRows = await ctx.db
    .query("eventImages")
    .withIndex("by_eventId", (q: any) => q.eq("eventId", eventId))
    .collect();
  const fileRows = await ctx.db
    .query("eventFiles")
    .withIndex("by_eventId", (q: any) => q.eq("eventId", eventId))
    .collect();

  const attachments: Array<{ kind: "image" | "file"; url: string; name?: string; order: number }> = [];
  for (const row of imageRows) {
    const img = await ctx.db.get(row.imageId);
    if (img) attachments.push({ kind: "image", url: img.url, order: row.order });
  }
  for (const row of fileRows) {
    const doc = await ctx.db.get(row.documentId);
    if (doc) attachments.push({ kind: "file", url: doc.url, name: doc.name, order: row.order });
  }
  attachments.sort((a, b) => a.order - b.order);
  return attachments;
}

async function getCallerProfile(ctx: any) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", authUserId))
    .first();
  if (!profile || profile.deleteAccount || profile.isDisabled) throw new Error("Profile not found");
  return profile;
}

async function distributeEvent(
  ctx: any,
  eventId: Id<"events">,
  creatorProfile: any,
  event: {
    toUpline: boolean;
    toDownline: boolean;
    toSelectGroup: boolean;
    groupId?: Id<"groups">;
    toCustom: boolean;
    minLevel?: string;
    maxLevel?: string;
    minRank?: string;
  }
) {
  const recipientIds = new Set<string>();
  recipientIds.add(creatorProfile._id);

  const maxLevelNum = parseLevel(event.maxLevel);
  const minLevelNum = parseLevel(event.minLevel);

  if (event.toUpline) {
    const upline = await ctx.runQuery(internal.hierarchy.getUplineIds, {
      profileId: creatorProfile._id,
      maxLevel: maxLevelNum,
    });
    for (const { userId } of upline) recipientIds.add(userId);
  }

  if (event.toDownline) {
    const downline = await ctx.runQuery(internal.hierarchy.getDownlineIds, {
      profileId: creatorProfile._id,
      maxLevel: minLevelNum,
    });
    for (const { userId } of downline) recipientIds.add(userId);
  }

  if (event.toSelectGroup && event.groupId) {
    const groupUsers = await ctx.db
      .query("groupUsers")
      .withIndex("by_groupId", (q: any) => q.eq("groupId", event.groupId))
      .collect();
    for (const gu of groupUsers) recipientIds.add(gu.userId);
  }

  for (const userId of recipientIds) {
    const profileId = userId as Id<"profiles">;
    const existing = await ctx.db
      .query("eventVisibilities")
      .withIndex("by_eventId_userId", (q: any) =>
        q.eq("eventId", eventId).eq("userId", profileId)
      )
      .first();
    if (!existing) {
      await ctx.db.insert("eventVisibilities", {
        eventId,
        userId: profileId,
        isRead: profileId === creatorProfile._id,
      });
    }
  }
}

export const createEvent = mutation({
  args: {
    eventTypes: v.array(v.string()),
    title: v.string(),
    details: v.string(),
    speaker: v.optional(v.string()),
    eventLink: v.optional(v.string()),
    eventDateStart: v.number(),
    eventDateEnd: v.number(),
    selectedZone: v.optional(v.string()),
    chinaVideoLink: v.optional(v.string()),
    nonChinaVideoLink: v.optional(v.string()),
    noPayment: v.boolean(),
    allowRetweet: v.boolean(),
    mustRead: v.boolean(),
    toUpline: v.boolean(),
    toDownline: v.boolean(),
    toSelectGroup: v.boolean(),
    groupId: v.optional(v.id("groups")),
    toCustom: v.boolean(),
    minLevel: v.optional(v.string()),
    maxLevel: v.optional(v.string()),
    minRank: v.optional(v.string()),
    coHostIds: v.optional(v.array(v.id("profiles"))),
    attachments: v.optional(v.array(attachmentInput)),
  },
  handler: async (ctx, args) => {
    const profile = await getCallerProfile(ctx);

    const eventId = await ctx.db.insert("events", {
      userId: profile._id,
      eventTypes: args.eventTypes,
      title: args.title,
      details: args.details,
      speaker: args.speaker,
      eventLink: args.eventLink,
      eventDateStart: args.eventDateStart,
      eventDateEnd: args.eventDateEnd,
      selectedZone: args.selectedZone,
      chinaVideoLink: args.chinaVideoLink,
      nonChinaVideoLink: args.nonChinaVideoLink,
      noPayment: args.noPayment,
      allowRetweet: args.allowRetweet,
      mustRead: args.mustRead,
      isDeleted: false,
      superAccount: false,
      toUpline: args.toUpline,
      toDownline: args.toDownline,
      toSelectGroup: args.toSelectGroup,
      groupId: args.groupId,
      toCustom: args.toCustom,
      minLevel: args.minLevel,
      maxLevel: args.maxLevel,
      minRank: args.minRank,
    });

    // Co-hosts
    if (args.coHostIds) {
      for (const hostId of args.coHostIds) {
        await ctx.db.insert("eventHosts", { eventId, userId: hostId });
      }
    }

    await saveAttachments(ctx, profile._id, eventId, args.attachments);

    await distributeEvent(ctx, eventId, profile, args);

    return eventId;
  },
});

export const calendarEvents = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();
    if (!callerProfile || callerProfile.deleteAccount || callerProfile.isDisabled) return [];

    let eventIds: Set<Id<"events">>;
    if (callerProfile.fullAccess) {
      // Full-access accounts see every event regardless of visibility records.
      const all = await ctx.db.query("events").collect();
      eventIds = new Set(all.map((e) => e._id));
    } else {
      const visibilities = await ctx.db
        .query("eventVisibilities")
        .withIndex("by_userId", (q) => q.eq("userId", callerProfile._id))
        .collect();
      eventIds = new Set(visibilities.map((v) => v.eventId));
    }

    const results = [];
    for (const eventId of eventIds) {
      const event = await ctx.db.get(eventId);
      if (!event || event.isDeleted) continue;
      if (event.eventDateStart < startDate || event.eventDateStart > endDate) continue;
      results.push(event);
    }

    results.sort((a, b) => a.eventDateStart - b.eventDateStart);
    return results;
  },
});

export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.isDeleted) return null;

    const creator = await ctx.db.get(event.userId);
    const hosts = await ctx.db
      .query("eventHosts")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
    const hostProfiles = await Promise.all(hosts.map((h) => ctx.db.get(h.userId)));
    const attendances = await ctx.db
      .query("eventAttendances")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
    const metas = await ctx.db
      .query("eventMetas")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();

    let isHost = false;
    const authUserId = await getAuthUserId(ctx);
    if (authUserId) {
      const callerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", authUserId))
        .first();
      isHost =
        !!callerProfile &&
        (callerProfile._id === event.userId ||
          hosts.some((h) => h.userId === callerProfile._id));
    }

    return {
      ...event,
      creatorNickName: creator?.nickName ?? "",
      hosts: hostProfiles
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => ({ _id: p._id, nickName: p.nickName })),
      hostCount: hosts.length,
      attendeeCount: attendances.length,
      likeCount: metas.filter((m) => m.type === "Like").length,
      commentCount: metas.filter((m) => m.type === "Comment").length,
      attachments: await attachmentsFor(ctx, eventId),
      isHost,
    };
  },
});

// Registration/RSVP list — only visible to the event owner or its hosts.
export const getEventAttendees = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const profile = await getCallerProfile(ctx);
    const event = await ctx.db.get(eventId);
    if (!event || event.isDeleted) throw new Error("Event not found");

    const hosts = await ctx.db
      .query("eventHosts")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
    const isHost = profile._id === event.userId || hosts.some((h) => h.userId === profile._id);
    if (!isHost) throw new Error("Not authorized");

    const attendances = await ctx.db
      .query("eventAttendances")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
    const attendeeProfiles = await Promise.all(attendances.map((a) => ctx.db.get(a.userId)));

    return attendances.map((a, i) => ({
      ...a,
      attendeeNickName: attendeeProfiles[i]?.nickName ?? "Unknown",
    }));
  },
});

export const rsvpEvent = mutation({
  args: {
    eventId: v.id("events"),
    attending: v.boolean(),
    paidBy: v.string(),
    paidTo: v.string(),
    paidVia: v.string(),
    amount: v.number(),
    transactionDate: v.number(),
    guestCount: v.optional(v.number()),
    guestNames: v.optional(v.array(v.string())),
    remarks: v.optional(v.string()),
    receipts: v.optional(v.array(attachmentInput)),
  },
  handler: async (ctx, args) => {
    const profile = await getCallerProfile(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.isDeleted) throw new Error("Event not found");

    const attendanceId = await ctx.db.insert("eventAttendances", {
      eventId: args.eventId,
      userId: profile._id,
      attending: args.attending,
      guestCount: args.guestCount,
      guestNames: args.guestNames,
      paidBy: args.paidBy,
      paidTo: args.paidTo,
      paidVia: args.paidVia,
      amount: args.amount,
      transactionDate: args.transactionDate,
      remarks: args.remarks,
    });

    if (args.receipts) {
      for (const receipt of args.receipts) {
        const url = await ctx.storage.getUrl(receipt.storageId);
        if (!url) continue;
        const docId = await ctx.db.insert("documents", {
          userId: profile._id,
          name: receipt.fileName ?? "Receipt",
          url,
          storageId: receipt.storageId,
        });
        await ctx.db.insert("eventAttendanceDocuments", {
          eventAttendanceId: attendanceId,
          documentId: docId,
        });
      }
    }

    return attendanceId;
  },
});

export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const profile = await getCallerProfile(ctx);
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    if (event.userId !== profile._id) throw new Error("Not authorized");
    await ctx.db.patch(eventId, { isDeleted: true });
  },
});

// ─── Admin ──────────────────────────────────────────────────────────────────

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").order("desc").take(500);
    const creators = await Promise.all(events.map((e) => ctx.db.get(e.userId)));
    return events.map((e, i) => ({
      ...e,
      creatorName: creators[i]?.nickName ?? "Unknown",
    }));
  },
});

export const adminUpdate = mutation({
  args: {
    id: v.id("events"),
    title: v.string(),
    eventTypes: v.array(v.string()),
    details: v.string(),
    speaker: v.optional(v.string()),
    eventDateStart: v.number(),
    eventDateEnd: v.number(),
    isDeleted: v.boolean(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const adminDelete = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
