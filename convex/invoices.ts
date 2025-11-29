import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Generate invoice number
function generateInvoiceNumber(): string {
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

// Create a new invoice (usually from a completed itinerary)
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    itineraryId: v.optional(v.id("itineraries")),
    clientId: v.optional(v.id("clients")),
    description: v.string(),
    // Currency configuration (frozen at creation)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    exchangeRateUsed: v.number(),
    // Amounts in local currency
    subtotalLocal: v.optional(v.number()),
    subtotalHnl: v.number(), // Legacy field
    taxPercentage: v.number(),
    dueDate: v.number(),
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
    const now = Date.now();

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
      invoiceNumber: generateInvoiceNumber(),
      itineraryId: args.itineraryId,
      clientId: args.clientId,
      invoiceDate: now,
      dueDate: args.dueDate,
      // Currency configuration
      localCurrency: args.localCurrency,
      exchangeRateUsed: args.exchangeRateUsed,
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
      createdAt: now,
      updatedAt: now,
    });

    return invoiceId;
  },
});

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

    // Create description from itinerary
    const description = `Servicio de transporte: ${itinerary.origin} → ${itinerary.destination}`;

    const invoiceId = await ctx.db.insert("invoices", {
      tenantId: itinerary.tenantId,
      invoiceNumber: generateInvoiceNumber(),
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
