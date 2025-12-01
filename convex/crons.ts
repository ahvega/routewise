import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ============================================================
// EXCHANGE RATES
// ============================================================

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

// ============================================================
// SALES WORKFLOW REMINDERS
// ============================================================

/**
 * Quotation Follow-up Reminders
 *
 * Runs daily at 14:00 UTC (8:00 AM Central America) to check for
 * quotations that need follow-up based on tenant configuration.
 *
 * Default reminder schedule: 3, 7, 14 days after sent.
 * Creates in-app notifications for staff.
 */
crons.daily(
  "quotation followup reminders",
  { hourUTC: 14, minuteUTC: 0 },
  internal.reminders.quotationFollowup
);

/**
 * Invoice Overdue Reminders
 *
 * Runs daily at 14:00 UTC (8:00 AM Central America) to check for
 * overdue invoices based on tenant configuration.
 *
 * Default reminder schedule: 3, 7 days after due date.
 * Creates in-app notifications for staff (and email at 7 days).
 */
crons.daily(
  "invoice overdue reminders",
  { hourUTC: 14, minuteUTC: 0 },
  internal.reminders.invoiceOverdue
);

/**
 * Upcoming Trip Reminders
 *
 * Runs daily at 12:00 UTC (6:00 AM Central America) to check for
 * trips scheduled for tomorrow.
 *
 * Creates URGENT notifications if trip details are incomplete.
 * Creates confirmation notifications if trip is ready.
 */
crons.daily(
  "upcoming trip reminders",
  { hourUTC: 12, minuteUTC: 0 },
  internal.reminders.upcomingTrips
);

/**
 * Quotation Expiry Check
 *
 * Runs daily at 00:00 UTC (6:00 PM previous day Central America)
 * to mark quotations as expired when they pass their validUntil date.
 */
crons.daily(
  "check quotation expiry",
  { hourUTC: 0, minuteUTC: 0 },
  internal.reminders.checkQuotationExpiry
);

/**
 * Scheduled Notifications Processing
 *
 * Runs every hour to process any scheduled notifications
 * that are due for delivery.
 */
crons.interval(
  "process scheduled notifications",
  { hours: 1 },
  internal.notifications.processScheduled
);

/**
 * Cleanup Old Reminders
 *
 * Runs weekly on Sundays at 04:00 UTC to clean up
 * processed reminder records older than 30 days.
 */
crons.weekly(
  "cleanup old reminders",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
  internal.reminders.cleanupOldReminders
);

export default crons;
