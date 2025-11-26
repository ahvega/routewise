import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Bootstrap functions for initial setup
 * Creates default tenant and user associations
 */

// Get or create default tenant for development
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

    // Create default tenant
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
      fuelPrice: 110.0, // HNL per gallon
      mealCostPerDay: 250.0, // HNL
      hotelCostPerNight: 800.0, // HNL
      driverIncentivePerDay: 500.0, // HNL
      exchangeRate: 24.75, // HNL per USD
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

// Get default tenant (query version)
export const getDefaultTenant = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .first();
  },
});

// Ensure user exists in database and is linked to tenant
export const ensureUser = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get or create default tenant
    let tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .first();

    if (!tenant) {
      const now = Date.now();
      const tenantId = await ctx.db.insert("tenants", {
        companyName: "RouteWise Demo",
        slug: "default",
        plan: "professional",
        status: "active",
        primaryContactEmail: args.email,
        country: "HN",
        timezone: "America/Tegucigalpa",
        createdAt: now,
        updatedAt: now,
      });
      tenant = await ctx.db.get(tenantId);
    }

    if (!tenant) {
      throw new Error("Failed to create tenant");
    }

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update last login
      await ctx.db.patch(existingUser._id, {
        lastLoginAt: now,
        updatedAt: now,
      });
      return {
        userId: existingUser._id,
        tenantId: existingUser.tenantId,
        role: existingUser.role,
      };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      tenantId: tenant._id,
      workosUserId: args.workosUserId,
      email: args.email,
      fullName: args.fullName,
      avatarUrl: args.avatarUrl,
      role: "admin", // First user is admin
      status: "active",
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      tenantId: tenant._id,
      role: "admin",
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
