import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLogoutUrl, revokeSession } from '$lib/auth/workos.server';

// Helper function to clear all session cookies with proper options
function clearSessionCookies(cookies: Parameters<RequestHandler>[0]['cookies']) {
	// Clear session cookie with all possible path variations
	cookies.delete('session', { path: '/' });
	cookies.delete('wos-session', { path: '/' });

	// Also set expired cookies to ensure they're cleared across all browsers
	cookies.set('session', '', {
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		maxAge: 0, // Immediately expire
		expires: new Date(0) // Also set to epoch for older browsers
	});

	// Set a short-lived logout marker cookie to prevent session refresh in hooks
	// This ensures hooks.server.ts won't try to refresh a "valid" session
	cookies.set('logout_pending', 'true', {
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		maxAge: 60 // Only valid for 60 seconds - enough to complete logout flow
	});
}

export const GET: RequestHandler = async ({ cookies }) => {
	// Get session to retrieve tokens for cleanup
	const sessionCookie = cookies.get('session');
	let workosLogoutUrl: string | null = null;

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);

			// Try to revoke the session on WorkOS server-side
			// This invalidates the refresh token so it can't be used again
			if (session.accessToken) {
				try {
					await revokeSession(session.accessToken);
					console.log('WorkOS session revoked successfully');
				} catch (e) {
					console.error('Failed to revoke WorkOS session:', e);
					// Continue with logout even if revocation fails
				}
			}

			// If we have a sessionId, get the WorkOS logout URL for browser redirect
			if (session.sessionId) {
				try {
					workosLogoutUrl = getLogoutUrl(session.sessionId);
				} catch (e) {
					console.error('Failed to get WorkOS logout URL:', e);
				}
			}
		} catch {
			// Invalid session cookie - just clear it
		}
	}

	// Clear all local session cookies BEFORE redirect
	clearSessionCookies(cookies);

	// If we have a WorkOS logout URL, redirect there
	// WorkOS will then redirect back to our app after invalidating the session
	if (workosLogoutUrl) {
		throw redirect(302, workosLogoutUrl);
	}

	// Fallback: Redirect to home with logged out flag
	// The login will force re-authentication via fresh=true param
	throw redirect(302, '/?logged_out=true');
};

export const POST: RequestHandler = async ({ cookies }) => {
	// Get session to retrieve tokens for cleanup
	const sessionCookie = cookies.get('session');
	let workosLogoutUrl: string | null = null;

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);

			// Try to revoke the session on WorkOS server-side
			if (session.accessToken) {
				try {
					await revokeSession(session.accessToken);
					console.log('WorkOS session revoked successfully');
				} catch (e) {
					console.error('Failed to revoke WorkOS session:', e);
				}
			}

			// If we have a sessionId, get the WorkOS logout URL
			if (session.sessionId) {
				try {
					workosLogoutUrl = getLogoutUrl(session.sessionId);
				} catch (e) {
					console.error('Failed to get WorkOS logout URL:', e);
				}
			}
		} catch {
			// Invalid session cookie
		}
	}

	// Clear all local session cookies
	clearSessionCookies(cookies);

	// If we have a WorkOS logout URL, redirect there
	if (workosLogoutUrl) {
		throw redirect(302, workosLogoutUrl);
	}

	// Fallback: Redirect to home
	throw redirect(302, '/?logged_out=true');
};
