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
 */
export function getAuthorizationUrl(state?: string): string {
	return workos.userManagement.getAuthorizationUrl({
		clientId: WORKOS_CLIENT_ID,
		redirectUri: WORKOS_REDIRECT_URI,
		provider: 'authkit',
		state
	});
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
