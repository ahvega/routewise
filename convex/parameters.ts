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
    // Currency configuration
    localCurrency: v.optional(v.string()),
    exchangeRate: v.number(),
    useCustomExchangeRate: v.boolean(),
    exchangeRateUpdatedAt: v.optional(v.number()),
    preferredDistanceUnit: v.string(),
    preferredCurrency: v.string(),
    // Operating costs
    fuelPrice: v.number(),
    fuelPriceCurrency: v.optional(v.string()),
    mealCostPerDay: v.number(),
    mealCostCurrency: v.optional(v.string()),
    hotelCostPerNight: v.number(),
    hotelCostCurrency: v.optional(v.string()),
    driverIncentivePerDay: v.number(),
    driverIncentiveCurrency: v.optional(v.string()),
    // Rounding preferences
    roundingLocal: v.optional(v.number()),
    roundingUsd: v.optional(v.number()),
    // Terms and Conditions
    quotationValidityDays: v.optional(v.number()),
    prepaymentDays: v.optional(v.number()),
    cancellationMinHours: v.optional(v.number()),
    cancellationPenaltyPercentage: v.optional(v.number()),
    // Client pricing levels
    pricingLevels: v.optional(v.array(v.object({
      key: v.string(),
      name: v.string(),
      discountPercentage: v.number(),
      isDefault: v.optional(v.boolean()),
    }))),
    // Driver license categories
    licenseCategories: v.optional(v.array(v.object({
      key: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    }))),
    // Custom vehicle makes/models (tenant-specific)
    customVehicleMakes: v.optional(v.array(v.object({
      make: v.string(),
      models: v.array(v.string()),
    }))),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Set defaults for new currency fields
    const localCurrency = args.localCurrency || 'HNL';

    // Default pricing levels if not provided
    const pricingLevels = args.pricingLevels || [
      { key: 'standard', name: 'Estándar', discountPercentage: 0, isDefault: true },
      { key: 'preferred', name: 'Preferencial', discountPercentage: 5 },
      { key: 'vip', name: 'VIP', discountPercentage: 10 },
    ];

    // Default license categories if not provided
    const licenseCategories = args.licenseCategories || [
      { key: 'comercial_a', name: 'Comercial A', description: 'Vehículos comerciales pesados' },
      { key: 'comercial_b', name: 'Comercial B', description: 'Vehículos comerciales livianos' },
      { key: 'particular', name: 'Particular', description: 'Vehículos particulares' },
    ];

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
      localCurrency,
      pricingLevels,
      licenseCategories,
      fuelPriceCurrency: args.fuelPriceCurrency || localCurrency,
      mealCostCurrency: args.mealCostCurrency || localCurrency,
      hotelCostCurrency: args.hotelCostCurrency || localCurrency,
      driverIncentiveCurrency: args.driverIncentiveCurrency || localCurrency,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update parameters
export const update = mutation({
  args: {
    id: v.id("parameters"),
    // Currency configuration
    localCurrency: v.optional(v.string()),
    exchangeRate: v.optional(v.number()),
    useCustomExchangeRate: v.optional(v.boolean()),
    exchangeRateUpdatedAt: v.optional(v.number()),
    preferredDistanceUnit: v.optional(v.string()),
    preferredCurrency: v.optional(v.string()),
    // Operating costs
    fuelPrice: v.optional(v.number()),
    fuelPriceCurrency: v.optional(v.string()),
    mealCostPerDay: v.optional(v.number()),
    mealCostCurrency: v.optional(v.string()),
    hotelCostPerNight: v.optional(v.number()),
    hotelCostCurrency: v.optional(v.string()),
    driverIncentivePerDay: v.optional(v.number()),
    driverIncentiveCurrency: v.optional(v.string()),
    // Rounding preferences
    roundingLocal: v.optional(v.number()),
    roundingUsd: v.optional(v.number()),
    // Terms and Conditions
    quotationValidityDays: v.optional(v.number()),
    prepaymentDays: v.optional(v.number()),
    cancellationMinHours: v.optional(v.number()),
    cancellationPenaltyPercentage: v.optional(v.number()),
    // Client pricing levels
    pricingLevels: v.optional(v.array(v.object({
      key: v.string(),
      name: v.string(),
      discountPercentage: v.number(),
      isDefault: v.optional(v.boolean()),
    }))),
    // Driver license categories
    licenseCategories: v.optional(v.array(v.object({
      key: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    }))),
    // Custom vehicle makes/models (tenant-specific)
    customVehicleMakes: v.optional(v.array(v.object({
      make: v.string(),
      models: v.array(v.string()),
    }))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, isActive, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Parameters not found");

    const now = Date.now();

    // Determine the final isActive value - use provided value, or preserve existing, or default to true
    const finalIsActive = isActive !== undefined ? isActive : (existing.isActive ?? true);

    // If setting as active, deactivate other parameters
    if (finalIsActive === true) {
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

    // Clean up undefined values from updates
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...cleanUpdates,
      isActive: finalIsActive,
      updatedAt: now,
    });
    return id;
  },
});
