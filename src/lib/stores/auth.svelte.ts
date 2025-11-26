/**
 * Auth store for client-side authentication state
 * Uses Svelte 5 runes
 */

import type { AuthState, TenantUser } from '$lib/auth/types';

// Create reactive auth state using Svelte 5 runes
function createAuthStore() {
	let state = $state<AuthState>({
		isAuthenticated: false,
		isLoading: true,
		user: null,
		error: null
	});

	return {
		get isAuthenticated() {
			return state.isAuthenticated;
		},
		get isLoading() {
			return state.isLoading;
		},
		get user() {
			return state.user;
		},
		get error() {
			return state.error;
		},

		setUser(user: TenantUser | null) {
			state.user = user;
			state.isAuthenticated = !!user;
			state.isLoading = false;
			state.error = null;
		},

		setLoading(loading: boolean) {
			state.isLoading = loading;
		},

		setError(error: string) {
			state.error = error;
			state.isLoading = false;
		},

		clear() {
			state = {
				isAuthenticated: false,
				isLoading: false,
				user: null,
				error: null
			};
		}
	};
}

export const authStore = createAuthStore();
