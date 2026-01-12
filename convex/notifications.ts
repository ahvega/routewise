import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export type NotificationType =
  | "quotation_followup"
  | "quotation_approved"
  | "quotation_rejected"
  | "quotation_expired"
  | "itinerary_created"
  | "trip_details_requested"
  | "trip_details_completed"
  | "trip_tomorrow"
  | "trip_tomorrow_incomplete"
  | "invoice_created"
  | "invoice_sent"
  | "invoice_overdue"
  | "payment_received";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type NotificationChannel = "in_app" | "email" | "whatsapp";

// ============================================================
// QUERIES
// ============================================================

/**
 * List notifications for a user
 */
export const list = query({
  args: {
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let notifications;
    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_tenant_user_unread", (q) =>
          q
            .eq("tenantId", args.tenantId)
            .eq("userId", args.userId ?? undefined)
            .eq("read", false)
        )
        .order("desc")
        .take(limit);
    } else if (args.userId) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_tenant_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", args.userId)
        )
        .order("desc")
        .take(limit);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .take(limit);
    }

    return notifications;
  },
});

/**
 * Get unread count for a user
 */
export const getUnreadCount = query({
  args: {
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get notifications for this user (or all staff if no userId)
    const userNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_tenant_user_unread", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .eq("userId", args.userId ?? undefined)
          .eq("read", false)
      )
      .collect();

    // Also get notifications for all staff (userId = null) if user is specified
    let allStaffNotifications: typeof userNotifications = [];
    if (args.userId) {
      allStaffNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_tenant_user_unread", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", undefined).eq("read", false)
        )
        .collect();
    }

    return {
      count: userNotifications.length + allStaffNotifications.length,
      byPriority: {
        urgent: [...userNotifications, ...allStaffNotifications].filter(
          (n) => n.priority === "urgent"
        ).length,
        high: [...userNotifications, ...allStaffNotifications].filter(
          (n) => n.priority === "high"
        ).length,
        medium: [...userNotifications, ...allStaffNotifications].filter(
          (n) => n.priority === "medium"
        ).length,
        low: [...userNotifications, ...allStaffNotifications].filter(
          (n) => n.priority === "low"
        ).length,
      },
    };
  },
});

/**
 * Get a single notification
 */
export const get = query({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get notifications for a specific entity
 */
export const getByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .collect();
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a new notification
 */
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
    type: v.string(),
    priority: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    channels: v.array(v.string()),
    actionUrl: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      userId: args.userId,
      type: args.type,
      priority: args.priority,
      title: args.title,
      message: args.message,
      entityType: args.entityType,
      entityId: args.entityId,
      channels: args.channels,
      read: false,
      scheduledFor: args.scheduledFor,
      processed: args.scheduledFor ? false : true, // If scheduled, not processed yet
      actionUrl: args.actionUrl,
      createdAt: now,
    });

    return notificationId;
  },
});

/**
 * Internal mutation to create notification (for use by other Convex functions)
 */
export const createInternal = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
    type: v.string(),
    priority: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    channels: v.array(v.string()),
    actionUrl: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      userId: args.userId,
      type: args.type,
      priority: args.priority,
      title: args.title,
      message: args.message,
      entityType: args.entityType,
      entityId: args.entityId,
      channels: args.channels,
      read: false,
      scheduledFor: args.scheduledFor,
      processed: args.scheduledFor ? false : true,
      actionUrl: args.actionUrl,
      createdAt: now,
    });

    return notificationId;
  },
});

/**
 * Mark a notification as read
 */
export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.id, {
      read: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark multiple notifications as read
 */
export const markManyRead = mutation({
  args: {
    ids: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const id of args.ids) {
      await ctx.db.patch(id, {
        read: true,
        readAt: now,
      });
    }

    return { success: true, count: args.ids.length };
  },
});

/**
 * Mark all notifications as read for a user
 */
export const markAllRead = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get unread notifications for this user
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_tenant_user_unread", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .eq("userId", args.userId ?? undefined)
          .eq("read", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
      });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

/**
 * Dismiss a notification
 */
export const dismiss = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.id, {
      dismissed: true,
      dismissedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a notification
 */
export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Update email delivery status
 */
export const updateEmailStatus = internalMutation({
  args: {
    id: v.id("notifications"),
    sent: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      emailSent: args.sent,
      emailSentAt: args.sent ? Date.now() : undefined,
      emailError: args.error,
    });
  },
});

/**
 * Update WhatsApp delivery status
 */
export const updateWhatsAppStatus = internalMutation({
  args: {
    id: v.id("notifications"),
    sent: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      whatsappSent: args.sent,
      whatsappSentAt: args.sent ? Date.now() : undefined,
      whatsappMessageId: args.messageId,
      whatsappError: args.error,
    });
  },
});

// ============================================================
// HELPER FUNCTIONS FOR CREATING SPECIFIC NOTIFICATION TYPES
// ============================================================

/**
 * Create a quotation follow-up notification
 */
