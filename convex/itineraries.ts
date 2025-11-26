import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all itineraries for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

// List itineraries by status
export const byStatus = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", args.status)
      )
      .order("desc")
      .collect();
  },
});

// List itineraries by driver
export const byDriver = query({
  args: { driverId: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .order("desc")
      .collect();
  },
});

// List upcoming itineraries (scheduled, starting within date range)
export const upcoming = query({
  args: {
    tenantId: v.id("tenants"),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fromDate = args.fromDate || now;
    const toDate = args.toDate || now + (30 * 24 * 60 * 60 * 1000); // 30 days default

    const itineraries = await ctx.db
      .query("itineraries")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return itineraries
      .filter(i =>
        i.status === 'scheduled' &&
        i.startDate >= fromDate &&
        i.startDate <= toDate
      )
      .sort((a, b) => a.startDate - b.startDate);
  },
});

// Get a single itinerary by ID
export const get = query({
  args: { id: v.id("itineraries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get itinerary by quotation ID
export const byQuotation = query({
  args: { quotationId: v.id("quotations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_quotation", (q) => q.eq("quotationId", args.quotationId))
      .first();
  },
});

// Generate next itinerary number
async function generateItineraryNumber(ctx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await ctx.db
    .query("itineraries")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const thisYearItineraries = existing.filter((i: any) =>
    i.itineraryNumber.startsWith(`IT-${year}`)
  );

  const nextNum = thisYearItineraries.length + 1;
  return `IT-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Create itinerary from approved quotation
export const createFromQuotation = mutation({
  args: {
    quotationId: v.id("quotations"),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    driverId: v.optional(v.id("drivers")),
    vehicleId: v.optional(v.id("vehicles")),
    pickupLocation: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffLocation: v.optional(v.string()),
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the quotation
    const quotation = await ctx.db.get(args.quotationId);
    if (!quotation) throw new Error("Quotation not found");
    if (quotation.status !== 'approved') {
      throw new Error("Only approved quotations can be converted to itineraries");
    }

    // Check if itinerary already exists for this quotation
    const existing = await ctx.db
      .query("itineraries")
      .withIndex("by_quotation", (q) => q.eq("quotationId", args.quotationId))
      .first();
    if (existing) {
      throw new Error("An itinerary already exists for this quotation");
    }

    const now = Date.now();
    const itineraryNumber = await generateItineraryNumber(ctx, quotation.tenantId);

    // Use quotation's vehicle if not specified
    const vehicleId = args.vehicleId || quotation.vehicleId;

    return await ctx.db.insert("itineraries", {
      tenantId: quotation.tenantId,
      itineraryNumber,
      quotationId: args.quotationId,
      clientId: quotation.clientId,
      vehicleId,
      driverId: args.driverId,
      createdBy: quotation.createdBy,
      // Copy trip details from quotation
      origin: quotation.origin,
      destination: quotation.destination,
      baseLocation: quotation.baseLocation,
      groupSize: quotation.groupSize,
      totalDistance: quotation.totalDistance,
      totalTime: quotation.totalTime,
      // Schedule
      startDate: args.startDate,
      endDate: args.endDate,
      estimatedDays: quotation.estimatedDays,
      // Pickup/Dropoff
      pickupLocation: args.pickupLocation || quotation.origin,
      pickupTime: args.pickupTime,
      pickupNotes: args.pickupNotes,
      dropoffLocation: args.dropoffLocation || quotation.destination,
      dropoffTime: args.dropoffTime,
      dropoffNotes: args.dropoffNotes,
      // Pricing
      agreedPriceHnl: quotation.salePriceHnl,
      agreedPriceUsd: quotation.salePriceUsd,
      exchangeRateUsed: quotation.exchangeRateUsed,
      // Status
      status: 'scheduled',
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create itinerary manually (without quotation)
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    driverId: v.optional(v.id("drivers")),
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    totalDistance: v.number(),
    totalTime: v.number(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    estimatedDays: v.number(),
    pickupLocation: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffLocation: v.optional(v.string()),
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    agreedPriceHnl: v.number(),
    agreedPriceUsd: v.number(),
    exchangeRateUsed: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const itineraryNumber = await generateItineraryNumber(ctx, args.tenantId);

    return await ctx.db.insert("itineraries", {
      ...args,
      itineraryNumber,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update itinerary
export const update = mutation({
  args: {
    id: v.id("itineraries"),
    vehicleId: v.optional(v.id("vehicles")),
    driverId: v.optional(v.id("drivers")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    pickupLocation: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffLocation: v.optional(v.string()),
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    routeLink: v.optional(v.string()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Itinerary not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Update itinerary status
export const updateStatus = mutation({
  args: {
    id: v.id("itineraries"),
    status: v.string(),
    cancellationReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, cancellationReason } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Itinerary not found");

    const now = Date.now();
    const updates: Record<string, any> = {
      status,
      updatedAt: now,
    };

    // Set timestamp based on status
    if (status === 'in_progress') updates.startedAt = now;
    if (status === 'completed') updates.completedAt = now;
    if (status === 'cancelled') {
      updates.cancelledAt = now;
      if (cancellationReason) updates.cancellationReason = cancellationReason;
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Assign driver to itinerary
export const assignDriver = mutation({
  args: {
    id: v.id("itineraries"),
    driverId: v.id("drivers"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Itinerary not found");

    await ctx.db.patch(args.id, {
      driverId: args.driverId,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Assign vehicle to itinerary
export const assignVehicle = mutation({
  args: {
    id: v.id("itineraries"),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Itinerary not found");

    await ctx.db.patch(args.id, {
      vehicleId: args.vehicleId,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Delete itinerary (only scheduled)
export const remove = mutation({
  args: { id: v.id("itineraries") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Itinerary not found");
    if (existing.status !== 'scheduled') {
      throw new Error("Only scheduled itineraries can be deleted. Cancel instead.");
    }
    await ctx.db.delete(args.id);
  },
});
