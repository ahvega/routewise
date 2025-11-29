/**
 * Plan Configuration
 * Defines the features and limits for each subscription plan.
 */

export interface PlanConfig {
  name: string;
  description: string;
  maxUsers: number;
  maxVehicles: number;
  maxDrivers: number;
  maxQuotationsPerMonth: number;
  maxEmailsPerMonth: number;
  features: {
    multipleVehicles: boolean;
    clientManagement: boolean;
    advancedReports: boolean;
    emailQuotations: boolean;
    pdfExport: boolean;
    apiAccess: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
  };
  priceMonthly: number;
  priceYearly: number;
}

export const PLAN_CONFIG: Record<string, PlanConfig> = {
  trial: {
    name: 'Trial',
    description: 'Free trial with basic features',
    maxUsers: 1,
    maxVehicles: 1,
    maxDrivers: 1,
    maxQuotationsPerMonth: 10,
    maxEmailsPerMonth: 0,
    features: {
      multipleVehicles: false,
      clientManagement: true,
      advancedReports: false,
      emailQuotations: false,
      pdfExport: true,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
    },
    priceMonthly: 0,
    priceYearly: 0,
  },
  starter: {
    name: 'Starter',
    description: 'For small operations',
    maxUsers: 2,
    maxVehicles: 5,
    maxDrivers: 5,
    maxQuotationsPerMonth: 50,
    maxEmailsPerMonth: 10,
    features: {
      multipleVehicles: true,
      clientManagement: true,
      advancedReports: false,
      emailQuotations: true,
      pdfExport: true,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
    },
    priceMonthly: 19,
    priceYearly: 190,
  },
  professional: {
    name: 'Professional',
    description: 'For growing businesses',
    maxUsers: 5,
    maxVehicles: 15,
    maxDrivers: 15,
    maxQuotationsPerMonth: -1, // Unlimited
    maxEmailsPerMonth: -1, // Unlimited
    features: {
      multipleVehicles: true,
      clientManagement: true,
      advancedReports: true,
      emailQuotations: true,
      pdfExport: true,
      apiAccess: false,
      customBranding: true,
      prioritySupport: false,
    },
    priceMonthly: 49,
    priceYearly: 490,
  },
  business: {
    name: 'Business',
    description: 'For established companies',
    maxUsers: 15,
    maxVehicles: 50,
    maxDrivers: 50,
    maxQuotationsPerMonth: -1, // Unlimited
    maxEmailsPerMonth: -1, // Unlimited
    features: {
      multipleVehicles: true,
      clientManagement: true,
      advancedReports: true,
      emailQuotations: true,
      pdfExport: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
    },
    priceMonthly: 99,
    priceYearly: 990,
  },
  founder: {
    name: 'Founder',
    description: 'Lifetime access for early supporters',
    maxUsers: 15,
    maxVehicles: 50,
    maxDrivers: 50,
    maxQuotationsPerMonth: -1, // Unlimited
    maxEmailsPerMonth: -1, // Unlimited
    features: {
      multipleVehicles: true,
      clientManagement: true,
      advancedReports: true,
      emailQuotations: true,
      pdfExport: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
    },
    priceMonthly: 0,
    priceYearly: 0,
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Custom solution for large organizations',
    maxUsers: -1, // Unlimited
    maxVehicles: -1, // Unlimited
    maxDrivers: -1, // Unlimited
    maxQuotationsPerMonth: -1, // Unlimited
    maxEmailsPerMonth: -1, // Unlimited
    features: {
      multipleVehicles: true,
      clientManagement: true,
      advancedReports: true,
      emailQuotations: true,
      pdfExport: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
    },
    priceMonthly: 0, // Custom pricing
    priceYearly: 0, // Custom pricing
  },
};

/**
 * Get plan configuration by plan name
 */
export function getPlanConfig(plan: string): PlanConfig {
  return PLAN_CONFIG[plan] || PLAN_CONFIG.trial;
}

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(plan: string, feature: keyof PlanConfig['features']): boolean {
  const config = getPlanConfig(plan);
  return config.features[feature];
}
