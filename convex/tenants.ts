import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Plan limits and features (mirrors src/lib/constants/plans.ts)
const PLAN_DEFAULTS = {
  trial: {
    maxUsers: 1,
    maxVehicles: 1,
    maxDrivers: 1,
    maxQuotationsPerMonth: 10,
    maxEmailsPerMonth: 0,
    features: {
      emailEnabled: false,
      pdfExport: false, // watermarked in UI
      customBranding: false,
      apiAccess: false,
      advancedReports: false,
      multiCurrency: false,
    },
  },
  starter: {
    maxUsers: 2,
    maxVehicles: 5,
    maxDrivers: 5,
    maxQuotationsPerMonth: 50,
    maxEmailsPerMonth: 10,
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: false,
      apiAccess: false,
      advancedReports: false,
      multiCurrency: false,
    },
  },
  professional: {
    maxUsers: 5,
    maxVehicles: 15,
    maxDrivers: 15,
    maxQuotationsPerMonth: -1,
    maxEmailsPerMonth: -1,
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: false,
      advancedReports: true,
      multiCurrency: true,
    },
  },
  business: {
    maxUsers: 15,
    maxVehicles: 50,
    maxDrivers: 50,
    maxQuotationsPerMonth: -1,
    maxEmailsPerMonth: -1,
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      multiCurrency: true,
    },
  },
  enterprise: {
    maxUsers: -1,
    maxVehicles: -1,
    maxDrivers: -1,
    maxQuotationsPerMonth: -1,
    maxEmailsPerMonth: -1,
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      multiCurrency: true,
    },
  },
  founder: {
    maxUsers: 15,
    maxVehicles: 50,
    maxDrivers: 50,
    maxQuotationsPerMonth: -1,
    maxEmailsPerMonth: -1,
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      multiCurrency: true,
    },
  },
} as const;

const TRIAL_DURATION_DAYS = 14;

// Helper to generate URL-friendly slug from company name
function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Get tenant by slug
export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get tenant by ID
export const get = query({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get tenant with usage stats
export const getWithUsage = query({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.id);
    if (!tenant) return null;

    // Count resources for this tenant
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.id))
      .collect();

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.id))
      .collect();

    const drivers = await ctx.db
      .query("drivers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.id))
      .collect();

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.id))
      .collect();

    return {
      ...tenant,
      usage: {
        usersCount: users.length,
        vehiclesCount: vehicles.length,
        driversCount: drivers.length,
        clientsCount: clients.length,
      },
    };
  },
});

