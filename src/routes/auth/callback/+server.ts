import { redirect, error, isRedirect, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateWithCode } from '$lib/auth/workos.server';
import { getConvexClient } from '$lib/convex.server';
import { api } from '$convex/_generated/api';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const errorParam = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');

	// Handle OAuth errors from WorkOS
	if (errorParam) {
		console.error('WorkOS auth error:', errorParam, errorDescription);
		return new Response(errorDescription || 'Authentication failed', { status: 400 });
	}

	if (!code) {
		return new Response('Missing authorization code', { status: 400 });
	}

	// Parse return URL from state
	let returnTo = '/';
	if (state) {
		try {
			const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
			returnTo = decoded.returnTo || '/';
		} catch {
			// Ignore state parsing errors
		}
	}

	try {
		// Exchange code for tokens
		console.log('Exchanging code for tokens...');
		const session = await authenticateWithCode(code);
		console.log('Authentication successful for:', session.user.email);

		// Check if user exists in Convex and get their tenant
		const convex = getConvexClient();
		const userWithTenant = await convex.query(api.users.getWithTenant, {
			workosUserId: session.user.id
		});

		let tenantId: string | null = null;
		let tenantSlug: string | null = null;
		let tenantName: string | null = null;
		let needsOnboarding = false;

		if (userWithTenant && userWithTenant.tenant) {
			// Existing user with tenant
			tenantId = userWithTenant.tenant._id;
			tenantSlug = userWithTenant.tenant.slug;
			tenantName = userWithTenant.tenant.companyName;
			console.log('Existing user found with tenant:', tenantSlug);
		} else {
			// Check for pending invitation
			const invitation = await convex.query(api.users.checkInvitation, {
				email: session.user.email
			});

			if (invitation && invitation.tenant) {
				// User has invitation - redirect to accept it
				console.log('User has pending invitation to:', invitation.tenant.companyName);
				returnTo = `/onboarding/accept-invite?token=${invitation.invitation.token}`;
			} else {
				// New user without tenant - needs onboarding
				needsOnboarding = true;
				console.log('New user needs onboarding');
				returnTo = '/onboarding/setup';
			}
		}

		// Store session in secure HTTP-only cookie with tenant info
		cookies.set('session', JSON.stringify({
			userId: session.user.id,
			email: session.user.email,
			firstName: session.user.firstName,
			lastName: session.user.lastName,
			accessToken: session.accessToken,
			refreshToken: session.refreshToken,
			expiresAt: session.expiresAt,
			// Multi-tenant fields
			tenantId,
			tenantSlug,
			tenantName,
			needsOnboarding
		}), {
			path: '/',
			httpOnly: true,
			secure: false, // Set to true in production
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		// Redirect to return URL (or onboarding if needed)
		return new Response(null, {
			status: 302,
			headers: { Location: returnTo }
		});
	} catch (err: unknown) {
		// Log the full error for debugging
		console.error('Auth callback error details:', {
			name: err instanceof Error ? err.name : 'Unknown',
			message: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined,
			full: err
		});

		// Check if it's a WorkOS API error with more details
		if (err && typeof err === 'object' && 'code' in err) {
			const apiError = err as { code: string; message?: string };
			return new Response(`WorkOS API Error: ${apiError.code} - ${apiError.message || 'Unknown error'}`, { status: 400 });
		}

		return new Response(`Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { status: 500 });
	}
};
