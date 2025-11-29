import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	// Clear the session cookie
	cookies.delete('session', { path: '/' });

	// Also clear any other auth-related cookies that might exist
	cookies.delete('wos-session', { path: '/' });

	// Redirect to home page with a flag indicating logged out
	// The landing page can use this to show a "logged out" message
	throw redirect(302, '/?logged_out=true');
};

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear the session cookie
	cookies.delete('session', { path: '/' });

	// Also clear any other auth-related cookies that might exist
	cookies.delete('wos-session', { path: '/' });

	// Redirect to home page
	throw redirect(302, '/?logged_out=true');
};
