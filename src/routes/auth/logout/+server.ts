import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLogoutUrl } from '$lib/auth/workos.server';

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
}

export const GET: RequestHandler = async ({ cookies }) => {
	// Get session to retrieve sessionId for WorkOS logout
	const sessionCookie = cookies.get('session');
	let workosLogoutUrl: string | null = null;

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);

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
	// WorkOS will then redirect back to our app after invalidating the session
	if (workosLogoutUrl) {
		throw redirect(302, workosLogoutUrl);
	}

	// Fallback: Redirect to home with logged out flag
	// The login will force re-authentication via screenHint
	throw redirect(302, '/?logged_out=true');
};

export const POST: RequestHandler = async ({ cookies }) => {
	// Get session to retrieve sessionId for WorkOS logout
	const sessionCookie = cookies.get('session');
	let workosLogoutUrl: string | null = null;

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);

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
