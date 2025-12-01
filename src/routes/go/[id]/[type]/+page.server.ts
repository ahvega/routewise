import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id, type } = params;

	// Validate type parameter
	if (type !== 'pickup' && type !== 'dropoff') {
		throw error(400, 'Invalid location type. Must be "pickup" or "dropoff".');
	}

	return {
		itineraryId: id,
		locationType: type as 'pickup' | 'dropoff'
	};
};
