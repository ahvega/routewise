import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all drivers for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("drivers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

// Get active drivers
export const listActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const drivers = await ctx.db
      .query("drivers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return drivers.filter(d => d.status === 'active');
  },
});

// Get a single driver by ID
export const get = query({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new driver
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    licenseNumber: v.string(),
    licenseExpiry: v.number(),
    licenseCategory: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    status: v.string(),
    hireDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("drivers", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a driver
export const update = mutation({
  args: {
    id: v.id("drivers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseExpiry: v.optional(v.number()),
    licenseCategory: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    status: v.optional(v.string()),
    hireDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Driver not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete a driver
export const remove = mutation({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
