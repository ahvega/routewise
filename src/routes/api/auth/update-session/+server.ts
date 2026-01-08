import type { RequestHandler } from './$types';

/**
 * Updates the session cookie with new tenant information
 * Called after organization creation to update the session
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { tenantId, tenantSlug, tenantName, needsOnboarding } = body;

		// Get current session
		const sessionCookie = cookies.get('session');
		if (!sessionCookie) {
			return new Response(JSON.stringify({ error: 'No session found' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Parse and update session
		const session = JSON.parse(sessionCookie);
		const updatedSession = {
			...session,
			tenantId: tenantId || session.tenantId,
			tenantSlug: tenantSlug || session.tenantSlug,
			tenantName: tenantName || session.tenantName,
			needsOnboarding: needsOnboarding ?? false
		};

		// Save updated session
		cookies.set('session', JSON.stringify(updatedSession), {
			path: '/',
			httpOnly: true,
			secure: false, // Set to true in production
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Failed to update session:', err);
		return new Response(JSON.stringify({ error: 'Failed to update session' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
