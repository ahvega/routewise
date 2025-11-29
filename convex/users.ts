import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user by WorkOS ID
export const byWorkosId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();
  },
});

// Get user by email
export const byEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user with tenant info by WorkOS ID (for auth callback)
export const getWithTenant = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();

    if (!user) return null;

    const tenant = await ctx.db.get(user.tenantId);

    return {
      user,
      tenant,
    };
  },
});

// Check if email has pending invitation
export const checkInvitation = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!invitation) return null;

    // Check if not expired
    if (invitation.expiresAt < Date.now()) {
      return null;
    }

    const tenant = await ctx.db.get(invitation.tenantId);

    return {
      invitation,
      tenant,
    };
  },
});

// Get user by ID
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List users for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

// Create or update user from WorkOS auth
export const upsertFromWorkos = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
    tenantId: v.id("tenants"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        fullName: args.fullName,
        avatarUrl: args.avatarUrl,
        lastLoginAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      ...args,
      status: 'active',
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update user role
export const updateRole = mutation({
  args: {
    id: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("User not found");

    await ctx.db.patch(args.id, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Update user status
export const updateStatus = mutation({
  args: {
    id: v.id("users"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("User not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Remove user from tenant
export const remove = mutation({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    // Prevent deleting the last admin
    const tenantUsers = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", user.tenantId))
      .collect();

    const admins = tenantUsers.filter(u => u.role === "admin" && u._id !== args.id);
    if (user.role === "admin" && admins.length === 0) {
      throw new Error("Cannot remove the last admin from the tenant");
    }

    // Delete the user
    await ctx.db.delete(args.id);

    return { success: true };
  },
});
