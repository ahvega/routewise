import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    subtotalHnl: v.number(),
    taxPercentage: v.number(),
    exchangeRateUsed: v.number(),
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

    // Calculate additional charges and discounts
    const additionalTotal = (args.additionalCharges || []).reduce((sum, c) => sum + c.amount, 0);
    const discountTotal = (args.discounts || []).reduce((sum, d) => sum + d.amount, 0);

    // Calculate tax and totals
    const adjustedSubtotal = args.subtotalHnl + additionalTotal - discountTotal;
    const taxAmountHnl = adjustedSubtotal * (args.taxPercentage / 100);
    const totalHnl = adjustedSubtotal + taxAmountHnl;
    const totalUsd = totalHnl / args.exchangeRateUsed;

    const invoiceId = await ctx.db.insert("invoices", {
      tenantId: args.tenantId,
      invoiceNumber: generateInvoiceNumber(),
      itineraryId: args.itineraryId,
      clientId: args.clientId,
      invoiceDate: now,
      dueDate: args.dueDate,
      description: args.description,
      subtotalHnl: args.subtotalHnl,
      taxPercentage: args.taxPercentage,
      taxAmountHnl,
      totalHnl,
      totalUsd,
      exchangeRateUsed: args.exchangeRateUsed,
      amountPaid: 0,
      amountDue: totalHnl,
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

    // Calculate tax and totals
    const subtotalHnl = itinerary.agreedPriceHnl;
    const taxAmountHnl = subtotalHnl * (taxPercentage / 100);
    const totalHnl = subtotalHnl + taxAmountHnl;
    const totalUsd = totalHnl / itinerary.exchangeRateUsed;

    // Create description from itinerary
    const description = `Servicio de transporte: ${itinerary.origin} → ${itinerary.destination}`;

    const invoiceId = await ctx.db.insert("invoices", {
      tenantId: itinerary.tenantId,
      invoiceNumber: generateInvoiceNumber(),
      itineraryId: args.itineraryId,
      clientId: itinerary.clientId,
      invoiceDate: now,
      dueDate,
      description,
      subtotalHnl,
      taxPercentage,
      taxAmountHnl,
      totalHnl,
      totalUsd,
      exchangeRateUsed: itinerary.exchangeRateUsed,
      amountPaid: 0,
      amountDue: totalHnl,
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
    let recalculatedFields = {};
    if (updates.additionalCharges !== undefined || updates.discounts !== undefined) {
      const additionalCharges = updates.additionalCharges ?? invoice.additionalCharges ?? [];
      const discounts = updates.discounts ?? invoice.discounts ?? [];

      const additionalTotal = additionalCharges.reduce((sum, c) => sum + c.amount, 0);
      const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);

      const adjustedSubtotal = invoice.subtotalHnl + additionalTotal - discountTotal;
      const taxAmountHnl = adjustedSubtotal * (invoice.taxPercentage / 100);
      const totalHnl = adjustedSubtotal + taxAmountHnl;
      const totalUsd = totalHnl / invoice.exchangeRateUsed;
      const amountDue = totalHnl - invoice.amountPaid;

      recalculatedFields = {
        taxAmountHnl,
        totalHnl,
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
    amount: v.number(),
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

    // Update invoice payment totals
    const newAmountPaid = invoice.amountPaid + args.amount;
    const newAmountDue = invoice.totalHnl - newAmountPaid;

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

    // Update invoice totals
    const newAmountPaid = invoice.amountPaid - payment.amount;
    const newAmountDue = invoice.totalHnl - newAmountPaid;

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

    const totalReceivables = unpaidInvoices.reduce((sum, i) => sum + i.amountDue, 0);
    const totalRevenue = invoices
      .filter(i => i.paymentStatus === "paid")
      .reduce((sum, i) => sum + i.totalHnl, 0);

    return {
      totalInvoices,
      unpaidCount: unpaidInvoices.length,
      overdueCount: overdueInvoices.length,
      recentCount: recentInvoices.length,
      totalReceivables,
      totalRevenue,
    };
  },
});
