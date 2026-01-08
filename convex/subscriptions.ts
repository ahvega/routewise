import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";

/**
 * Subscription management for Stripe billing
 *
 * This module handles:
 * - Plan upgrades/downgrades
 * - Stripe webhook processing
 * - Subscription status management
 * - Founder lifetime deal redemption
 */

// Plan configurations with Stripe price IDs
// These should be set in environment variables in production
const STRIPE_PRICE_IDS = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
  professional_monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
  professional_yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || 'price_professional_yearly',
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || 'price_business_monthly',
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || 'price_business_yearly',
  founder_lifetime: process.env.STRIPE_PRICE_FOUNDER_LIFETIME || 'price_founder_lifetime',
} as const;

// Plan limits (should match plans.ts)
const PLAN_LIMITS = {
  trial: { maxUsers: 1, maxVehicles: 1, maxDrivers: 1, maxQuotationsPerMonth: 10, maxEmailsPerMonth: 0 },
  starter: { maxUsers: 2, maxVehicles: 5, maxDrivers: 5, maxQuotationsPerMonth: 50, maxEmailsPerMonth: 10 },
  professional: { maxUsers: 5, maxVehicles: 15, maxDrivers: 15, maxQuotationsPerMonth: -1, maxEmailsPerMonth: -1 },
  business: { maxUsers: 15, maxVehicles: 50, maxDrivers: 50, maxQuotationsPerMonth: -1, maxEmailsPerMonth: -1 },
  enterprise: { maxUsers: -1, maxVehicles: -1, maxDrivers: -1, maxQuotationsPerMonth: -1, maxEmailsPerMonth: -1 },
  founder: { maxUsers: 15, maxVehicles: 50, maxDrivers: 50, maxQuotationsPerMonth: -1, maxEmailsPerMonth: -1 },
} as const;

const PLAN_FEATURES = {
  trial: { emailEnabled: false, pdfExport: false, customBranding: false, apiAccess: false, advancedReports: false, multiCurrency: false },
  starter: { emailEnabled: true, pdfExport: true, customBranding: false, apiAccess: false, advancedReports: false, multiCurrency: false },
  professional: { emailEnabled: true, pdfExport: true, customBranding: true, apiAccess: false, advancedReports: true, multiCurrency: true },
  business: { emailEnabled: true, pdfExport: true, customBranding: true, apiAccess: true, advancedReports: true, multiCurrency: true },
  enterprise: { emailEnabled: true, pdfExport: true, customBranding: true, apiAccess: true, advancedReports: true, multiCurrency: true },
  founder: { emailEnabled: true, pdfExport: true, customBranding: true, apiAccess: true, advancedReports: true, multiCurrency: true },
} as const;

// Get current subscription details
export const getSubscription = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) return null;

    return {
      plan: tenant.plan,
      status: tenant.subscriptionStatus,
      billingCycle: tenant.billingCycle,
      trialEndsAt: tenant.trialEndsAt,
      currentPeriodStart: tenant.currentPeriodStart,
      currentPeriodEnd: tenant.currentPeriodEnd,
      subscriptionId: tenant.subscriptionId,
    };
  },
});

// Update subscription from Stripe webhook
export const updateFromStripe = mutation({
  args: {
    tenantId: v.id("tenants"),
    subscriptionId: v.string(),
    status: v.string(),
    plan: v.string(),
    billingCycle: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const planKey = args.plan as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.trial;
    const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.trial;

    await ctx.db.patch(args.tenantId, {
      subscriptionId: args.subscriptionId,
      subscriptionStatus: args.status,
      plan: args.plan,
      billingCycle: args.billingCycle,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      // Update limits based on plan
      maxUsers: limits.maxUsers,
      maxVehicles: limits.maxVehicles,
      maxDrivers: limits.maxDrivers,
      maxQuotationsPerMonth: limits.maxQuotationsPerMonth,
      maxEmailsPerMonth: limits.maxEmailsPerMonth,
      // Update features
      features,
      // Clear trial dates for paid plans
      trialEndsAt: args.plan === 'trial' ? undefined : undefined,
      status: args.status === 'active' ? 'active' : 'suspended',
      updatedAt: now,
    });

    return { success: true };
  },
});

