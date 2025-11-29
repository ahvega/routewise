import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Plan limit checking utilities for Convex mutations
 */

export interface LimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  message?: string;
}

// Type alias for tenant IDs
type TenantId = string;

/**
 * Check if tenant can add more users
 */
export async function canAddUser(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId
): Promise<LimitCheckResult> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) {
    return { allowed: false, currentCount: 0, limit: 0, message: "Tenant not found" };
  }

  const maxUsers = tenant.maxUsers ?? -1;
  if (maxUsers === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  const users = await ctx.db
    .query("users")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .collect();

  const currentCount = users.length;
  const allowed = currentCount < maxUsers;

  return {
    allowed,
    currentCount,
    limit: maxUsers,
    message: allowed ? undefined : `User limit reached (${currentCount}/${maxUsers}). Upgrade your plan to add more users.`,
  };
}

/**
 * Check if tenant can add more vehicles
 */
export async function canAddVehicle(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId
): Promise<LimitCheckResult> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) {
    return { allowed: false, currentCount: 0, limit: 0, message: "Tenant not found" };
  }

  const maxVehicles = tenant.maxVehicles ?? -1;
  if (maxVehicles === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  const vehicles = await ctx.db
    .query("vehicles")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .collect();

  const currentCount = vehicles.length;
  const allowed = currentCount < maxVehicles;

  return {
    allowed,
    currentCount,
    limit: maxVehicles,
    message: allowed ? undefined : `Vehicle limit reached (${currentCount}/${maxVehicles}). Upgrade your plan to add more vehicles.`,
  };
}

/**
 * Check if tenant can add more drivers
 */
export async function canAddDriver(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId
): Promise<LimitCheckResult> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) {
    return { allowed: false, currentCount: 0, limit: 0, message: "Tenant not found" };
  }

  const maxDrivers = tenant.maxDrivers ?? -1;
  if (maxDrivers === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  const drivers = await ctx.db
    .query("drivers")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .collect();

  const currentCount = drivers.length;
  const allowed = currentCount < maxDrivers;

  return {
    allowed,
    currentCount,
    limit: maxDrivers,
    message: allowed ? undefined : `Driver limit reached (${currentCount}/${maxDrivers}). Upgrade your plan to add more drivers.`,
  };
}

/**
 * Check if tenant can create more quotations this period
 */
export async function canCreateQuotation(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId
): Promise<LimitCheckResult> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) {
    return { allowed: false, currentCount: 0, limit: 0, message: "Tenant not found" };
  }

  const maxQuotations = tenant.maxQuotationsPerMonth ?? -1;
  if (maxQuotations === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  // Get current period usage
  const now = Date.now();
  const usageRecord = await ctx.db
    .query("usageTracking")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .filter((q) =>
      q.and(
        q.lte(q.field("periodStart"), now),
        q.gte(q.field("periodEnd"), now)
      )
    )
    .first();

  const currentCount = usageRecord?.quotationsCreated ?? 0;
  const allowed = currentCount < maxQuotations;

  return {
    allowed,
    currentCount,
    limit: maxQuotations,
    message: allowed ? undefined : `Quotation limit reached (${currentCount}/${maxQuotations} this month). Upgrade your plan for unlimited quotations.`,
  };
}

/**
 * Check if tenant can send more emails this period
 */
export async function canSendEmail(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId
): Promise<LimitCheckResult> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) {
    return { allowed: false, currentCount: 0, limit: 0, message: "Tenant not found" };
  }

  // Check if email feature is enabled
  if (tenant.features && !tenant.features.emailEnabled) {
    return { allowed: false, currentCount: 0, limit: 0, message: "Email feature is not available on your plan. Upgrade to enable email." };
  }

  const maxEmails = tenant.maxEmailsPerMonth ?? -1;
  if (maxEmails === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  // Get current period usage
  const now = Date.now();
  const usageRecord = await ctx.db
    .query("usageTracking")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .filter((q) =>
      q.and(
        q.lte(q.field("periodStart"), now),
        q.gte(q.field("periodEnd"), now)
      )
    )
    .first();

  const currentCount = usageRecord?.emailsSent ?? 0;
  const allowed = currentCount < maxEmails;

  return {
    allowed,
    currentCount,
    limit: maxEmails,
    message: allowed ? undefined : `Email limit reached (${currentCount}/${maxEmails} this month). Upgrade your plan for more emails.`,
  };
}

/**
 * Check if tenant has a specific feature enabled
 */
export async function hasFeature(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId,
  feature: "emailEnabled" | "pdfExport" | "customBranding" | "apiAccess" | "advancedReports" | "multiCurrency"
): Promise<boolean> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant || !tenant.features) {
    return false;
  }
  return tenant.features[feature] === true;
}

/**
 * Check if tenant's trial has expired
 */
export async function isTrialExpired(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId
): Promise<boolean> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) return true;

  if (tenant.plan !== "trial") return false;

  const trialEndsAt = tenant.trialEndsAt;
  if (!trialEndsAt) return false;

  return Date.now() > trialEndsAt;
}

/**
 * Check tenant status (active, suspended, etc.)
 */
export async function isTenantActive(
  ctx: QueryCtx | MutationCtx,
  tenantId: TenantId
): Promise<{ active: boolean; message?: string }> {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) {
    return { active: false, message: "Tenant not found" };
  }

  if (tenant.status === "suspended") {
    return { active: false, message: "Your account has been suspended. Please contact support." };
  }

  if (tenant.status === "cancelled") {
    return { active: false, message: "Your subscription has been cancelled." };
  }

  if (tenant.status === "trial_expired") {
    return { active: false, message: "Your trial has expired. Please upgrade to continue using RouteWise." };
  }

  // Check if trial has expired but status hasn't been updated
  if (tenant.plan === "trial" && tenant.trialEndsAt && Date.now() > tenant.trialEndsAt) {
    return { active: false, message: "Your trial has expired. Please upgrade to continue using RouteWise." };
  }

  return { active: true };
}
