import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { canAddVehicle, isTenantActive } from "./lib/planLimits";

// List all vehicles for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vehicles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

// Get vehicles by minimum capacity
export const byCapacity = query({
  args: {
    tenantId: v.id("tenants"),
    minCapacity: v.number()
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return vehicles.filter(v => v.passengerCapacity >= args.minCapacity);
  },
});

// Get a single vehicle by ID
export const get = query({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new vehicle
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    licensePlate: v.optional(v.string()),
    passengerCapacity: v.number(),
    fuelCapacity: v.number(),
    fuelCapacityUnit: v.optional(v.string()),
    fuelEfficiency: v.number(),
    fuelEfficiencyUnit: v.string(),
    costPerDistance: v.number(),
    costPerDistanceCurrency: v.optional(v.string()),
    costPerDay: v.number(),
    costPerDayCurrency: v.optional(v.string()),
    distanceUnit: v.string(),
    ownership: v.string(),
    status: v.string(),
    baseLocation: v.optional(v.string()),
    baseLocationLat: v.optional(v.number()),
    baseLocationLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check tenant status
    const tenantStatus = await isTenantActive(ctx, args.tenantId);
    if (!tenantStatus.active) {
      throw new Error(tenantStatus.message || "Account not active");
    }

    // Check plan limits
    const limitCheck = await canAddVehicle(ctx, args.tenantId);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || "Vehicle limit reached");
    }

    const now = Date.now();
    return await ctx.db.insert("vehicles", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a vehicle
export const update = mutation({
  args: {
    id: v.id("vehicles"),
    name: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    licensePlate: v.optional(v.string()),
    passengerCapacity: v.optional(v.number()),
    fuelCapacity: v.optional(v.number()),
    fuelCapacityUnit: v.optional(v.string()),
    fuelEfficiency: v.optional(v.number()),
    fuelEfficiencyUnit: v.optional(v.string()),
    costPerDistance: v.optional(v.number()),
    costPerDistanceCurrency: v.optional(v.string()),
    costPerDay: v.optional(v.number()),
    costPerDayCurrency: v.optional(v.string()),
    distanceUnit: v.optional(v.string()),
    ownership: v.optional(v.string()),
    status: v.optional(v.string()),
    baseLocation: v.optional(v.string()),
    baseLocationLat: v.optional(v.number()),
    baseLocationLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Vehicle not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete a vehicle
export const remove = mutation({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