export const createQuotationFollowup = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    quotationId: v.id("quotations"),
    quotationNumber: v.string(),
    clientName: v.string(),
    daysSinceSent: v.number(),
  },
  handler: async (ctx, args) => {
    const priority: NotificationPriority =
      args.daysSinceSent >= 14 ? "high" : args.daysSinceSent >= 7 ? "medium" : "low";

    return await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      type: "quotation_followup",
      priority,
      title: `Seguimiento: Cotización ${args.quotationNumber}`,
      message: `La cotización para ${args.clientName} lleva ${args.daysSinceSent} días sin respuesta. Considera dar seguimiento.`,
      entityType: "quotation",
      entityId: args.quotationId,
      channels: ["in_app"],
      read: false,
      actionUrl: `/quotations/${args.quotationId}`,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create a quotation approved notification
 */
export const createQuotationApproved = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    quotationId: v.id("quotations"),
    quotationNumber: v.string(),
    clientName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      type: "quotation_approved",
      priority: "medium",
      title: `Cotización Aprobada: ${args.quotationNumber}`,
      message: `${args.clientName} ha aprobado la cotización ${args.quotationNumber}.`,
      entityType: "quotation",
      entityId: args.quotationId,
      channels: ["in_app", "email"],
      read: false,
      actionUrl: `/quotations/${args.quotationId}`,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create an itinerary created notification
 */
export const createItineraryCreated = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    itineraryId: v.id("itineraries"),
    itineraryNumber: v.string(),
    clientName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      type: "itinerary_created",
      priority: "low",
      title: `Nuevo Itinerario: ${args.itineraryNumber}`,
      message: `Itinerario creado para ${args.clientName}. Fecha: ${args.startDate}.`,
      entityType: "itinerary",
      entityId: args.itineraryId,
      channels: ["in_app"],
      read: false,
      actionUrl: `/itineraries/${args.itineraryId}`,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create a trip details completed notification
 */
export const createTripDetailsCompleted = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    itineraryId: v.id("itineraries"),
    itineraryNumber: v.string(),
    clientName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      type: "trip_details_completed",
      priority: "medium",
      title: `Detalles del Viaje Completados: ${args.itineraryNumber}`,
      message: `${args.clientName} ha completado los detalles del viaje para el itinerario ${args.itineraryNumber}.`,
      entityType: "itinerary",
      entityId: args.itineraryId,
      channels: ["in_app", "email"],
      read: false,
      actionUrl: `/itineraries/${args.itineraryId}`,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create a trip tomorrow notification (for incomplete details)
 */
export const createTripTomorrowIncomplete = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    itineraryId: v.id("itineraries"),
    itineraryNumber: v.string(),
    clientName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      type: "trip_tomorrow_incomplete",
      priority: "urgent",
      title: `URGENTE: Viaje mañana sin detalles - ${args.itineraryNumber}`,
      message: `El viaje para ${args.clientName} es MAÑANA pero faltan los detalles de recogida. ¡Acción inmediata requerida!`,
      entityType: "itinerary",
      entityId: args.itineraryId,
      channels: ["in_app", "email"],
      read: false,
      actionUrl: `/itineraries/${args.itineraryId}`,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create an invoice overdue notification
 */
export const createInvoiceOverdue = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
    daysOverdue: v.number(),
    amountDue: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const priority: NotificationPriority =
      args.daysOverdue >= 7 ? "high" : "medium";

    return await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      type: "invoice_overdue",
      priority,
      title: `Factura Vencida: ${args.invoiceNumber}`,
      message: `La factura de ${args.clientName} está vencida por ${args.daysOverdue} días. Monto pendiente: ${args.currency} ${args.amountDue.toLocaleString()}.`,
      entityType: "invoice",
      entityId: args.invoiceId,
      channels: priority === "high" ? ["in_app", "email"] : ["in_app"],
      read: false,
      actionUrl: `/invoices/${args.invoiceId}`,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create a payment received notification
 */
export const createPaymentReceived = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
    amount: v.number(),
    currency: v.string(),
    isFullPayment: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      tenantId: args.tenantId,
      type: "payment_received",
      priority: "medium",
      title: args.isFullPayment
        ? `Pago Completo: ${args.invoiceNumber}`
        : `Pago Parcial: ${args.invoiceNumber}`,
      message: `${args.clientName} ha realizado un pago de ${args.currency} ${args.amount.toLocaleString()}${args.isFullPayment ? ". Factura saldada." : "."}`,
      entityType: "invoice",
      entityId: args.invoiceId,
      channels: ["in_app"],
      read: false,
      actionUrl: `/invoices/${args.invoiceId}`,
      createdAt: Date.now(),
    });
  },
});

// ============================================================
// SCHEDULED NOTIFICATION PROCESSING
// ============================================================

/**
 * Process scheduled notifications (called by cron job)
 */
export const processScheduled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find scheduled notifications that are ready to be sent
    const pendingNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_scheduled")
      .filter((q) =>
        q.and(
          q.lte(q.field("scheduledFor"), now),
          q.eq(q.field("processed"), false)
        )
      )
      .take(100); // Process in batches

    for (const notification of pendingNotifications) {
      // Mark as processed
      await ctx.db.patch(notification._id, {
        processed: true,
      });

      // TODO: Trigger email/WhatsApp delivery via HTTP actions
      // This will be implemented when we add the email/WhatsApp services
    }

    return { processed: pendingNotifications.length };
  },
});
