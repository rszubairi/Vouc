import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

const platformValidator = v.union(v.literal("ios"), v.literal("android"), v.literal("all"));

function formatVersion(major: number, minor: number, patch: number): string {
  return `${String(major).padStart(2, "0")}.${String(minor).padStart(2, "0")}.${String(patch).padStart(4, "0")}`;
}

// Platforms whose releases are relevant to a given client platform:
// an "ios"/"android" client should also see "all" releases.
function relevantPlatforms(platform: "ios" | "android"): ("ios" | "android" | "all")[] {
  return [platform, "all"];
}

// ─── Admin ────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const releases = await ctx.db.query("appReleases").order("desc").take(200);
    return releases;
  },
});

export const create = mutation({
  args: {
    major: v.number(),
    minor: v.number(),
    patch: v.number(),
    releaseNotes: v.string(),
    platform: platformValidator,
    isMinimumRequired: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    if (args.isMinimumRequired) {
      await clearExistingMinimum(ctx, args.platform);
    }

    return await ctx.db.insert("appReleases", {
      major: args.major,
      minor: args.minor,
      patch: args.patch,
      version: formatVersion(args.major, args.minor, args.patch),
      releaseNotes: args.releaseNotes,
      platform: args.platform,
      isMinimumRequired: args.isMinimumRequired,
      publishedAt: Date.now(),
      createdBy: admin._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("appReleases"),
    major: v.number(),
    minor: v.number(),
    patch: v.number(),
    releaseNotes: v.string(),
    platform: platformValidator,
    isMinimumRequired: v.boolean(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);

    if (rest.isMinimumRequired) {
      await clearExistingMinimum(ctx, rest.platform, id);
    }

    await ctx.db.patch("appReleases", id, {
      major: rest.major,
      minor: rest.minor,
      patch: rest.patch,
      version: formatVersion(rest.major, rest.minor, rest.patch),
      releaseNotes: rest.releaseNotes,
      platform: rest.platform,
      isMinimumRequired: rest.isMinimumRequired,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("appReleases") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("appReleases", id);
  },
});

async function clearExistingMinimum(
  ctx: import("./_generated/server").MutationCtx,
  platform: "ios" | "android" | "all",
  exceptId?: import("./_generated/dataModel").Id<"appReleases">
) {
  const current = await ctx.db
    .query("appReleases")
    .withIndex("by_platform_and_isMinimumRequired", (q) =>
      q.eq("platform", platform).eq("isMinimumRequired", true)
    )
    .collect();

  for (const release of current) {
    if (release._id !== exceptId) {
      await ctx.db.patch("appReleases", release._id, { isMinimumRequired: false });
    }
  }
}

// ─── Public (app-facing) ────────────────────────────────────────────────────

export const latest = query({
  args: { platform: v.union(v.literal("ios"), v.literal("android")) },
  handler: async (ctx, args) => {
    const candidates = await Promise.all(
      relevantPlatforms(args.platform).map((platform) =>
        ctx.db
          .query("appReleases")
          .withIndex("by_platform_and_version", (q) => q.eq("platform", platform))
          .order("desc")
          .first()
      )
    );

    const releases = candidates.filter((r) => r !== null);
    if (releases.length === 0) return null;

    releases.sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch);
    return releases[0];
  },
});

export const checkMinimumVersion = query({
  args: {
    platform: v.union(v.literal("ios"), v.literal("android")),
    major: v.number(),
    minor: v.number(),
    patch: v.number(),
  },
  handler: async (ctx, args) => {
    const minimums = await Promise.all(
      relevantPlatforms(args.platform).map((platform) =>
        ctx.db
          .query("appReleases")
          .withIndex("by_platform_and_isMinimumRequired", (q) =>
            q.eq("platform", platform).eq("isMinimumRequired", true)
          )
          .first()
      )
    );

    const applicable = minimums.filter((r) => r !== null);
    if (applicable.length === 0) {
      return { updateRequired: false, minimumVersion: null as string | null };
    }

    applicable.sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch);
    const minimum = applicable[0];

    const current = [args.major, args.minor, args.patch];
    const required = [minimum.major, minimum.minor, minimum.patch];
    let updateRequired = false;
    for (let i = 0; i < 3; i++) {
      if (current[i] > required[i]) break;
      if (current[i] < required[i]) {
        updateRequired = true;
        break;
      }
    }

    return { updateRequired, minimumVersion: minimum.version };
  },
});
