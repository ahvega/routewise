/**
 * Tenant store for client-side tenant context
 * Uses Svelte 5 runes
 */

import type { Id } from '$convex/_generated/dataModel';
import type { PlanId } from '$lib/constants/plans';

export interface TenantFeatures {
	emailEnabled: boolean;
	pdfExport: boolean;
	customBranding: boolean;
	apiAccess: boolean;
	advancedReports: boolean;
	multiCurrency: boolean;
}

export interface TenantLimits {
	maxUsers: number;
	maxVehicles: number;
	maxDrivers: number;
	maxQuotationsPerMonth: number;
	maxEmailsPerMonth: number;
}

export interface TenantUsage {
	usersCount: number;
	vehiclesCount: number;
	driversCount: number;
	clientsCount: number;
	quotationsThisPeriod?: number;
	emailsThisPeriod?: number;
}

export interface TenantState {
	tenantId: Id<"tenants"> | null;
	tenantName: string | null;
	tenantSlug: string | null;
	plan: PlanId | null;
	subscriptionStatus: string | null;
	trialEndsAt: number | null;
	features: TenantFeatures | null;
	limits: TenantLimits | null;
	usage: TenantUsage | null;
	isLoading: boolean;
	isInitialized: boolean;
	needsOnboarding: boolean;
}

// Create reactive tenant state using Svelte 5 runes
function createTenantStore() {
	let state = $state<TenantState>({
		tenantId: null,
		tenantName: null,
		tenantSlug: null,
		plan: null,
		subscriptionStatus: null,
		trialEndsAt: null,
		features: null,
		limits: null,
		usage: null,
		isLoading: true,
		isInitialized: false,
		needsOnboarding: false
	});

	return {
		get tenantId() {
			return state.tenantId;
		},
		get tenantName() {
			return state.tenantName;
		},
		get tenantSlug() {
			return state.tenantSlug;
		},
		get plan() {
			return state.plan;
		},
		get subscriptionStatus() {
			return state.subscriptionStatus;
		},
		get trialEndsAt() {
			return state.trialEndsAt;
		},
		get features() {
			return state.features;
		},
		get limits() {
			return state.limits;
		},
		get usage() {
			return state.usage;
		},
		get isLoading() {
			return state.isLoading;
		},
		get isInitialized() {
			return state.isInitialized;
		},
		get needsOnboarding() {
			return state.needsOnboarding;
		},

		// Check if trial is active and near expiration
		get isTrialExpiringSoon() {
			if (state.plan !== 'trial' || !state.trialEndsAt) return false;
			const daysRemaining = Math.ceil((state.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24));
			return daysRemaining <= 3 && daysRemaining > 0;
		},

		get trialDaysRemaining() {
			if (!state.trialEndsAt) return null;
			const remaining = state.trialEndsAt - Date.now();
			if (remaining <= 0) return 0;
			return Math.ceil(remaining / (1000 * 60 * 60 * 24));
		},

		// Simple setter for basic tenant info (from session)
		setTenant(tenantId: Id<"tenants">, tenantName: string) {
			state.tenantId = tenantId;
			state.tenantName = tenantName;
			state.isLoading = false;
			state.isInitialized = true;
		},

		// Full tenant update with plan info
		setFullTenant(tenant: {
			_id: Id<"tenants">;
			companyName: string;
			slug: string;
			plan: string;
			subscriptionStatus?: string;
			trialEndsAt?: number;
			features?: TenantFeatures;
			maxUsers?: number;
			maxVehicles?: number;
			maxDrivers?: number;
			maxQuotationsPerMonth?: number;
			maxEmailsPerMonth?: number;
		}, usage?: TenantUsage) {
			state.tenantId = tenant._id;
			state.tenantName = tenant.companyName;
			state.tenantSlug = tenant.slug;
			state.plan = tenant.plan as PlanId;
			state.subscriptionStatus = tenant.subscriptionStatus || null;
			state.trialEndsAt = tenant.trialEndsAt || null;
			state.features = tenant.features || null;
			state.limits = tenant.maxUsers != null ? {
				maxUsers: tenant.maxUsers,
				maxVehicles: tenant.maxVehicles || 0,
				maxDrivers: tenant.maxDrivers || 0,
				maxQuotationsPerMonth: tenant.maxQuotationsPerMonth || 0,
				maxEmailsPerMonth: tenant.maxEmailsPerMonth || 0
			} : null;
			state.usage = usage || null;
			state.isLoading = false;
			state.isInitialized = true;
			state.needsOnboarding = false;
		},

		setUsage(usage: TenantUsage) {
			state.usage = usage;
		},

		setLoading(loading: boolean) {
			state.isLoading = loading;
		},

		setNeedsOnboarding(needs: boolean) {
			state.needsOnboarding = needs;
			state.isLoading = false;
		},

		// Check if user can perform an action based on limits
		canAddUser(): boolean {
			if (!state.limits || !state.usage) return true;
			if (state.limits.maxUsers === -1) return true;
			return state.usage.usersCount < state.limits.maxUsers;
		},

		canAddVehicle(): boolean {
			if (!state.limits || !state.usage) return true;
			if (state.limits.maxVehicles === -1) return true;
			return state.usage.vehiclesCount < state.limits.maxVehicles;
		},

		canAddDriver(): boolean {
			if (!state.limits || !state.usage) return true;
			if (state.limits.maxDrivers === -1) return true;
			return state.usage.driversCount < state.limits.maxDrivers;
		},

		canCreateQuotation(): boolean {
			if (!state.limits || !state.usage) return true;
			if (state.limits.maxQuotationsPerMonth === -1) return true;
			return (state.usage.quotationsThisPeriod || 0) < state.limits.maxQuotationsPerMonth;
		},

		canSendEmail(): boolean {
			if (!state.features?.emailEnabled) return false;
			if (!state.limits || !state.usage) return true;
			if (state.limits.maxEmailsPerMonth === -1) return true;
			return (state.usage.emailsThisPeriod || 0) < state.limits.maxEmailsPerMonth;
		},

		hasFeature(feature: keyof TenantFeatures): boolean {
			if (!state.features) return false;
			return state.features[feature] === true;
		},

		clear() {
			state = {
				tenantId: null,
				tenantName: null,
				tenantSlug: null,
				plan: null,
				subscriptionStatus: null,
				trialEndsAt: null,
				features: null,
				limits: null,
				usage: null,
				isLoading: false,
				isInitialized: false,
				needsOnboarding: false
			};
		}
	};
}

export const tenantStore = createTenantStore();
