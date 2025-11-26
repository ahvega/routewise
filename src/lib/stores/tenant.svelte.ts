/**
 * Tenant store for client-side tenant context
 * Uses Svelte 5 runes
 */

import type { Id } from '$convex/_generated/dataModel';

export interface TenantState {
	tenantId: Id<"tenants"> | null;
	tenantName: string | null;
	isLoading: boolean;
	isInitialized: boolean;
}

// Create reactive tenant state using Svelte 5 runes
function createTenantStore() {
	let state = $state<TenantState>({
		tenantId: null,
		tenantName: null,
		isLoading: true,
		isInitialized: false
	});

	return {
		get tenantId() {
			return state.tenantId;
		},
		get tenantName() {
			return state.tenantName;
		},
		get isLoading() {
			return state.isLoading;
		},
		get isInitialized() {
			return state.isInitialized;
		},

		setTenant(tenantId: Id<"tenants">, tenantName: string) {
			state.tenantId = tenantId;
			state.tenantName = tenantName;
			state.isLoading = false;
			state.isInitialized = true;
		},

		setLoading(loading: boolean) {
			state.isLoading = loading;
		},

		clear() {
			state = {
				tenantId: null,
				tenantName: null,
				isLoading: false,
				isInitialized: false
			};
		}
	};
}

export const tenantStore = createTenantStore();
