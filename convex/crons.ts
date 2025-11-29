import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily Exchange Rate Update
 *
 * Fetches latest exchange rates from APILayer at 06:00 UTC daily.
 * This corresponds to midnight in Central America (GMT-6),
 * when most users are not actively using the system.
 *
 * Supported currencies:
 * - HNL (Honduras), GTQ (Guatemala), CRC (Costa Rica)
 * - NIO (Nicaragua), PAB (Panama), BZD (Belize)
 * - MXN (Mexico), DOP (Dominican Republic)
 * - COP (Colombia), PEN (Peru)
 */
crons.daily(
  "update exchange rates",
  { hourUTC: 6, minuteUTC: 0 },
  internal.exchangeRates.fetchRatesFromAPI
);

export default crons;
