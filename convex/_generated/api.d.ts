/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminAuth from "../adminAuth.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as contactUs from "../contactUs.js";
import type * as divisions from "../divisions.js";
import type * as events from "../events.js";
import type * as groups from "../groups.js";
import type * as hierarchy from "../hierarchy.js";
import type * as http from "../http.js";
import type * as library from "../library.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as profiles from "../profiles.js";
import type * as ranks from "../ranks.js";
import type * as seed from "../seed.js";
import type * as seedMutation from "../seedMutation.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminAuth: typeof adminAuth;
  auth: typeof auth;
  categories: typeof categories;
  contactUs: typeof contactUs;
  divisions: typeof divisions;
  events: typeof events;
  groups: typeof groups;
  hierarchy: typeof hierarchy;
  http: typeof http;
  library: typeof library;
  migration: typeof migration;
  notifications: typeof notifications;
  posts: typeof posts;
  profiles: typeof profiles;
  ranks: typeof ranks;
  seed: typeof seed;
  seedMutation: typeof seedMutation;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
