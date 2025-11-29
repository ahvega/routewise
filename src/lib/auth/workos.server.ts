/**
 * WorkOS Server-side Authentication
 * Uses the stable @workos-inc/node SDK
 */

import { WorkOS } from '@workos-inc/node';
import { WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI } from '$env/static/private';
import type { AuthUser, AuthSession } from './types';

// Initialize WorkOS client (server-side only)
const workos = new WorkOS(WORKOS_API_KEY);

/**
 * Generate the authorization URL for WorkOS AuthKit
 * @param state - Optional state to pass through the auth flow
 * @param screenHint - Optional hint: 'sign-up' or 'sign-in' to force showing that screen
 */
export function getAuthorizationUrl(state?: string, screenHint?: 'sign-up' | 'sign-in'): string {
	const params: {
		clientId: string;
		redirectUri: string;
		provider: 'authkit';
		state?: string;
		screenHint?: 'sign-up' | 'sign-in';
	} = {
		clientId: WORKOS_CLIENT_ID,
		redirectUri: WORKOS_REDIRECT_URI,
		provider: 'authkit',
		state
	};

	if (screenHint) {
		params.screenHint = screenHint;
	}

	return workos.userManagement.getAuthorizationUrl(params);
}

/**
 * Exchange authorization code for tokens and user info
 */
export async function authenticateWithCode(code: string): Promise<AuthSession> {
	const authResponse = await workos.userManagement.authenticateWithCode({
		clientId: WORKOS_CLIENT_ID,
		code
	});

	const user: AuthUser = {
		id: authResponse.user.id,
		email: authResponse.user.email,
		emailVerified: authResponse.user.emailVerified,
		firstName: authResponse.user.firstName,
		lastName: authResponse.user.lastName,
		profilePictureUrl: authResponse.user.profilePictureUrl,
		createdAt: authResponse.user.createdAt,
		updatedAt: authResponse.user.updatedAt
	};

	return {
		user,
		accessToken: authResponse.accessToken,
		refreshToken: authResponse.refreshToken,
		expiresAt: Date.now() + 3600 * 1000 // 1 hour default
	};
}

/**
 * Refresh an expired access token
 */
export async function refreshSession(refreshToken: string): Promise<AuthSession> {
	const authResponse = await workos.userManagement.authenticateWithRefreshToken({
		clientId: WORKOS_CLIENT_ID,
		refreshToken
	});

	const user: AuthUser = {
		id: authResponse.user.id,
		email: authResponse.user.email,
		emailVerified: authResponse.user.emailVerified,
		firstName: authResponse.user.firstName,
		lastName: authResponse.user.lastName,
		profilePictureUrl: authResponse.user.profilePictureUrl,
		createdAt: authResponse.user.createdAt,
		updatedAt: authResponse.user.updatedAt
	};

	return {
		user,
		accessToken: authResponse.accessToken,
		refreshToken: authResponse.refreshToken,
		expiresAt: Date.now() + 3600 * 1000
	};
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<AuthUser | null> {
	try {
		const workosUser = await workos.userManagement.getUser(userId);
		return {
			id: workosUser.id,
			email: workosUser.email,
			emailVerified: workosUser.emailVerified,
			firstName: workosUser.firstName,
			lastName: workosUser.lastName,
			profilePictureUrl: workosUser.profilePictureUrl,
			createdAt: workosUser.createdAt,
			updatedAt: workosUser.updatedAt
		};
	} catch {
		return null;
	}
}

/**
 * Logout URL for WorkOS
 */
export function getLogoutUrl(sessionId: string): string {
	return workos.userManagement.getLogoutUrl({ sessionId });
}

export { workos };
