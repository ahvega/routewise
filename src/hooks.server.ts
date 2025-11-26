import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Get session from cookie
	const sessionCookie = event.cookies.get('session');

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);

			// Check if session is expired
			if (session.expiresAt && session.expiresAt > Date.now()) {
				// Add user to locals for access in load functions
				event.locals.user = {
					id: session.userId,
					email: session.email,
					firstName: session.firstName,
					lastName: session.lastName
				};
			} else {
				// Clear expired session
				event.cookies.delete('session', { path: '/' });
			}
		} catch {
			// Invalid session cookie, clear it
			event.cookies.delete('session', { path: '/' });
		}
	}

	return resolve(event);
};
