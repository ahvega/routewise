import type { Handle } from '@sveltejs/kit';
import { refreshSession } from '$lib/auth/workos.server';

// Token refresh buffer time (5 minutes before expiry)
const REFRESH_BUFFER = 5 * 60 * 1000;

export const handle: Handle = async ({ event, resolve }) => {
	// Check if logout is in progress - if so, skip all session handling
	// This prevents race conditions where session refresh could restore a logged-out session
	const logoutPending = event.cookies.get('logout_pending');
	if (logoutPending) {
		// Clear the logout marker and ensure session is cleared
		event.cookies.delete('logout_pending', { path: '/' });
		event.cookies.delete('session', { path: '/' });
		// Don't set any user/session - user will see logged-out state
		return resolve(event);
	}

	// Get session from cookie
	const sessionCookie = event.cookies.get('session');

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);
			const now = Date.now();

			// Check if session is expired
			if (!session.expiresAt || session.expiresAt <= now) {
				// Session has expired
				// Try to refresh if we have a refresh token
				if (session.refreshToken) {
					try {
						const newSession = await refreshSession(session.refreshToken);

						// Update the session cookie with new tokens
						const updatedSession = {
							...session,
							accessToken: newSession.accessToken,
							refreshToken: newSession.refreshToken,
							expiresAt: newSession.expiresAt,
							sessionId: newSession.sessionId
						};

						event.cookies.set('session', JSON.stringify(updatedSession), {
							path: '/',
							httpOnly: true,
							secure: false, // Set to true in production
							sameSite: 'lax',
							maxAge: 60 * 60 * 24 * 7 // 7 days
						});

						// Set user and session info
						event.locals.user = {
							id: session.userId,
							email: session.email,
							firstName: session.firstName,
							lastName: session.lastName
						};

						event.locals.session = {
							tenantId: session.tenantId || null,
							tenantSlug: session.tenantSlug || null,
							tenantName: session.tenantName || null,
							needsOnboarding: session.needsOnboarding || false
						};
					} catch (refreshError) {
						// Refresh failed - clear session and force re-login
						console.error('Session refresh failed:', refreshError);
						event.cookies.delete('session', { path: '/' });
					}
				} else {
					// No refresh token, clear expired session
					event.cookies.delete('session', { path: '/' });
				}
			} else if (session.expiresAt - now <= REFRESH_BUFFER && session.refreshToken) {
				// Session is about to expire, proactively refresh
				try {
					const newSession = await refreshSession(session.refreshToken);

					const updatedSession = {
						...session,
						accessToken: newSession.accessToken,
						refreshToken: newSession.refreshToken,
						expiresAt: newSession.expiresAt,
						sessionId: newSession.sessionId
					};

					event.cookies.set('session', JSON.stringify(updatedSession), {
						path: '/',
						httpOnly: true,
						secure: false,
						sameSite: 'lax',
						maxAge: 60 * 60 * 24 * 7
					});

					event.locals.user = {
						id: session.userId,
						email: session.email,
						firstName: session.firstName,
						lastName: session.lastName
					};

					event.locals.session = {
						tenantId: session.tenantId || null,
						tenantSlug: session.tenantSlug || null,
						tenantName: session.tenantName || null,
						needsOnboarding: session.needsOnboarding || false
					};
				} catch {
					// Proactive refresh failed, but session is still valid
					// Continue with current session
					event.locals.user = {
						id: session.userId,
						email: session.email,
						firstName: session.firstName,
						lastName: session.lastName
					};

					event.locals.session = {
						tenantId: session.tenantId || null,
						tenantSlug: session.tenantSlug || null,
						tenantName: session.tenantName || null,
						needsOnboarding: session.needsOnboarding || false
					};
				}
			} else {
				// Session is valid
				event.locals.user = {
					id: session.userId,
					email: session.email,
					firstName: session.firstName,
					lastName: session.lastName
				};

				event.locals.session = {
					tenantId: session.tenantId || null,
					tenantSlug: session.tenantSlug || null,
					tenantName: session.tenantName || null,
					needsOnboarding: session.needsOnboarding || false
				};
			}
		} catch {
			// Invalid session cookie, clear it
			event.cookies.delete('session', { path: '/' });
		}
	}

	return resolve(event);
};
