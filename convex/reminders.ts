import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ============================================================
// REMINDER PROCESSING FUNCTIONS
// Called by cron jobs to process quotation, invoice, and trip reminders
// ============================================================

/**
 * Process quotation follow-up reminders
 * Runs daily to check for quotations that need follow-up
 */
export const quotationFollowup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Get all tenants (we need to process per-tenant for settings)
    const tenants = await ctx.db.query("tenants").collect();
    let processed = 0;
    let created = 0;

    for (const tenant of tenants) {
      // Get tenant's parameters for reminder configuration
      const currentYear = new Date().getFullYear();
      const parameters = await ctx.db
        .query("parameters")
        .withIndex("by_tenant_year", (q) =>
          q.eq("tenantId", tenant._id).eq("year", currentYear)
        )
        .first();

      // Default reminder days if not configured
      const reminderDays = parameters?.quotationReminderDays ?? [3, 7, 14];

      // Get quotations in 'sent' status for this tenant
      const sentQuotations = await ctx.db
        .query("quotations")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", tenant._id).eq("status", "sent")
        )
        .collect();

      for (const quotation of sentQuotations) {
        if (!quotation.sentAt) continue;

        const daysSinceSent = Math.floor(
          (now - quotation.sentAt) / oneDayMs
        );

        // Check if this quotation needs a reminder on any of the configured days
        for (const reminderDay of reminderDays) {
          if (daysSinceSent === reminderDay) {
            // Check if we've already sent a reminder for this day
            const existingReminder = await ctx.db
              .query("scheduledReminders")
              .withIndex("by_entity", (q) =>
                q
                  .eq("entityType", "quotation")
                  .eq("entityId", quotation._id as string)
              )
              .filter((q) =>
                q.and(
                  q.eq(q.field("reminderType"), "quotation_followup"),
                  q.eq(q.field("reminderDay"), reminderDay)
                )
              )
              .first();

            if (!existingReminder) {
              // Get client name for the notification
              let clientName = "Cliente";
              if (quotation.clientId) {
                const client = await ctx.db.get(quotation.clientId);
                if (client) {
                  clientName =
                    client.type === "company"
                      ? client.companyName || "Empresa"
                      : `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
                        "Cliente";
                }
              }

              // Create the notification
              const notificationId = await ctx.runMutation(
                internal.notifications.createQuotationFollowup,
                {
                  tenantId: tenant._id,
                  quotationId: quotation._id,
                  quotationNumber: quotation.quotationNumber,
                  clientName,
                  daysSinceSent,
                }
              );

              // Record that we sent this reminder
              await ctx.db.insert("scheduledReminders", {
                tenantId: tenant._id,
                entityType: "quotation",
                entityId: quotation._id as string,
                reminderType: "quotation_followup",
                reminderDay,
                scheduledFor: now,
                processed: true,
                processedAt: now,
                notificationId,
                createdAt: now,
              });

              created++;
            }
          }
        }

        processed++;
      }
    }

    return { processed, created };
  },
});

/**
 * Process invoice overdue reminders
 * Runs daily to check for overdue invoices
 */
export const invoiceOverdue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const tenants = await ctx.db.query("tenants").collect();
    let processed = 0;
    let created = 0;

    for (const tenant of tenants) {
      // Get tenant's parameters for reminder configuration
      const currentYear = new Date().getFullYear();
      const parameters = await ctx.db
        .query("parameters")
        .withIndex("by_tenant_year", (q) =>
          q.eq("tenantId", tenant._id).eq("year", currentYear)
        )
        .first();

      // Default reminder days after due date
      const reminderDays = parameters?.invoiceReminderDays ?? [3, 7];

      // Get unpaid invoices for this tenant
      const unpaidInvoices = await ctx.db
        .query("invoices")
        .withIndex("by_tenant_payment_status", (q) =>
          q.eq("tenantId", tenant._id).eq("paymentStatus", "unpaid")
        )
        .collect();

      // Also get partial invoices
      const partialInvoices = await ctx.db
        .query("invoices")
        .withIndex("by_tenant_payment_status", (q) =>
          q.eq("tenantId", tenant._id).eq("paymentStatus", "partial")
        )
        .collect();

      const allUnpaidInvoices = [...unpaidInvoices, ...partialInvoices];

      for (const invoice of allUnpaidInvoices) {
        const daysOverdue = Math.floor((now - invoice.dueDate) / oneDayMs);

        // Only process if invoice is actually overdue
        if (daysOverdue <= 0) continue;

        // Update invoice status to overdue if not already
        if (invoice.paymentStatus !== "overdue" && daysOverdue > 0) {
          await ctx.db.patch(invoice._id, { paymentStatus: "overdue" });
        }

        for (const reminderDay of reminderDays) {
          if (daysOverdue === reminderDay) {
            // Check if we've already sent a reminder for this day
            const existingReminder = await ctx.db
              .query("scheduledReminders")
              .withIndex("by_entity", (q) =>
                q
                  .eq("entityType", "invoice")
                  .eq("entityId", invoice._id as string)
              )
              .filter((q) =>
                q.and(
                  q.eq(q.field("reminderType"), "invoice_overdue"),
                  q.eq(q.field("reminderDay"), reminderDay)
                )
              )
              .first();

            if (!existingReminder) {
              // Get client name for the notification
              let clientName = "Cliente";
              if (invoice.clientId) {
                const client = await ctx.db.get(invoice.clientId);
                if (client) {
                  clientName =
                    client.type === "company"
                      ? client.companyName || "Empresa"
                      : `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
                        "Cliente";
                }
              }

              // Create the notification
              const notificationId = await ctx.runMutation(
                internal.notifications.createInvoiceOverdue,
                {
                  tenantId: tenant._id,
                  invoiceId: invoice._id,
                  invoiceNumber: invoice.invoiceNumber,
                  clientName,
                  daysOverdue,
                  amountDue: invoice.amountDue,
                  currency: invoice.localCurrency || "HNL",
                }
              );

              // Record that we sent this reminder
              await ctx.db.insert("scheduledReminders", {
                tenantId: tenant._id,
                entityType: "invoice",
                entityId: invoice._id as string,
                reminderType: "invoice_overdue",
                reminderDay,
                scheduledFor: now,
                processed: true,
                processedAt: now,
                notificationId,
                createdAt: now,
              });

              created++;
            }
          }
        }

        processed++;
      }
    }

    return { processed, created };
  },
});