// Create a new tenant (organization) with trial
export const createWithTrial = mutation({
  args: {
    companyName: v.string(),
    primaryContactEmail: v.string(),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    timezone: v.string(),
    // Owner info for creating the first user
    ownerWorkosUserId: v.string(),
    ownerFullName: v.string(),
    ownerAvatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate unique slug
    let baseSlug = generateSlug(args.companyName);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (true) {
      const existing = await ctx.db
        .query("tenants")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Calculate trial dates
    const trialStartedAt = now;
    const trialEndsAt = now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

    // Get trial plan limits
    const planDefaults = PLAN_DEFAULTS.trial;

    // Create tenant with trial plan
    const tenantId = await ctx.db.insert("tenants", {
      companyName: args.companyName,
      slug,
      plan: "trial",
      status: "active",
      primaryContactEmail: args.primaryContactEmail,
      primaryContactPhone: args.primaryContactPhone,
      address: args.address,
      city: args.city,
      country: args.country,
      timezone: args.timezone,
      // Subscription tracking
      subscriptionStatus: "trialing",
      billingCycle: undefined,
      trialStartedAt,
      trialEndsAt,
      currentPeriodStart: trialStartedAt,
      currentPeriodEnd: trialEndsAt,
      // Plan limits
      maxUsers: planDefaults.maxUsers,
      maxVehicles: planDefaults.maxVehicles,
      maxDrivers: planDefaults.maxDrivers,
      maxQuotationsPerMonth: planDefaults.maxQuotationsPerMonth,
      maxEmailsPerMonth: planDefaults.maxEmailsPerMonth,
      // Features
      features: planDefaults.features,
      createdAt: now,
      updatedAt: now,
    });

    // Create owner user
    const userId = await ctx.db.insert("users", {
      tenantId,
      workosUserId: args.ownerWorkosUserId,
      email: args.primaryContactEmail,
      fullName: args.ownerFullName,
      avatarUrl: args.ownerAvatarUrl,
      role: "admin",
      status: "active",
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update tenant with owner reference
    await ctx.db.patch(tenantId, { ownerId: userId });

    // Create default parameters for current year
    const year = new Date().getFullYear();
    await ctx.db.insert("parameters", {
      tenantId,
      year,
      fuelPrice: 110.0,
      mealCostPerDay: 250.0,
      hotelCostPerNight: 800.0,
      driverIncentivePerDay: 500.0,
      exchangeRate: 24.75,
      useCustomExchangeRate: false,
      preferredDistanceUnit: "km",
      preferredCurrency: "HNL",
      localCurrency: "HNL",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial usage tracking record
    await ctx.db.insert("usageTracking", {
      tenantId,
      periodStart: trialStartedAt,
      periodEnd: trialEndsAt,
      quotationsCreated: 0,
      emailsSent: 0,
      pdfGenerated: 0,
      usersCount: 1,
      vehiclesCount: 0,
      driversCount: 0,
      clientsCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      tenantId,
      userId,
      slug,
      trialEndsAt,
    };
  },
});

// Legacy create (for backwards compatibility)
export const create = mutation({
  args: {
    companyName: v.string(),
    slug: v.string(),
    plan: v.string(),
    status: v.string(),
    logoUrl: v.optional(v.string()),
    primaryContactEmail: v.string(),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if slug is unique
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error("A tenant with this slug already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("tenants", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update tenant
export const update = mutation({
  args: {
    id: v.id("tenants"),
    companyName: v.optional(v.string()),
    plan: v.optional(v.string()),
    status: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryContactEmail: v.optional(v.string()),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    timezone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    fiscalDocumentName: v.optional(v.string()),
    fiscalDocumentNumber: v.optional(v.string()),
    defaultPaymentConditions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Tenant not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// ============================================================
// LOGO UPLOAD
// ============================================================

// Generate upload URL for logo
export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save logo after upload
export const saveLogo = mutation({
  args: {
    tenantId: v.id("tenants"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Get the URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);

    // Delete old logo if exists
    if (tenant.logoStorageId) {
      await ctx.storage.delete(tenant.logoStorageId);
    }

    // Update tenant with new logo
    await ctx.db.patch(args.tenantId, {
      logoStorageId: args.storageId,
      logoUrl: url,
      updatedAt: Date.now(),
    });

    return { success: true, logoUrl: url };
  },
});

// Delete logo
export const deleteLogo = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Delete from storage if exists
    if (tenant.logoStorageId) {
      await ctx.storage.delete(tenant.logoStorageId);
    }

    // Clear logo fields
    await ctx.db.patch(args.tenantId, {
      logoStorageId: undefined,
      logoUrl: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================
// SALES AGENTS MANAGEMENT
// ============================================================

// Get sales agents for dropdown (enriched with user data)
export const getSalesAgents = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant?.salesAgents) return [];

    // Enrich with user data
    const agents = await Promise.all(
      tenant.salesAgents.map(async (agent) => {
        const user = await ctx.db.get(agent.userId);
        return {
          userId: agent.userId,
          initials: agent.initials,
          isDefault: agent.isDefault,
          name: user?.fullName || user?.email || 'Unknown',
          email: user?.email || '',
          avatarUrl: user?.avatarUrl,
        };
      })
    );
    return agents;
  },
});

// Update sales agents list
export const updateSalesAgents = mutation({
  args: {
    tenantId: v.id("tenants"),
    salesAgents: v.array(v.object({
      userId: v.id("users"),
      initials: v.string(),
      isDefault: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Validate that all users belong to this tenant
    for (const agent of args.salesAgents) {
      const user = await ctx.db.get(agent.userId);
      if (!user || user.tenantId !== args.tenantId) {
        throw new Error(`Invalid user: ${agent.userId}`);
      }
    }

    // Ensure only one default agent
    const defaultCount = args.salesAgents.filter(a => a.isDefault).length;
    if (defaultCount > 1) {
      throw new Error("Only one agent can be set as default");
    }

    await ctx.db.patch(args.tenantId, {
      salesAgents: args.salesAgents,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Add a sales agent
export const addSalesAgent = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    initials: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Validate user belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user || user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    const currentAgents = tenant.salesAgents || [];

    // Check if user is already an agent
    if (currentAgents.some(a => a.userId === args.userId)) {
      throw new Error("User is already a sales agent");
    }

    // If this is the first agent or marked as default, make it default
    const isDefault = args.isDefault || currentAgents.length === 0;

    // If setting as default, clear other defaults
    const updatedAgents = isDefault
      ? currentAgents.map(a => ({ ...a, isDefault: false }))
      : currentAgents;

    updatedAgents.push({
      userId: args.userId,
      initials: args.initials.toUpperCase().substring(0, 3),
      isDefault,
    });

    await ctx.db.patch(args.tenantId, {
      salesAgents: updatedAgents,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove a sales agent
export const removeSalesAgent = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const currentAgents = tenant.salesAgents || [];
    const agentToRemove = currentAgents.find(a => a.userId === args.userId);

    if (!agentToRemove) {
      throw new Error("User is not a sales agent");
    }

    const updatedAgents = currentAgents.filter(a => a.userId !== args.userId);

    // If removed agent was default, make first remaining agent default
    if (agentToRemove.isDefault && updatedAgents.length > 0) {
      updatedAgents[0].isDefault = true;
    }

    await ctx.db.patch(args.tenantId, {
      salesAgents: updatedAgents,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get default sales agent
export const getDefaultSalesAgent = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant?.salesAgents) return null;

    const defaultAgent = tenant.salesAgents.find(a => a.isDefault);
    if (!defaultAgent) return null;

    const user = await ctx.db.get(defaultAgent.userId);
    return {
      userId: defaultAgent.userId,
      initials: defaultAgent.initials,
      name: user?.fullName || user?.email || 'Unknown',
      email: user?.email || '',
    };
  },
});
