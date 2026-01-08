/**
 * Plan configuration constants for RouteWise SaaS
 *
 * Plan hierarchy: trial < starter < professional < business < enterprise < founder
 * Founder plan is a special lifetime deal with Business features
 */

export type PlanId = 'trial' | 'starter' | 'professional' | 'business' | 'enterprise' | 'founder';
export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface PlanFeatures {
  emailEnabled: boolean;
  pdfExport: boolean | 'watermarked'; // true = full, 'watermarked' = with watermark, false = disabled
  customBranding: boolean;
  apiAccess: boolean;
  advancedReports: boolean;
  multiCurrency: boolean;
  prioritySupport: boolean;
}

export interface PlanLimits {
  maxUsers: number;
  maxVehicles: number;
  maxDrivers: number;
  maxQuotationsPerMonth: number; // -1 = unlimited
  maxEmailsPerMonth: number; // -1 = unlimited
  maxClients: number; // -1 = unlimited
}

export interface PlanPricing {
  monthly: number; // USD
  yearly: number; // USD (discounted)
  lifetime?: number; // USD (one-time, only for founder)
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: PlanFeatures;
  isPopular?: boolean;
  badge?: string;
}

/**
 * Trial period duration in days
 */
export const TRIAL_DURATION_DAYS = 14;

/**
 * Founder lifetime deal limit
 */
export const FOUNDER_DEAL_LIMIT = 100;

/**
 * Plan definitions
 * Pricing adjusted for Latin America market
 */
export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: 'trial',
    name: 'Free Trial',
    description: 'Try RouteWise free for 14 days',
    pricing: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      maxUsers: 1,
      maxVehicles: 1,
      maxDrivers: 1,
      maxQuotationsPerMonth: 10,
      maxEmailsPerMonth: 0,
      maxClients: 5,
    },
    features: {
      emailEnabled: false,
      pdfExport: 'watermarked',
      customBranding: false,
      apiAccess: false,
      advancedReports: false,
      multiCurrency: false,
      prioritySupport: false,
    },
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small fleets and solo operators',
    pricing: {
      monthly: 19,
      yearly: 190, // ~17% discount
    },
    limits: {
      maxUsers: 2,
      maxVehicles: 5,
      maxDrivers: 5,
      maxQuotationsPerMonth: 50,
      maxEmailsPerMonth: 10,
      maxClients: 25,
    },
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: false,
      apiAccess: false,
      advancedReports: false,
      multiCurrency: false,
      prioritySupport: false,
    },
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing tour companies and fleet operators',
    pricing: {
      monthly: 49,
      yearly: 490, // ~17% discount
    },
    limits: {
      maxUsers: 5,
      maxVehicles: 15,
      maxDrivers: 15,
      maxQuotationsPerMonth: -1, // unlimited
      maxEmailsPerMonth: -1, // unlimited
      maxClients: -1, // unlimited
    },
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: false,
      advancedReports: true,
      multiCurrency: true,
      prioritySupport: true,
    },
    isPopular: true,
    badge: 'Most Popular',
  },

  business: {
    id: 'business',
    name: 'Business',
    description: 'For established companies with larger teams',
    pricing: {
      monthly: 99,
      yearly: 990, // ~17% discount
    },
    limits: {
      maxUsers: 15,
      maxVehicles: 50,
      maxDrivers: 50,
      maxQuotationsPerMonth: -1,
      maxEmailsPerMonth: -1,
      maxClients: -1,
    },
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      multiCurrency: true,
      prioritySupport: true,
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    pricing: {
      monthly: 0, // Custom pricing
      yearly: 0,
    },
    limits: {
      maxUsers: -1,
      maxVehicles: -1,
      maxDrivers: -1,
      maxQuotationsPerMonth: -1,
      maxEmailsPerMonth: -1,
      maxClients: -1,
    },
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      multiCurrency: true,
      prioritySupport: true,
    },
    badge: 'Contact Sales',
  },

  founder: {
    id: 'founder',
    name: 'Founder Lifetime',
    description: 'Limited offer: Business features forever',
    pricing: {
      monthly: 0,
      yearly: 0,
      lifetime: 999,
    },
    limits: {
      maxUsers: 15,
      maxVehicles: 50,
      maxDrivers: 50,
      maxQuotationsPerMonth: -1,
      maxEmailsPerMonth: -1,
      maxClients: -1,
    },
    features: {
      emailEnabled: true,
      pdfExport: true,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      multiCurrency: true,
      prioritySupport: true,
    },
    badge: 'Limited - 100 spots',
  },
};

/**
 * Get plan by ID with fallback to trial
 */
export function getPlan(planId: PlanId | string): Plan {
  return PLANS[planId as PlanId] || PLANS.trial;
}

/**
 * Check if a limit value means unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Get the display value for a limit
 */
export function formatLimit(limit: number): string {
  return isUnlimited(limit) ? 'Unlimited' : limit.toString();
}

/**
 * Check if user can perform action based on current usage vs plan limits
 */
export function canPerformAction(
  currentCount: number,
  planLimit: number
): boolean {
  if (isUnlimited(planLimit)) return true;
  return currentCount < planLimit;
}

/**
 * Get usage percentage for display
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Check if plan has a specific feature enabled
 */
export function hasFeature(
  planId: PlanId,
  feature: keyof PlanFeatures
): boolean {
  const plan = getPlan(planId);
  const value = plan.features[feature];
  return value === true || value === 'watermarked';
}

/**
 * Get PDF export capability for a plan
 */
export function getPdfExportCapability(planId: PlanId): 'full' | 'watermarked' | 'disabled' {
  const plan = getPlan(planId);
  if (plan.features.pdfExport === true) return 'full';
  if (plan.features.pdfExport === 'watermarked') return 'watermarked';
  return 'disabled';
}

/**
 * Calculate trial end date from start date
 */
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);
  return endDate;
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(trialEndsAt: number): boolean {
  return Date.now() > trialEndsAt;
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt: number): number {
  const remaining = trialEndsAt - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (1000 * 60 * 60 * 24));
}

/**
 * Plan comparison order (for upgrade/downgrade logic)
 */
export const PLAN_ORDER: PlanId[] = [
  'trial',
  'starter',
  'professional',
  'business',
  'enterprise',
  'founder',
];

/**
 * Check if upgrading from one plan to another
 */
export function isUpgrade(fromPlan: PlanId, toPlan: PlanId): boolean {
  const fromIndex = PLAN_ORDER.indexOf(fromPlan);
  const toIndex = PLAN_ORDER.indexOf(toPlan);
  return toIndex > fromIndex;
}

/**
 * Get recommended upgrade plan
 */
export function getRecommendedUpgrade(currentPlan: PlanId): PlanId | null {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex >= PLAN_ORDER.length - 2) {
    return null; // Already at enterprise or founder
  }
  // Skip to next paid plan (skip trial if on trial)
  const nextIndex = currentPlan === 'trial' ? 1 : currentIndex + 1;
  return PLAN_ORDER[nextIndex];
}

/**
 * Visible plans for pricing page (excludes trial and founder from main display)
 */
export const PRICING_PAGE_PLANS: PlanId[] = ['starter', 'professional', 'business', 'enterprise'];

/**
 * Plans available for self-service signup
 */
export const SELF_SERVICE_PLANS: PlanId[] = ['trial', 'starter', 'professional', 'business'];
