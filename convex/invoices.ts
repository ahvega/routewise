import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Document naming convention: YYMM-F#####-CODE-Leader_x_Pax
// Example: 2512-F00005-HOTR-Carlos_Perez_x_08

interface InvoiceNumberParts {
  invoiceNumber: string;
  invoiceLongName: string;
  sequence: number;
}

// Generate YYMM prefix from current date
function getYYMMPrefix(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

// Sanitize group leader name for document naming
function sanitizeLeaderName(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'Grupo';
  return name
    .trim()
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 25);
}

// Get next sequence number for invoices
async function getNextInvoiceSequence(ctx: any, tenantId: string): Promise<number> {
  const existing = await ctx.db
    .query("invoices")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  let maxSeq = 0;
  for (const i of existing) {
    if (i.invoiceSequence && i.invoiceSequence > maxSeq) {
      maxSeq = i.invoiceSequence;
    }
    // Parse from new format 2512-F00005
    const match = i.invoiceNumber?.match(/^\d{4}-F(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
    // Parse from legacy format INV-YYYY-NNNN
    const legacyMatch = i.invoiceNumber?.match(/^INV-\d{4}-(\d+)/);
    if (legacyMatch) {
      const num = parseInt(legacyMatch[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  return maxSeq + 1;
}

// Generate invoice number in new format
async function generateInvoiceNumber(
  ctx: any,
  tenantId: string,
  clientCode: string | null,
  groupLeaderName: string | null,
  groupSize: number
): Promise<InvoiceNumberParts> {
  const sequence = await getNextInvoiceSequence(ctx, tenantId);
  const paddedSeq = String(sequence).padStart(5, '0');
  const yymmPrefix = getYYMMPrefix();
  const code = clientCode || '';
  const leaderPart = sanitizeLeaderName(groupLeaderName);
  const groupSizePadded = String(groupSize).padStart(2, '0');

  // Short number: 2512-F00005
  const invoiceNumber = `${yymmPrefix}-F${paddedSeq}`;

  // Long name: 2512-F00005-HOTR-Carlos_Perez_x_08
  const longNameParts = [invoiceNumber];
  if (code) longNameParts.push(code);
  longNameParts.push(`${leaderPart}_x_${groupSizePadded}`);
  const invoiceLongName = longNameParts.join('-');

  return { invoiceNumber, invoiceLongName, sequence };
}

// Legacy function for backwards compatibility
function generateInvoiceNumberLegacy(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
}

// List all invoices for a tenant
export const list = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    let invoices;

    if (args.status) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", args.status!)
        )
        .collect();
    } else if (args.paymentStatus) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_tenant_payment_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("paymentStatus", args.paymentStatus!)
        )
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }

    // Filter by clientId if provided
    if (args.clientId) {
      invoices = invoices.filter(inv => inv.clientId === args.clientId);
    }

    return invoices.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single invoice by ID
export const get = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get invoice by itinerary ID
export const getByItinerary = query({
  args: { itineraryId: v.id("itineraries") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .first();
  },
});

// Get invoice by quotation ID
export const getByQuotation = query({
  args: { quotationId: v.id("quotations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_quotation", (q) => q.eq("quotationId", args.quotationId))
      .first();
  },
});

// Create a new invoice (usually from a completed itinerary)
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    quotationId: v.optional(v.id("quotations")),
    itineraryId: v.optional(v.id("itineraries")),
    clientId: v.optional(v.id("clients")),
    groupLeaderName: v.optional(v.string()), // For document naming
    groupSize: v.optional(v.number()), // For document naming
    description: v.string(),
    // Line items (structured breakdown)
    lineItems: v.optional(v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPriceLocal: v.number(),
      unitPriceUsd: v.optional(v.number()),
      totalLocal: v.number(),
      totalUsd: v.optional(v.number()),
    }))),
    // Natural language service description
    serviceDescription: v.optional(v.string()),
    // Currency configuration (frozen at creation)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    exchangeRateUsed: v.number(),
    // Amounts in local currency
    subtotalLocal: v.optional(v.number()),
    subtotalHnl: v.number(), // Legacy field
    taxPercentage: v.number(),
    dueDate: v.number(),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    additionalCharges: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
    }))),
    discounts: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get client code if available
    let clientCode: string | null = null;
    let groupLeaderName = args.groupLeaderName || null;
    let groupSize = args.groupSize || 1;

    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client?.clientCode) {
        clientCode = client.clientCode;
      }
    }

    // If we have a quotation, get group info from there
    if (args.quotationId) {
      const quotation = await ctx.db.get(args.quotationId);
      if (quotation) {
        groupLeaderName = groupLeaderName || quotation.groupLeaderName || null;
        groupSize = groupSize || quotation.groupSize || 1;
        if (!clientCode && quotation.clientId) {
          const client = await ctx.db.get(quotation.clientId);
          if (client?.clientCode) {
            clientCode = client.clientCode;
          }
        }
      }
    }

    // Generate invoice number with new format
    const { invoiceNumber, invoiceLongName, sequence } = await generateInvoiceNumber(
      ctx,
      args.tenantId,
      clientCode,
      groupLeaderName,
      groupSize
    );

    // Use local currency amounts if provided, otherwise use HNL (legacy)
    const subtotalLocal = args.subtotalLocal ?? args.subtotalHnl;

    // Calculate additional charges and discounts
    const additionalTotal = (args.additionalCharges || []).reduce((sum, c) => sum + c.amount, 0);
    const discountTotal = (args.discounts || []).reduce((sum, d) => sum + d.amount, 0);

    // Calculate tax and totals in local currency
    const adjustedSubtotalLocal = subtotalLocal + additionalTotal - discountTotal;
    const taxAmountLocal = adjustedSubtotalLocal * (args.taxPercentage / 100);
    const totalLocal = adjustedSubtotalLocal + taxAmountLocal;

    // Calculate USD equivalents (frozen at creation)
    const subtotalUsd = subtotalLocal / args.exchangeRateUsed;
    const taxAmountUsd = taxAmountLocal / args.exchangeRateUsed;
    const totalUsd = totalLocal / args.exchangeRateUsed;

    const invoiceId = await ctx.db.insert("invoices", {
      tenantId: args.tenantId,
      invoiceNumber,
      invoiceLongName,
      invoiceSequence: sequence,
      quotationId: args.quotationId,
      itineraryId: args.itineraryId,
      clientId: args.clientId,
      invoiceDate: now,
      dueDate: args.dueDate,
      // Currency configuration
      localCurrency: args.localCurrency,
      exchangeRateUsed: args.exchangeRateUsed,
      // Line items
      lineItems: args.lineItems,
      serviceDescription: args.serviceDescription,
      description: args.description,
      // Subtotal in both currencies (frozen)
      subtotalLocal,
      subtotalHnl: args.subtotalHnl, // Legacy field
      subtotalUsd,
      // Tax in both currencies (frozen)
      taxPercentage: args.taxPercentage,
      taxAmountLocal,
      taxAmountHnl: taxAmountLocal, // Legacy field (uses same value)
      taxAmountUsd,
      // Total in both currencies (frozen)
      totalLocal,
      totalHnl: totalLocal, // Legacy field (uses same value)
      totalUsd,
      // Payment tracking (in local currency)
      amountPaid: 0,
      amountDue: totalLocal,
      paymentStatus: "unpaid",
      additionalCharges: args.additionalCharges,
      discounts: args.discounts,
      status: "draft",
      notes: args.notes,
      internalNotes: args.internalNotes,
      createdAt: now,
      updatedAt: now,
    });

    return invoiceId;
  },
});

