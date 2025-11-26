import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/auth/guards';

export const load: PageServerLoad = async (event) => {
	const user = requireAuth(event);

	return {
		user
	};
};
