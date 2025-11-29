import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Bootstrap functions for initial setup and migration
 *
 * NOTE: The multi-tenant architecture no longer auto-creates a default tenant.
 * New users must go through the onboarding flow to create their organization.
 * These functions are kept for:
 * 1. Legacy support during migration
 * 2. Development/testing purposes
 * 3. Migrating existing "default" tenant to a real organization
 */

// Get default tenant if it exists (for migration purposes)
export const getDefaultTenant = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .first();
  },
});

// DEPRECATED: This function is kept for backwards compatibility during migration
// New users should use tenants.createWithTrial instead
export const getOrCreateDefaultTenant = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if default tenant exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .first();

    if (existing) {
      return existing._id;
    }

    // In production, we should NOT auto-create tenants
    // This is kept for development/migration only
    console.warn("DEPRECATED: Auto-creating default tenant. Use tenants.createWithTrial for new orgs.");

    const now = Date.now();
    const tenantId = await ctx.db.insert("tenants", {
      companyName: "RouteWise Demo",
      slug: "default",
      plan: "professional",
      status: "active",
      primaryContactEmail: "demo@routewise.app",
      country: "HN",
      timezone: "America/Tegucigalpa",
      createdAt: now,
      updatedAt: now,
    });

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
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return tenantId;
  },
});

// Update user last login time
export const updateUserLastLogin = mutation({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();

    if (user) {
      const now = Date.now();
      await ctx.db.patch(user._id, {
        lastLoginAt: now,
        updatedAt: now,
      });
      return { success: true, userId: user._id };
    }

    return { success: false, userId: null };
  },
});

// DEPRECATED: ensureUser is no longer needed with proper multi-tenant flow
// Users are created via:
// 1. tenants.createWithTrial (owner during org setup)
// 2. invitations.accept (team member via invite)
export const ensureUser = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update last login for existing user
      await ctx.db.patch(existingUser._id, {
        lastLoginAt: now,
        updatedAt: now,
      });
      return {
        userId: existingUser._id,
        tenantId: existingUser.tenantId,
        role: existingUser.role,
        isNew: false,
      };
    }

    // For new users, check if there's a pending invitation
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (invitation && invitation.expiresAt > now) {
      // User has pending invitation - they should go through invite acceptance flow
      return {
        userId: null,
        tenantId: null,
        role: null,
        isNew: true,
        hasInvitation: true,
        invitationToken: invitation.token,
      };
    }

    // New user without invitation - they need to go through onboarding
    // Do NOT auto-create user here - redirect to onboarding
    return {
      userId: null,
      tenantId: null,
      role: null,
      isNew: true,
      needsOnboarding: true,
    };
  },
});

// Seed sample data for demo tenant
export const seedSampleData = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if already seeded (has vehicles)
    const existingVehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existingVehicles) {
      return { seeded: false, message: "Data already exists" };
    }

    // Seed vehicles
    const vehicles = [
      {
        name: "Toyota Hiace 15-Passenger",
        make: "Toyota",
        model: "Hiace",
        year: 2022,
        passengerCapacity: 15,
        fuelCapacity: 70,
        fuelEfficiency: 12,
        fuelEfficiencyUnit: "kpl",
        costPerDistance: 2.5,
        costPerDay: 1200,
        distanceUnit: "km",
        ownership: "owned",
        status: "active",
      },
      {
        name: "Mercedes Sprinter 19-Passenger",
        make: "Mercedes-Benz",
        model: "Sprinter",
        year: 2023,
        passengerCapacity: 19,
        fuelCapacity: 75,
        fuelEfficiency: 10,
        fuelEfficiencyUnit: "kpl",
        costPerDistance: 3.0,
        costPerDay: 1800,
        distanceUnit: "km",
        ownership: "owned",
        status: "active",
      },
      {
        name: "Coaster Bus 30-Passenger",
        make: "Toyota",
        model: "Coaster",
        year: 2021,
        passengerCapacity: 30,
        fuelCapacity: 100,
        fuelEfficiency: 8,
        fuelEfficiencyUnit: "kpl",
        costPerDistance: 4.0,
        costPerDay: 2500,
        distanceUnit: "km",
        ownership: "owned",
        status: "active",
      },
    ];

    for (const vehicle of vehicles) {
      await ctx.db.insert("vehicles", {
        tenantId: args.tenantId,
        ...vehicle,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Seed sample clients
    const clients = [
      {
        type: "company",
        companyName: "Honduras Tours S.A.",
        email: "reservations@hondurastours.hn",
        phone: "+504 2232-5555",
        city: "Tegucigalpa",
        country: "HN",
        pricingLevel: "vip",
        discountPercentage: 15,
        creditLimit: 50000,
        paymentTerms: 30,
        status: "active",
      },
      {
        type: "company",
        companyName: "Copan Travel Agency",
        email: "info@copantravel.com",
        phone: "+504 2651-4444",
        city: "Copan Ruinas",
        country: "HN",
        pricingLevel: "preferred",
        discountPercentage: 10,
        creditLimit: 25000,
        paymentTerms: 15,
        status: "active",
      },
      {
        type: "individual",
        firstName: "Carlos",
        lastName: "Martinez",
        email: "carlos.martinez@gmail.com",
        phone: "+504 9876-5432",
        city: "San Pedro Sula",
        country: "HN",
        pricingLevel: "standard",
        discountPercentage: 0,
        creditLimit: 5000,
        paymentTerms: 0,
        status: "active",
      },
    ];

    for (const client of clients) {
      await ctx.db.insert("clients", {
        tenantId: args.tenantId,
        ...client,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Seed sample drivers
    const drivers = [
      {
        firstName: "Jose",
        lastName: "Hernandez",
        phone: "+504 9999-1111",
        licenseNumber: "DL-2020-12345",
        licenseExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
        licenseCategory: "Comercial B",
        status: "active",
        hireDate: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000, // 2 years ago
      },
      {
        firstName: "Maria",
        lastName: "Lopez",
        phone: "+504 9999-2222",
        licenseNumber: "DL-2021-67890",
        licenseExpiry: Date.now() + 180 * 24 * 60 * 60 * 1000, // 6 months from now
        licenseCategory: "Comercial A",
        status: "active",
        hireDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
      },
    ];

    for (const driver of drivers) {
      await ctx.db.insert("drivers", {
        tenantId: args.tenantId,
        ...driver,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { seeded: true, message: "Sample data created successfully" };
  },
});
