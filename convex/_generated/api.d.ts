/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as events from "../events.js";
import type * as hierarchy from "../hierarchy.js";
import type * as http from "../http.js";
import type * as library from "../library.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as profiles from "../profiles.js";
import type * as seed from "../seed.js";
import type * as seedMutation from "../seedMutation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  events: typeof events;
  hierarchy: typeof hierarchy;
  http: typeof http;
  library: typeof library;
  migration: typeof migration;
  notifications: typeof notifications;
  posts: typeof posts;
  profiles: typeof profiles;
  seed: typeof seed;
  seedMutation: typeof seedMutation;
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
