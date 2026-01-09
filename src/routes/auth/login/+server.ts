import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthorizationUrl } from '$lib/auth/workos.server';

export const GET: RequestHandler = async ({ url, cookies }) => {
	// Get optional return URL from query params
	const returnTo = url.searchParams.get('returnTo') || '/';

	// Check if this is a fresh login (after logout) - force re-authentication
	const fresh = url.searchParams.get('fresh') === 'true';

	// When fresh login is requested, clear any existing session cookies
	// This ensures a completely clean slate before authenticating
	if (fresh) {
		cookies.delete('session', { path: '/' });
		cookies.delete('wos-session', { path: '/' });
		cookies.delete('logout_pending', { path: '/' });
		// Also set empty session to ensure it's cleared in all browsers
		cookies.set('session', '', {
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'lax',
			maxAge: 0,
			expires: new Date(0)
		});
	}

	// Generate authorization URL with state containing return URL
	const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64');

	// When fresh=true, force login to bypass any cached SSO session
	// This ensures users must enter credentials after logout
	const authUrl = getAuthorizationUrl(state, {
		screenHint: 'sign-in',
		forceLogin: fresh
	});

	throw redirect(302, authUrl);
};