// Handle subscription cancellation
export const cancelSubscription = mutation({
  args: {
    tenantId: v.id("tenants"),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const now = Date.now();

    if (args.cancelAtPeriodEnd) {
      // Schedule cancellation at period end
      await ctx.db.patch(args.tenantId, {
        subscriptionStatus: 'cancelled',
        updatedAt: now,
      });
    } else {
      // Immediate cancellation - downgrade to trial
      const limits = PLAN_LIMITS.trial;
      const features = PLAN_FEATURES.trial;

      await ctx.db.patch(args.tenantId, {
        subscriptionId: undefined,
        subscriptionStatus: 'cancelled',
        plan: 'trial',
        billingCycle: undefined,
        maxUsers: limits.maxUsers,
        maxVehicles: limits.maxVehicles,
        maxDrivers: limits.maxDrivers,
        maxQuotationsPerMonth: limits.maxQuotationsPerMonth,
        maxEmailsPerMonth: limits.maxEmailsPerMonth,
        features,
        status: 'trial_expired',
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Redeem founder lifetime deal
export const redeemFounderDeal = mutation({
  args: {
    tenantId: v.id("tenants"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Check if already on founder plan
    if (tenant.plan === 'founder') {
      throw new Error("Already on Founder plan");
    }

    const now = Date.now();
    const limits = PLAN_LIMITS.founder;
    const features = PLAN_FEATURES.founder;

    // Set to founder plan with lifetime access
    await ctx.db.patch(args.tenantId, {
      subscriptionId: args.paymentIntentId,
      subscriptionStatus: 'active',
      plan: 'founder',
      billingCycle: 'lifetime',
      // No period end for lifetime
      currentPeriodStart: now,
      currentPeriodEnd: undefined,
      // Founder limits
      maxUsers: limits.maxUsers,
      maxVehicles: limits.maxVehicles,
      maxDrivers: limits.maxDrivers,
      maxQuotationsPerMonth: limits.maxQuotationsPerMonth,
      maxEmailsPerMonth: limits.maxEmailsPerMonth,
      features,
      // Clear trial
      trialEndsAt: undefined,
      status: 'active',
      updatedAt: now,
    });

    return { success: true };
  },
});

// Check trial status and expire if needed
export const checkTrialExpiry = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) return { expired: false };

    if (tenant.plan !== 'trial') {
      return { expired: false };
    }

    const now = Date.now();
    if (tenant.trialEndsAt && tenant.trialEndsAt < now) {
      await ctx.db.patch(args.tenantId, {
        status: 'trial_expired',
        subscriptionStatus: 'expired',
        updatedAt: now,
      });
      return { expired: true };
    }

    return { expired: false };
  },
});

// Upgrade plan (manual upgrade without Stripe for testing)
export const upgradePlan = mutation({
  args: {
    tenantId: v.id("tenants"),
    plan: v.string(),
    billingCycle: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const now = Date.now();
    const planKey = args.plan as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[planKey];
    const features = PLAN_FEATURES[planKey];

    if (!limits || !features) {
      throw new Error("Invalid plan");
    }

    // Calculate period dates
    const periodStart = now;
    const periodEnd = args.billingCycle === 'yearly'
      ? now + 365 * 24 * 60 * 60 * 1000
      : args.billingCycle === 'lifetime'
        ? undefined
        : now + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.tenantId, {
      plan: args.plan,
      subscriptionStatus: 'active',
      billingCycle: args.billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      maxUsers: limits.maxUsers,
      maxVehicles: limits.maxVehicles,
      maxDrivers: limits.maxDrivers,
      maxQuotationsPerMonth: limits.maxQuotationsPerMonth,
      maxEmailsPerMonth: limits.maxEmailsPerMonth,
      features,
      trialEndsAt: undefined,
      status: 'active',
      updatedAt: now,
    });

    return { success: true };
  },
});
