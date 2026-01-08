import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Migration utilities for converting existing data to multi-tenant architecture
 */

// Plan configurations
const PLAN_LIMITS = {
  trial: { maxUsers: 1, maxVehicles: 1, maxDrivers: 1, maxQuotationsPerMonth: 10, maxEmailsPerMonth: 0 },
  starter: { maxUsers: 2, maxVehicles: 5, maxDrivers: 5, maxQuotationsPerMonth: 50, maxEmailsPerMonth: 10 },
  professional: { maxUsers: 5, maxVehicles: 15, maxDrivers: 15, maxQuotationsPerMonth: -1, maxEmailsPerMonth: -1 },
  business: { maxUsers: 15, maxVehicles: 50, maxDrivers: 50, maxQuotationsPerMonth: -1, maxEmailsPerMonth: -1 },
  founder: { maxUsers: 15, maxVehicles: 50, maxDrivers: 50, maxQuotationsPerMonth: -1, maxEmailsPerMonth: -1 },
} as const;

const PLAN_FEATURES = {
  trial: { emailEnabled: false, pdfExport: false, customBranding: false, apiAccess: false, advancedReports: false, multiCurrency: false },
  starter: { emailEnabled: true, pdfExport: true, customBranding: false, apiAccess: false, advancedReports: false, multiCurrency: false },
  professional: { emailEnabled: true, pdfExport: true, customBranding: true, apiAccess: false, advancedReports: true, multiCurrency: true },
  business: { emailEnabled: true, pdfExport: true, customBranding: true, apiAccess: true, advancedReports: true, multiCurrency: true },
  founder: { emailEnabled: true, pdfExport: true, customBranding: true, apiAccess: true, advancedReports: true, multiCurrency: true },
} as const;

// Helper to generate URL-friendly slug
function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Check if default tenant exists and get its current state
export const checkDefaultTenant = query({
  args: {},
  handler: async (ctx) => {
    const defaultTenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .first();

    if (!defaultTenant) {
      return { exists: false, tenant: null, stats: null };
    }

    // Get resource counts
    const [users, vehicles, drivers, clients, quotations] = await Promise.all([
      ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", defaultTenant._id)).collect(),
      ctx.db.query("vehicles").withIndex("by_tenant", (q) => q.eq("tenantId", defaultTenant._id)).collect(),
      ctx.db.query("drivers").withIndex("by_tenant", (q) => q.eq("tenantId", defaultTenant._id)).collect(),
      ctx.db.query("clients").withIndex("by_tenant", (q) => q.eq("tenantId", defaultTenant._id)).collect(),
      ctx.db.query("quotations").withIndex("by_tenant", (q) => q.eq("tenantId", defaultTenant._id)).collect(),
    ]);

    return {
      exists: true,
      tenant: defaultTenant,
      stats: {
        usersCount: users.length,
        vehiclesCount: vehicles.length,
        driversCount: drivers.length,
        clientsCount: clients.length,
        quotationsCount: quotations.length,
      },
    };
  },
});

// Migrate default tenant to a real organization
export const migrateDefaultTenant = mutation({
  args: {
    companyName: v.string(),
    plan: v.string(), // 'professional', 'business', 'founder'
    billingCycle: v.optional(v.string()), // 'monthly', 'yearly', 'lifetime'
    primaryContactEmail: v.optional(v.string()),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find default tenant
    const defaultTenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .first();

    if (!defaultTenant) {
      throw new Error("Default tenant not found");
    }

    // Generate new slug from company name
    let baseSlug = generateSlug(args.companyName);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique (excluding the default tenant)
    while (true) {
      const existing = await ctx.db
        .query("tenants")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing || existing._id === defaultTenant._id) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get plan config
    const planKey = args.plan as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.professional;
    const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.professional;

    // Calculate billing period
    let currentPeriodStart = now;
    let currentPeriodEnd: number | undefined;
    const billingCycle = args.billingCycle || (args.plan === 'founder' ? 'lifetime' : 'yearly');

    if (billingCycle === 'yearly') {
      currentPeriodEnd = now + 365 * 24 * 60 * 60 * 1000;
    } else if (billingCycle === 'monthly') {
      currentPeriodEnd = now + 30 * 24 * 60 * 60 * 1000;
    }
    // lifetime has no end

    // Find owner user (first admin in the tenant)
    let ownerId = args.ownerId;
    if (!ownerId) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", defaultTenant._id))
        .collect();
      const admin = users.find(u => u.role === 'admin');
      if (admin) {
        ownerId = admin._id;
      }
    }

    // Update the tenant
    await ctx.db.patch(defaultTenant._id, {
      companyName: args.companyName,
      slug,
      plan: args.plan,
      status: 'active',
      primaryContactEmail: args.primaryContactEmail || defaultTenant.primaryContactEmail,
      primaryContactPhone: args.primaryContactPhone,
      address: args.address,
      city: args.city,
      // Subscription info
      subscriptionStatus: 'active',
      billingCycle,
      currentPeriodStart,
      currentPeriodEnd,
      // Plan limits
      maxUsers: limits.maxUsers,
      maxVehicles: limits.maxVehicles,
      maxDrivers: limits.maxDrivers,
      maxQuotationsPerMonth: limits.maxQuotationsPerMonth,
      maxEmailsPerMonth: limits.maxEmailsPerMonth,
      // Features
      features,
      // Owner
      ownerId,
      // Clear trial info
      trialStartedAt: undefined,
      trialEndsAt: undefined,
      updatedAt: now,
    });

    // Create usage tracking record for the new period
    await ctx.db.insert("usageTracking", {
      tenantId: defaultTenant._id,
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd || currentPeriodStart + 365 * 24 * 60 * 60 * 1000,
      quotationsCreated: 0,
      emailsSent: 0,
      pdfGenerated: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      tenantId: defaultTenant._id,
      newSlug: slug,
      plan: args.plan,
    };
  },
});

