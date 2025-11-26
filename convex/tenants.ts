import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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

// Create a new tenant (organization)
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
