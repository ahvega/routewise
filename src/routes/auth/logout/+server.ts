import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	// Clear the session cookie
	cookies.delete('session', { path: '/' });

	// Redirect to home page
	throw redirect(302, '/');
};

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear the session cookie
	cookies.delete('session', { path: '/' });

	// Redirect to home page
	throw redirect(302, '/');
};
