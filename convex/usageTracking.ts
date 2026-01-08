import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * Usage tracking for billing and plan limit enforcement
 */

// Get current period usage for a tenant
export const getCurrentUsage = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find current period
    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (!usageRecord) {
      // No current period, return zeros
      return {
        periodStart: now,
        periodEnd: now,
        quotationsCreated: 0,
        emailsSent: 0,
        pdfGenerated: 0,
        usersCount: 0,
        vehiclesCount: 0,
        driversCount: 0,
        clientsCount: 0,
      };
    }

    return usageRecord;
  },
});

// Get usage history for a tenant
export const getHistory = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(args.limit || 12);

    return records;
  },
});

// Create or update current period usage record
export const ensureCurrentPeriod = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if current period exists
    const existingRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (existingRecord) {
      return existingRecord._id;
    }

    // Get tenant info for period calculation
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Calculate period dates
    let periodStart: number;
    let periodEnd: number;

    if (tenant.currentPeriodStart && tenant.currentPeriodEnd) {
      // Use subscription period
      periodStart = tenant.currentPeriodStart;
      periodEnd = tenant.currentPeriodEnd;
    } else if (tenant.trialStartedAt && tenant.trialEndsAt) {
      // Use trial period
      periodStart = tenant.trialStartedAt;
      periodEnd = tenant.trialEndsAt;
    } else {
      // Default to monthly from creation
      const createdAt = tenant.createdAt;
      const dayOfMonth = new Date(createdAt).getDate();
      const currentDate = new Date(now);

      // Start of current period
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);
      if (startDate.getTime() > now) {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      periodStart = startDate.getTime();

      // End of current period
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      periodEnd = endDate.getTime();
    }

    // Get current resource counts
    const [users, vehicles, drivers, clients] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("vehicles")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("drivers")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("clients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
    ]);

    // Create new period record
    const recordId = await ctx.db.insert("usageTracking", {
      tenantId: args.tenantId,
      periodStart,
      periodEnd,
      quotationsCreated: 0,
      emailsSent: 0,
      pdfGenerated: 0,
      usersCount: users.length,
      vehiclesCount: vehicles.length,
      driversCount: drivers.length,
      clientsCount: clients.length,
      createdAt: now,
      updatedAt: now,
    });

    return recordId;
  },
});

// Increment quotation count
export const incrementQuotations = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (usageRecord) {
      await ctx.db.patch(usageRecord._id, {
        quotationsCreated: (usageRecord.quotationsCreated || 0) + 1,
        updatedAt: now,
      });
    }
  },
});

// Increment email sent count
export const incrementEmails = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (usageRecord) {
      await ctx.db.patch(usageRecord._id, {
        emailsSent: (usageRecord.emailsSent || 0) + 1,
        updatedAt: now,
      });
    }
  },
});

// Increment PDF generated count
export const incrementPdfs = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (usageRecord) {
      await ctx.db.patch(usageRecord._id, {
        pdfGenerated: (usageRecord.pdfGenerated || 0) + 1,
        updatedAt: now,
      });
    }
  },
});

// Update resource counts snapshot
export const updateResourceCounts = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get current resource counts
    const [users, vehicles, drivers, clients] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("vehicles")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("drivers")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("clients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
    ]);

    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (usageRecord) {
      await ctx.db.patch(usageRecord._id, {
        usersCount: users.length,
        vehiclesCount: vehicles.length,
        driversCount: drivers.length,
        clientsCount: clients.length,
        updatedAt: now,
      });
    }
  },
});
