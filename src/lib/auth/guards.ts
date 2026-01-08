import { redirect } from '@sveltejs/kit';
import type { ServerLoadEvent } from '@sveltejs/kit';

/**
 * Require authentication for a route
 * Redirects to login if not authenticated
 */
export function requireAuth(event: ServerLoadEvent) {
	if (!event.locals.user) {
		const returnTo = event.url.pathname + event.url.search;
		throw redirect(302, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
	}
	return event.locals.user;
}

/**
 * Optional auth - returns user if authenticated, null otherwise
 */
export function optionalAuth(event: ServerLoadEvent) {
	return event.locals.user || null;
}

/**
 * Redirect if authenticated (for login pages)
 */
export function redirectIfAuthenticated(event: ServerLoadEvent, redirectTo = '/') {
	if (event.locals.user) {
		throw redirect(302, redirectTo);
	}
}