// Helper to format date in Spanish
function formatDateSpanish(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Create invoice from itinerary
export const createFromItinerary = mutation({
  args: {
    itineraryId: v.id("itineraries"),
    taxPercentage: v.optional(v.number()),
    paymentTermsDays: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) throw new Error("Itinerary not found");

    // Check if invoice already exists for this itinerary
    const existingInvoice = await ctx.db
      .query("invoices")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .first();

    if (existingInvoice) {
      throw new Error("Invoice already exists for this itinerary");
    }

    const now = Date.now();
    const taxPercentage = args.taxPercentage ?? 15; // ISV default 15%
    const paymentTermsDays = args.paymentTermsDays ?? 30;
    const dueDate = now + (paymentTermsDays * 24 * 60 * 60 * 1000);

    // Use local currency amount from itinerary (frozen values)
    const subtotalLocal = itinerary.agreedPriceLocal ?? itinerary.agreedPriceHnl;
    const subtotalUsd = itinerary.agreedPriceUsd;

    // Calculate tax and totals in both currencies
    const taxAmountLocal = subtotalLocal * (taxPercentage / 100);
    const totalLocal = subtotalLocal + taxAmountLocal;
    const taxAmountUsd = subtotalUsd * (taxPercentage / 100);
    const totalUsd = subtotalUsd + taxAmountUsd;

    // Get vehicle name if available
    let vehicleName = "";
    if (itinerary.vehicleId) {
      const vehicle = await ctx.db.get(itinerary.vehicleId);
      if (vehicle) {
        vehicleName = vehicle.name;
      }
    }

    // Get distance unit from tenant parameters
    let distanceUnit = "Km";
    const parameters = await ctx.db
      .query("parameters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", itinerary.tenantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (parameters?.preferredDistanceUnit) {
      distanceUnit = parameters.preferredDistanceUnit === "miles" ? "Mi" : "Km";
    }

    // Build detailed description
    const tripType = itinerary.isRoundTrip !== false ? "ida y vuelta" : "solo ida";
    const startDateStr = formatDateSpanish(itinerary.startDate);
    const endDateStr = itinerary.endDate ? formatDateSpanish(itinerary.endDate) : startDateStr;
    const dateRange = itinerary.endDate && itinerary.endDate !== itinerary.startDate
      ? `${startDateStr} - ${endDateStr}`
      : startDateStr;

    // Format distance with thousands separator
    const formattedDistance = Math.round(itinerary.totalDistance).toLocaleString('es-HN');

    // Build description parts
    const descriptionParts = [
      `Servicios de Transporte desde ${itinerary.origin} hacia ${itinerary.destination}`,
      tripType,
      `para grupo de ${itinerary.groupSize} personas`,
    ];

    if (vehicleName) {
      descriptionParts.push(`en vehículo: ${vehicleName}`);
    }

    descriptionParts.push(`${itinerary.estimatedDays} Día${itinerary.estimatedDays > 1 ? 's' : ''}: ${dateRange}`);
    descriptionParts.push(`total ${formattedDistance} ${distanceUnit}`);

    // Create description from itinerary with full trip details
    const description = descriptionParts.join(', ');

    // Get client code for invoice naming
    let clientCode: string | null = null;
    if (itinerary.clientId) {
      const client = await ctx.db.get(itinerary.clientId);
      if (client?.clientCode) {
        clientCode = client.clientCode;
      }
    }

    // Get group leader name from quotation if available
    let groupLeaderName: string | null = null;
    if (itinerary.quotationId) {
      const quotation = await ctx.db.get(itinerary.quotationId);
      if (quotation?.groupLeaderName) {
        groupLeaderName = quotation.groupLeaderName;
      }
    }

    // Generate invoice number with new format
    const { invoiceNumber, invoiceLongName, sequence } = await generateInvoiceNumber(
      ctx,
      itinerary.tenantId,
      clientCode,
      groupLeaderName,
      itinerary.groupSize
    );

    const invoiceId = await ctx.db.insert("invoices", {
      tenantId: itinerary.tenantId,
      invoiceNumber,
      invoiceLongName,
      invoiceSequence: sequence,
      itineraryId: args.itineraryId,
      clientId: itinerary.clientId,
      invoiceDate: now,
      dueDate,
      // Currency configuration (from itinerary)
      localCurrency: itinerary.localCurrency,
      exchangeRateUsed: itinerary.exchangeRateUsed,
      description,
      // Subtotal in both currencies (frozen)
      subtotalLocal,
      subtotalHnl: subtotalLocal, // Legacy field
      subtotalUsd,
      // Tax in both currencies (frozen)
      taxPercentage,
      taxAmountLocal,
      taxAmountHnl: taxAmountLocal, // Legacy field
      taxAmountUsd,
      // Total in both currencies (frozen)
      totalLocal,
      totalHnl: totalLocal, // Legacy field
      totalUsd,
      // Payment tracking (in local currency)
      amountPaid: 0,
      amountDue: totalLocal,
      paymentStatus: "unpaid",
      status: "draft",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return invoiceId;
  },
});

// Update invoice
export const update = mutation({
  args: {
    id: v.id("invoices"),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    additionalCharges: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
    }))),
    discounts: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const invoice = await ctx.db.get(id);
    if (!invoice) throw new Error("Invoice not found");

    // Recalculate totals if charges/discounts changed
    let recalculatedFields: Record<string, unknown> = {};
    if (updates.additionalCharges !== undefined || updates.discounts !== undefined) {
      const additionalCharges = updates.additionalCharges ?? invoice.additionalCharges ?? [];
      const discounts = updates.discounts ?? invoice.discounts ?? [];

      const additionalTotal = additionalCharges.reduce((sum, c) => sum + c.amount, 0);
      const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);

      // Use local currency values
      const subtotalLocal = invoice.subtotalLocal ?? invoice.subtotalHnl;
      const adjustedSubtotalLocal = subtotalLocal + additionalTotal - discountTotal;
      const taxAmountLocal = adjustedSubtotalLocal * (invoice.taxPercentage / 100);
      const totalLocal = adjustedSubtotalLocal + taxAmountLocal;
      const totalUsd = totalLocal / invoice.exchangeRateUsed;
      const amountDue = totalLocal - invoice.amountPaid;

      recalculatedFields = {
        // Update local currency fields
        taxAmountLocal,
        taxAmountHnl: taxAmountLocal, // Legacy field
        totalLocal,
        totalHnl: totalLocal, // Legacy field
        totalUsd,
        amountDue,
        paymentStatus: amountDue <= 0 ? "paid" : invoice.amountPaid > 0 ? "partial" : "unpaid",
      };
    }

    await ctx.db.patch(id, {
      ...updates,
      ...recalculatedFields,
      updatedAt: Date.now(),
    });
  },
});

