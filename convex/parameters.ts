import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get active parameters for a tenant
export const getActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const params = await ctx.db
      .query("parameters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return params.find(p => p.isActive) || null;
  },
});

// Get parameters by year
export const byYear = query({
  args: {
    tenantId: v.id("tenants"),
    year: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parameters")
      .withIndex("by_tenant_year", (q) =>
        q.eq("tenantId", args.tenantId).eq("year", args.year)
      )
      .first();
  },
});

// List all parameters for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parameters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

// Create parameters for a year
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    year: v.number(),
    fuelPrice: v.number(),
    mealCostPerDay: v.number(),
    hotelCostPerNight: v.number(),
    driverIncentivePerDay: v.number(),
    exchangeRate: v.number(),
    useCustomExchangeRate: v.boolean(),
    preferredDistanceUnit: v.string(),
    preferredCurrency: v.string(),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If setting as active, deactivate other parameters
    if (args.isActive) {
      const existing = await ctx.db
        .query("parameters")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      for (const param of existing) {
        if (param.isActive) {
          await ctx.db.patch(param._id, { isActive: false, updatedAt: now });
        }
      }
    }

    return await ctx.db.insert("parameters", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update parameters
export const update = mutation({
  args: {
    id: v.id("parameters"),
    fuelPrice: v.optional(v.number()),
    mealCostPerDay: v.optional(v.number()),
    hotelCostPerNight: v.optional(v.number()),
    driverIncentivePerDay: v.optional(v.number()),
    exchangeRate: v.optional(v.number()),
    useCustomExchangeRate: v.optional(v.boolean()),
    preferredDistanceUnit: v.optional(v.string()),
    preferredCurrency: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, isActive, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Parameters not found");

    const now = Date.now();

    // If setting as active, deactivate other parameters
    if (isActive === true) {
      const allParams = await ctx.db
        .query("parameters")
        .withIndex("by_tenant", (q) => q.eq("tenantId", existing.tenantId))
        .collect();

      for (const param of allParams) {
        if (param._id !== id && param.isActive) {
          await ctx.db.patch(param._id, { isActive: false, updatedAt: now });
        }
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      isActive,
      updatedAt: now,
    });
    return id;
  },
});