/**
 * Process upcoming trip reminders
 * Runs daily to check for trips starting tomorrow
 */
export const upcomingTrips = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Calculate tomorrow's date range (start of day to end of day)
    const tomorrow = new Date(now + oneDayMs);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowStart = tomorrow.getTime();
    const tomorrowEnd = tomorrowStart + oneDayMs;

    const tenants = await ctx.db.query("tenants").collect();
    let processed = 0;
    let incompleteNotifications = 0;
    let completeNotifications = 0;

    for (const tenant of tenants) {
      // Get itineraries starting tomorrow
      const upcomingItineraries = await ctx.db
        .query("itineraries")
        .withIndex("by_start_date", (q) => q.eq("tenantId", tenant._id))
        .filter((q) =>
          q.and(
            q.gte(q.field("startDate"), tomorrowStart),
            q.lt(q.field("startDate"), tomorrowEnd),
            q.eq(q.field("status"), "scheduled")
          )
        )
        .collect();

      for (const itinerary of upcomingItineraries) {
        // Check if trip details are complete
        const detailsComplete = Boolean(
          itinerary.tripLeaderName &&
            itinerary.tripLeaderPhone &&
            itinerary.pickupExactAddress
        );

        // Check if we've already sent a reminder for this trip
        const existingReminder = await ctx.db
          .query("scheduledReminders")
          .withIndex("by_entity", (q) =>
            q
              .eq("entityType", "itinerary")
              .eq("entityId", itinerary._id as string)
          )
          .filter((q) => q.eq(q.field("reminderType"), "trip_upcoming"))
          .first();

        if (!existingReminder) {
          // Get client name
          let clientName = "Cliente";
          if (itinerary.clientId) {
            const client = await ctx.db.get(itinerary.clientId);
            if (client) {
              clientName =
                client.type === "company"
                  ? client.companyName || "Empresa"
                  : `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
                    "Cliente";
            }
          }

          if (!detailsComplete) {
            // Create urgent notification for incomplete trip details
            const notificationId = await ctx.runMutation(
              internal.notifications.createTripTomorrowIncomplete,
              {
                tenantId: tenant._id,
                itineraryId: itinerary._id,
                itineraryNumber: itinerary.itineraryNumber,
                clientName,
              }
            );

            // Record reminder
            await ctx.db.insert("scheduledReminders", {
              tenantId: tenant._id,
              entityType: "itinerary",
              entityId: itinerary._id as string,
              reminderType: "trip_upcoming",
              reminderDay: 1,
              scheduledFor: now,
              processed: true,
              processedAt: now,
              notificationId,
              createdAt: now,
            });

            incompleteNotifications++;
          } else {
            // Create confirmation notification for complete trip
            const notificationId = await ctx.db.insert("notifications", {
              tenantId: tenant._id,
              type: "trip_tomorrow",
              priority: "medium",
              title: `Viaje Mañana: ${itinerary.itineraryNumber}`,
              message: `El viaje para ${clientName} está confirmado para mañana. Todos los detalles están completos.`,
              entityType: "itinerary",
              entityId: itinerary._id as string,
              channels: ["in_app"],
              read: false,
              actionUrl: `/itineraries/${itinerary._id}`,
              createdAt: now,
            });

            // Record reminder
            await ctx.db.insert("scheduledReminders", {
              tenantId: tenant._id,
              entityType: "itinerary",
              entityId: itinerary._id as string,
              reminderType: "trip_upcoming",
              reminderDay: 1,
              scheduledFor: now,
              processed: true,
              processedAt: now,
              notificationId,
              createdAt: now,
            });

            completeNotifications++;
          }
        }

        processed++;
      }
    }

    return { processed, incompleteNotifications, completeNotifications };
  },
});

/**
 * Check for expired quotations
 * Runs daily to mark quotations as expired
 */
export const checkQuotationExpiry = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all sent quotations that have passed their validUntil date
    const expiredQuotations = await ctx.db
      .query("quotations")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "sent"),
          q.neq(q.field("validUntil"), undefined),
          q.lt(q.field("validUntil"), now)
        )
      )
      .collect();

    let updated = 0;

    for (const quotation of expiredQuotations) {
      // Update status to expired
      await ctx.db.patch(quotation._id, {
        status: "expired",
        updatedAt: now,
      });

      // Create notification for staff
      await ctx.db.insert("notifications", {
        tenantId: quotation.tenantId,
        type: "quotation_expired",
        priority: "low",
        title: `Cotización Expirada: ${quotation.quotationNumber}`,
        message: `La cotización ${quotation.quotationNumber} ha expirado sin respuesta del cliente.`,
        entityType: "quotation",
        entityId: quotation._id as string,
        channels: ["in_app"],
        read: false,
        actionUrl: `/quotations/${quotation._id}`,
        createdAt: now,
      });

      updated++;
    }

    return { updated };
  },
});

/**
 * Clean up old scheduled reminders
 * Runs periodically to remove old reminder records
 */
export const cleanupOldReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get old processed reminders
    const oldReminders = await ctx.db
      .query("scheduledReminders")
      .filter((q) =>
        q.and(
          q.eq(q.field("processed"), true),
          q.lt(q.field("processedAt"), thirtyDaysAgo)
        )
      )
      .take(500); // Delete in batches

    for (const reminder of oldReminders) {
      await ctx.db.delete(reminder._id);
    }

    return { deleted: oldReminders.length };
  },
});

/**
 * Schedule reminders for a newly sent quotation
 */
export const scheduleQuotationReminders = internalMutation({
  args: {
    quotationId: v.id("quotations"),
    tenantId: v.id("tenants"),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Get tenant's reminder configuration
    const currentYear = new Date().getFullYear();
    const parameters = await ctx.db
      .query("parameters")
      .withIndex("by_tenant_year", (q) =>
        q.eq("tenantId", args.tenantId).eq("year", currentYear)
      )
      .first();

    const reminderDays = parameters?.quotationReminderDays ?? [3, 7, 14];

    // Pre-schedule reminders
    for (const day of reminderDays) {
      await ctx.db.insert("scheduledReminders", {
        tenantId: args.tenantId,
        entityType: "quotation",
        entityId: args.quotationId as string,
        reminderType: "quotation_followup",
        reminderDay: day,
        scheduledFor: args.sentAt + day * oneDayMs,
        processed: false,
        createdAt: Date.now(),
      });
    }

    return { scheduled: reminderDays.length };
  },
});

/**
 * Cancel scheduled reminders for an entity
 * Called when quotation is approved/rejected, invoice is paid, etc.
 */
export const cancelReminders = internalMutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all unprocessed reminders for this entity
    const pendingReminders = await ctx.db
      .query("scheduledReminders")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .filter((q) => q.eq(q.field("processed"), false))
      .collect();

    for (const reminder of pendingReminders) {
      await ctx.db.patch(reminder._id, {
        processed: true,
        processedAt: now,
        skipped: true,
        skipReason: args.reason,
      });
    }

    return { cancelled: pendingReminders.length };
  },
});
