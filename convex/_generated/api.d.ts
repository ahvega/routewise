/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bootstrap from "../bootstrap.js";
import type * as clients from "../clients.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as drivers from "../drivers.js";
import type * as exchangeRates from "../exchangeRates.js";
import type * as expenseAdvances from "../expenseAdvances.js";
import type * as invitations from "../invitations.js";
import type * as invoices from "../invoices.js";
import type * as itineraries from "../itineraries.js";
import type * as lib_planLimits from "../lib/planLimits.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as parameters from "../parameters.js";
import type * as quotations from "../quotations.js";
import type * as reminders from "../reminders.js";
import type * as reports from "../reports.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tenants from "../tenants.js";
import type * as usageTracking from "../usageTracking.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bootstrap: typeof bootstrap;
  clients: typeof clients;
  crons: typeof crons;
  dashboard: typeof dashboard;
  drivers: typeof drivers;
  exchangeRates: typeof exchangeRates;
  expenseAdvances: typeof expenseAdvances;
  invitations: typeof invitations;
  invoices: typeof invoices;
  itineraries: typeof itineraries;
  "lib/planLimits": typeof lib_planLimits;
  migration: typeof migration;
  notifications: typeof notifications;
  parameters: typeof parameters;
  quotations: typeof quotations;
  reminders: typeof reminders;
  reports: typeof reports;
  subscriptions: typeof subscriptions;
  tenants: typeof tenants;
  usageTracking: typeof usageTracking;
  users: typeof users;
  vehicles: typeof vehicles;
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
