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
 * @param options - Optional settings: screenHint to show specific screen, forceLogin to require re-authentication
 */
export function getAuthorizationUrl(
	state?: string,
	options?: { screenHint?: 'sign-up' | 'sign-in'; forceLogin?: boolean }
): string {
	// Build the base URL using WorkOS SDK
	const baseUrl = workos.userManagement.getAuthorizationUrl({
		clientId: WORKOS_CLIENT_ID,
		redirectUri: WORKOS_REDIRECT_URI,
		provider: 'authkit',
		state,
		screenHint: options?.screenHint
	});

	// If forceLogin is requested, append prompt=login to force re-authentication
	// This is the OAuth2 standard way to bypass SSO and require fresh credentials
	if (options?.forceLogin) {
		const url = new URL(baseUrl);
		url.searchParams.set('prompt', 'login');
		return url.toString();
	}

	return baseUrl;
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
		expiresAt: Date.now() + 3600 * 1000, // 1 hour default
		// Capture sessionId for proper logout if available
		sessionId: (authResponse as { sealedSession?: string }).sealedSession
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

/**
 * Revoke a session by invalidating the refresh token
 * This ensures the refresh token cannot be used to obtain new access tokens
 */
export async function revokeSession(accessToken: string): Promise<void> {
	// Extract user ID from the access token to list and revoke their sessions
	// The accessToken is a JWT, we can decode it to get the user ID
	try {
		// Decode the JWT payload (without verification - we just need the sub claim)
		const payload = JSON.parse(
			Buffer.from(accessToken.split('.')[1], 'base64').toString()
		);
		const userId = payload.sub;

		if (userId) {
			// List all active sessions for the user and revoke them
			const sessions = await workos.userManagement.listSessions(userId);

			// Revoke all active sessions for this user
			for (const session of sessions.data) {
				if (session.id) {
					try {
						await workos.userManagement.revokeSession({
							sessionId: session.id
						});
					} catch (e) {
						console.error('Failed to revoke session:', session.id, e);
					}
				}
			}
		}
	} catch (e) {
		// If we can't decode the token or revoke sessions, log and continue
		console.error('Error in revokeSession:', e);
		throw e;
	}
}

export { workos };
