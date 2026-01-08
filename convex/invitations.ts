import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { canAddUser, isTenantActive } from "./lib/planLimits";

/**
 * Team invitation system for multi-tenant organizations
 */

// Generate a unique invitation token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// List all invitations for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();

    // Get inviter info for each invitation
    const invitationsWithInviter = await Promise.all(
      invitations.map(async (inv) => {
        const inviter = await ctx.db.get(inv.invitedBy);
        return {
          ...inv,
          inviterName: inviter?.fullName || inviter?.email || 'Unknown',
        };
      })
    );

    return invitationsWithInviter;
  },
});

// List pending invitations for a tenant
export const listPending = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "pending")
      )
      .collect();
  },
});

// Get invitation by token
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    // Get tenant info
    const tenant = await ctx.db.get(invitation.tenantId);
    const inviter = await ctx.db.get(invitation.invitedBy);

    return {
      ...invitation,
      tenantName: tenant?.companyName || 'Unknown Organization',
      inviterName: inviter?.fullName || inviter?.email || 'Unknown',
    };
  },
});

// Check if email has pending invitation
export const checkByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!invitation || invitation.expiresAt < Date.now()) {
      return null;
    }

    const tenant = await ctx.db.get(invitation.tenantId);

    return {
      invitation,
      tenant,
    };
  },
});

// Create a new invitation
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    email: v.string(),
    role: v.string(),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check tenant status
    const tenantStatus = await isTenantActive(ctx, args.tenantId);
    if (!tenantStatus.active) {
      throw new Error(tenantStatus.message || "Account not active");
    }

    // Check if user limit allows new invite
    const limitCheck = await canAddUser(ctx, args.tenantId);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || "User limit reached");
    }

    const email = args.email.toLowerCase().trim();

    // Check if user already exists in this tenant
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser && existingUser.tenantId === args.tenantId) {
      throw new Error("User is already a member of this organization");
    }

    // Check for existing pending invitation
    const existingInvite = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvite) {
      throw new Error("An invitation has already been sent to this email");
    }

    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    const invitationId = await ctx.db.insert("invitations", {
      tenantId: args.tenantId,
      email,
      role: args.role,
      token: generateToken(),
      status: "pending",
      invitedBy: args.invitedBy,
      expiresAt,
      createdAt: now,
    });

    return invitationId;
  },
});

// Accept an invitation
export const accept = mutation({
  args: {
    token: v.string(),
    workosUserId: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find invitation
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been used or cancelled");
    }

    if (invitation.expiresAt < now) {
      // Mark as expired
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Check tenant is still active
    const tenantStatus = await isTenantActive(ctx, invitation.tenantId);
    if (!tenantStatus.active) {
      throw new Error(tenantStatus.message || "Organization is not active");
    }

    // Check user limit still allows this
    const limitCheck = await canAddUser(ctx, invitation.tenantId);
    if (!limitCheck.allowed) {
      throw new Error("Organization has reached its user limit");
    }

    // Check if user already exists with this WorkOS ID
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();

    if (existingUser) {
      throw new Error("You already have an account. Please log in with your existing account.");
    }

    // Create the user
    const userId = await ctx.db.insert("users", {
      tenantId: invitation.tenantId,
      workosUserId: args.workosUserId,
      email: invitation.email,
      fullName: args.fullName,
      avatarUrl: args.avatarUrl,
      role: invitation.role,
      status: "active",
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedBy: userId,
      acceptedAt: now,
    });

    // Get tenant info to return
    const tenant = await ctx.db.get(invitation.tenantId);

    return {
      userId,
      tenantId: invitation.tenantId,
      tenantSlug: tenant?.slug,
      tenantName: tenant?.companyName,
      role: invitation.role,
    };
  },
});

// Cancel an invitation
export const cancel = mutation({
  args: {
    id: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.id);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Only pending invitations can be cancelled");
    }

    await ctx.db.patch(args.id, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// Resend an invitation (generates new token)
export const resend = mutation({
  args: {
    id: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.id);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending" && invitation.status !== "expired") {
      throw new Error("Only pending or expired invitations can be resent");
    }

    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.patch(args.id, {
      token: generateToken(),
      status: "pending",
      expiresAt,
    });

    return { success: true };
  },
});

// Delete an invitation (admin only)
export const remove = mutation({
  args: {
    id: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