// Migrate a user to become the owner of their tenant
export const setTenantOwner = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    await ctx.db.patch(args.tenantId, {
      ownerId: args.userId,
      primaryContactEmail: user.email,
      updatedAt: Date.now(),
    });

    // Make sure the user is an admin
    if (user.role !== 'admin') {
      await ctx.db.patch(args.userId, {
        role: 'admin',
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Upgrade a user to superuser (admin role + enterprise plan with all features)
export const upgradeSuperuser = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Get their tenant
    const tenant = await ctx.db.get(user.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found for user");
    }

    // Enterprise plan limits (unlimited = -1)
    const enterpriseLimits = {
      maxUsers: -1,
      maxVehicles: -1,
      maxDrivers: -1,
      maxQuotationsPerMonth: -1,
      maxEmailsPerMonth: -1,
    };

    // All features enabled
    const enterpriseFeatures = {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      multiCurrency: true,
    };

    // Update user role to admin
    await ctx.db.patch(user._id, {
      role: 'admin',
      updatedAt: now,
    });

    // Update tenant to enterprise plan with lifetime access
    await ctx.db.patch(user.tenantId, {
      plan: 'enterprise',
      status: 'active',
      subscriptionStatus: 'active',
      billingCycle: 'lifetime',
      currentPeriodStart: now,
      currentPeriodEnd: undefined, // Lifetime = no end
      // Unlimited limits
      ...enterpriseLimits,
      // All features
      features: enterpriseFeatures,
      // Set user as owner
      ownerId: user._id,
      // Clear any trial info
      trialStartedAt: undefined,
      trialEndsAt: undefined,
      updatedAt: now,
    });

    return {
      success: true,
      userId: user._id,
      tenantId: user.tenantId,
      email: args.email,
      role: 'admin',
      plan: 'enterprise',
      features: enterpriseFeatures,
      limits: enterpriseLimits,
    };
  },
});

// Add subscription fields to existing tenant (for tenants created before multi-tenant)
export const backfillSubscriptionFields = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const now = Date.now();
    const plan = tenant.plan || 'professional';
    const planKey = plan as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.professional;
    const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.professional;

    // Only update if fields are missing
    const updates: Record<string, any> = { updatedAt: now };

    if (!tenant.subscriptionStatus) {
      updates.subscriptionStatus = 'active';
    }
    if (tenant.maxUsers === undefined) {
      updates.maxUsers = limits.maxUsers;
      updates.maxVehicles = limits.maxVehicles;
      updates.maxDrivers = limits.maxDrivers;
      updates.maxQuotationsPerMonth = limits.maxQuotationsPerMonth;
      updates.maxEmailsPerMonth = limits.maxEmailsPerMonth;
    }
    if (!tenant.features) {
      updates.features = features;
    }
    if (!tenant.currentPeriodStart) {
      updates.currentPeriodStart = tenant.createdAt || now;
      updates.currentPeriodEnd = (tenant.createdAt || now) + 365 * 24 * 60 * 60 * 1000;
    }

    await ctx.db.patch(args.tenantId, updates);

    return { success: true, updated: Object.keys(updates).length > 1 };
  },
});
