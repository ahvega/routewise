import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthorizationUrl } from '$lib/auth/workos.server';

export const GET: RequestHandler = async ({ url }) => {
	// Get optional return URL from query params
	const returnTo = url.searchParams.get('returnTo') || '/';

	// Check if this is a fresh login (after logout) - force showing sign-in screen
	const fresh = url.searchParams.get('fresh') === 'true';

	// Generate authorization URL with state containing return URL
	const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64');
	const authUrl = getAuthorizationUrl(state, fresh ? 'sign-in' : undefined);

	throw redirect(302, authUrl);
};
