import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { parseLevel } from "./hierarchy";

async function getCallerProfile(ctx: any) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", authUserId))
    .first();
  if (!profile || profile.deleteAccount) throw new Error("Profile not found");
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
    eventType: v.string(),
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
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const profile = await getCallerProfile(ctx);

    const eventId = await ctx.db.insert("events", {
      userId: profile._id,
      eventType: args.eventType,
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

    // Images
    if (args.imageUrls) {
      for (let i = 0; i < args.imageUrls.length; i++) {
        const imageId = await ctx.db.insert("images", {
          userId: profile._id,
          url: args.imageUrls[i],
        });
        await ctx.db.insert("eventImages", { eventId, imageId, order: i });
      }
    }

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
    if (!callerProfile || callerProfile.deleteAccount) return [];

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
    const attendances = await ctx.db
      .query("eventAttendances")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
    const metas = await ctx.db
      .query("eventMetas")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();

    return {
      ...event,
      creatorNickName: creator?.nickName ?? "",
      hostCount: hosts.length,
      attendeeCount: attendances.length,
      likeCount: metas.filter((m) => m.type === "Like").length,
      commentCount: metas.filter((m) => m.type === "Comment").length,
    };
  },
});

export const rsvpEvent = mutation({
  args: {
    eventId: v.id("events"),
    paidBy: v.string(),
    paidTo: v.string(),
    paidVia: v.string(),
    amount: v.number(),
    transactionDate: v.number(),
    guestName: v.optional(v.string()),
    remarks: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCallerProfile(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.isDeleted) throw new Error("Event not found");

    const attendanceId = await ctx.db.insert("eventAttendances", {
      eventId: args.eventId,
      userId: profile._id,
      guestName: args.guestName,
      paidBy: args.paidBy,
      paidTo: args.paidTo,
      paidVia: args.paidVia,
      amount: args.amount,
      transactionDate: args.transactionDate,
      remarks: args.remarks,
    });

    if (args.receiptUrl) {
      const docId = await ctx.db.insert("documents", {
        userId: profile._id,
        name: "Receipt",
        url: args.receiptUrl,
      });
      await ctx.db.insert("eventAttendanceDocuments", {
        eventAttendanceId: attendanceId,
        documentId: docId,
      });
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