// Update invoice status
export const updateStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "sent") {
      updates.sentAt = now;
    } else if (args.status === "paid") {
      updates.paidAt = now;
      updates.paymentStatus = "paid";
    } else if (args.status === "cancelled") {
      updates.cancelledAt = now;
    }

    await ctx.db.patch(args.id, updates);
  },
});

// Record a payment
export const recordPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(), // Amount in local currency
    paymentMethod: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    paymentDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    const now = Date.now();
    const paymentDate = args.paymentDate ?? now;

    // Create payment record
    await ctx.db.insert("invoicePayments", {
      tenantId: invoice.tenantId,
      invoiceId: args.invoiceId,
      paymentDate,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      notes: args.notes,
      recordedBy: args.recordedBy,
      createdAt: now,
    });

    // Use local currency total
    const totalLocal = invoice.totalLocal ?? invoice.totalHnl;

    // Update invoice payment totals
    const newAmountPaid = invoice.amountPaid + args.amount;
    const newAmountDue = totalLocal - newAmountPaid;

    let paymentStatus: string;
    if (newAmountDue <= 0) {
      paymentStatus = "paid";
    } else if (newAmountPaid > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    const updates: Record<string, unknown> = {
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      paymentStatus,
      updatedAt: now,
    };

    // If fully paid, update status as well
    if (paymentStatus === "paid") {
      updates.status = "paid";
      updates.paidAt = now;
    }

    await ctx.db.patch(args.invoiceId, updates);

    // Cancel any pending overdue reminders if fully paid
    if (paymentStatus === "paid") {
      await ctx.runMutation(internal.reminders.cancelReminders, {
        entityType: "invoice",
        entityId: args.invoiceId as string,
        reason: "Invoice paid in full",
      });
    }

    // Get client name for notification
    let clientName = "Cliente";
    if (invoice.clientId) {
      const client = await ctx.db.get(invoice.clientId);
      if (client) {
        clientName =
          client.type === "company"
            ? client.companyName || "Empresa"
            : `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Cliente";
      }
    }

    // Create payment notification
    await ctx.runMutation(internal.notifications.createPaymentReceived, {
      tenantId: invoice.tenantId,
      invoiceId: args.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName,
      amount: args.amount,
      currency: invoice.localCurrency || "HNL",
      isFullPayment: paymentStatus === "paid",
    });

    return {
      success: true,
      newAmountPaid,
      newAmountDue: Math.max(0, newAmountDue),
      paymentStatus,
    };
  },
});

// Get payments for an invoice
export const getPayments = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoicePayments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
  },
});

// Delete a payment (for corrections)
export const deletePayment = mutation({
  args: { paymentId: v.id("invoicePayments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const invoice = await ctx.db.get(payment.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Delete the payment
    await ctx.db.delete(args.paymentId);

    // Use local currency total
    const totalLocal = invoice.totalLocal ?? invoice.totalHnl;

    // Update invoice totals
    const newAmountPaid = invoice.amountPaid - payment.amount;
    const newAmountDue = totalLocal - newAmountPaid;

    let paymentStatus: string;
    if (newAmountDue <= 0) {
      paymentStatus = "paid";
    } else if (newAmountPaid > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    await ctx.db.patch(invoice._id, {
      amountPaid: Math.max(0, newAmountPaid),
      amountDue: newAmountDue,
      paymentStatus,
      status: paymentStatus === "paid" ? "paid" : invoice.status === "paid" ? "sent" : invoice.status,
      paidAt: paymentStatus === "paid" ? invoice.paidAt : undefined,
      updatedAt: Date.now(),
    });
  },
});

// Delete invoice (only drafts)
export const remove = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be deleted");
    }

    // Delete associated payments first
    const payments = await ctx.db
      .query("invoicePayments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.id))
      .collect();

    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Get invoice statistics for dashboard
export const getStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    const totalInvoices = invoices.length;
    const unpaidInvoices = invoices.filter(i => i.paymentStatus === "unpaid" || i.paymentStatus === "partial");
    const overdueInvoices = unpaidInvoices.filter(i => i.dueDate < now);
    const recentInvoices = invoices.filter(i => i.createdAt > thirtyDaysAgo);

    // Use local currency values (fallback to HNL for backwards compatibility)
    const totalReceivables = unpaidInvoices.reduce((sum, i) => sum + i.amountDue, 0);
    const totalRevenue = invoices
      .filter(i => i.paymentStatus === "paid")
      .reduce((sum, i) => sum + (i.totalLocal ?? i.totalHnl), 0);

    return {
      totalInvoices,
      unpaidCount: unpaidInvoices.length,
      overdueCount: overdueInvoices.length,
      recentCount: recentInvoices.length,
      totalReceivables, // In local currency
      totalRevenue, // In local currency
    };
  },
});
