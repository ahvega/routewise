import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all quotations for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quotations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

// List quotations by status
export const byStatus = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quotations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", args.status)
      )
      .order("desc")
      .collect();
  },
});

// List quotations by client
export const byClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quotations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

// Get a single quotation by ID
export const get = query({
  args: { id: v.id("quotations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Generate next quotation number
async function generateQuotationNumber(ctx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await ctx.db
    .query("quotations")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const thisYearQuotes = existing.filter((q: any) =>
    q.quotationNumber.startsWith(`QT-${year}`)
  );

  const nextNum = thisYearQuotes.length + 1;
  return `QT-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Create a new quotation
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    createdBy: v.optional(v.id("users")),
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    extraMileage: v.number(),
    estimatedDays: v.number(),
    totalDistance: v.number(),
    totalTime: v.number(),
    fuelCost: v.number(),
    refuelingCost: v.number(),
    driverMealsCost: v.number(),
    driverLodgingCost: v.number(),
    driverIncentiveCost: v.number(),
    vehicleDistanceCost: v.number(),
    vehicleDailyCost: v.number(),
    tollCost: v.number(),
    totalCost: v.number(),
    selectedMarkupPercentage: v.number(),
    salePriceHnl: v.number(),
    salePriceUsd: v.number(),
    exchangeRateUsed: v.number(),
    includeFuel: v.boolean(),
    includeMeals: v.boolean(),
    includeTolls: v.boolean(),
    includeDriverIncentive: v.boolean(),
    status: v.string(),
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const quotationNumber = await generateQuotationNumber(ctx, args.tenantId);

    return await ctx.db.insert("quotations", {
      ...args,
      quotationNumber,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update quotation status
export const updateStatus = mutation({
  args: {
    id: v.id("quotations"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, notes } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Quotation not found");

    const now = Date.now();
    const updates: Record<string, any> = {
      status,
      updatedAt: now,
    };

    if (notes !== undefined) updates.notes = notes;

    // Set timestamp based on status
    if (status === 'sent') updates.sentAt = now;
    if (status === 'approved') updates.approvedAt = now;
    if (status === 'rejected') updates.rejectedAt = now;

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Update quotation details
export const update = mutation({
  args: {
    id: v.id("quotations"),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    origin: v.optional(v.string()),
    destination: v.optional(v.string()),
    baseLocation: v.optional(v.string()),
    groupSize: v.optional(v.number()),
    extraMileage: v.optional(v.number()),
    estimatedDays: v.optional(v.number()),
    totalDistance: v.optional(v.number()),
    totalTime: v.optional(v.number()),
    fuelCost: v.optional(v.number()),
    refuelingCost: v.optional(v.number()),
    driverMealsCost: v.optional(v.number()),
    driverLodgingCost: v.optional(v.number()),
    driverIncentiveCost: v.optional(v.number()),
    vehicleDistanceCost: v.optional(v.number()),
    vehicleDailyCost: v.optional(v.number()),
    tollCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    selectedMarkupPercentage: v.optional(v.number()),
    salePriceHnl: v.optional(v.number()),
    salePriceUsd: v.optional(v.number()),
    exchangeRateUsed: v.optional(v.number()),
    includeFuel: v.optional(v.boolean()),
    includeMeals: v.optional(v.boolean()),
    includeTolls: v.optional(v.boolean()),
    includeDriverIncentive: v.optional(v.boolean()),
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    pdfGeneratedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Quotation not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete a quotation (only drafts)
export const remove = mutation({
  args: { id: v.id("quotations") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Quotation not found");
    if (existing.status !== 'draft') {
      throw new Error("Only draft quotations can be deleted");
    }
    await ctx.db.delete(args.id);
  },
});
