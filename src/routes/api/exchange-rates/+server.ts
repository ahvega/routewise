import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '$convex/_generated/api';

/**
 * Exchange Rates API Endpoint
 *
 * GET: Returns latest rates from Convex (stored rates) or fetches from API if stale
 * POST: Triggers a fresh fetch from external API and stores in Convex (for cron/manual update)
 *
 * Central American currencies supported:
 * - HNL: Honduran Lempira (Honduras)
 * - GTQ: Guatemalan Quetzal (Guatemala)
 * - CRC: Costa Rican Colón (Costa Rica)
 * - NIO: Nicaraguan Córdoba (Nicaragua)
 * - PAB: Panamanian Balboa (Panama) - pegged 1:1 to USD
 * - BZD: Belize Dollar (Belize)
 * - MXN: Mexican Peso (Mexico)
 * - DOP: Dominican Peso (Dominican Republic)
 * - COP: Colombian Peso (Colombia)
 * - PEN: Peruvian Sol (Peru)
 */

const convex = new ConvexHttpClient(env.PUBLIC_CONVEX_URL || '');

// All supported currency symbols
const CURRENCY_SYMBOLS = 'HNL,GTQ,CRC,NIO,PAB,BZD,MXN,DOP,COP,PEN';

// Default rates as fallback (as of Nov 28, 2025)
const DEFAULT_RATES = {
	HNL: 26.31,
	GTQ: 7.66,
	CRC: 498.39,
	NIO: 36.78,
	PAB: 1.0,
	BZD: 2.0,
	MXN: 18.31,
	DOP: 62.59,
	COP: 3740.40,
	PEN: 3.36,
};

/**
 * GET - Retrieve latest exchange rates
 * First checks Convex for stored rates, fetches fresh if older than 24 hours
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		// Check if we should force refresh
		const forceRefresh = url.searchParams.get('refresh') === 'true';

		// Get latest rates from Convex
		const stored = await convex.query(api.exchangeRates.getLatest, {});

		// Check if rates need updating (older than 24 hours)
		const needsUpdate = await convex.query(api.exchangeRates.needsUpdate, {});

		// If we have fresh rates and no force refresh, return them
		if (!forceRefresh && !needsUpdate.needsUpdate && !stored.isDefault) {
			return new Response(
				JSON.stringify({
					success: true,
					source: stored.source,
					rates: stored.rates,
					timestamp: stored.fetchedAt,
					base: 'USD',
					cached: true,
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Rates need updating - fetch from external API
		const freshRates = await fetchFromExternalAPI();

		if (freshRates.success) {
			// Store in Convex
			await convex.action(api.exchangeRates.fetchAndStoreRates, {
				rates: freshRates.rates,
				source: 'apilayer',
			});

			return new Response(
				JSON.stringify({
					success: true,
					source: 'apilayer',
					rates: freshRates.rates,
					timestamp: Date.now(),
					base: 'USD',
					cached: false,
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// API fetch failed - return stored rates (even if stale)
		return new Response(
			JSON.stringify({
				success: true,
				source: stored.isDefault ? 'default' : 'stale',
				rates: stored.rates,
				timestamp: stored.fetchedAt,
				base: 'USD',
				warning: freshRates.error || 'Using cached rates',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('Error in exchange rates endpoint:', err);

		return new Response(
			JSON.stringify({
				success: false,
				source: 'default',
				rates: DEFAULT_RATES,
				error: err instanceof Error ? err.message : 'Unknown error',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};

/**
 * POST - Force refresh exchange rates (for cron job or manual trigger)
 * This endpoint should be called daily by a scheduled task
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Optional: Add API key validation for cron jobs
		const authHeader = request.headers.get('authorization');
		const cronSecret = env.CRON_SECRET;

		// If CRON_SECRET is set, validate it
		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			return new Response(
				JSON.stringify({ success: false, error: 'Unauthorized' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Fetch fresh rates
		const freshRates = await fetchFromExternalAPI();

		if (!freshRates.success) {
			return new Response(
				JSON.stringify({
					success: false,
					error: freshRates.error || 'Failed to fetch rates',
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Store in Convex
		await convex.action(api.exchangeRates.fetchAndStoreRates, {
			rates: freshRates.rates,
			source: 'apilayer',
		});

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Exchange rates updated successfully',
				rates: freshRates.rates,
				timestamp: Date.now(),
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('Error updating exchange rates:', err);

		return new Response(
			JSON.stringify({
				success: false,
				error: err instanceof Error ? err.message : 'Failed to update rates',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};

/**
 * Fetch rates from APILayer external API
 */
async function fetchFromExternalAPI(): Promise<{
	success: boolean;
	rates: typeof DEFAULT_RATES;
	error?: string;
}> {
	const apiKey = env.EXCHANGE_RATES_API_KEY;

	if (!apiKey) {
		return {
			success: false,
			rates: DEFAULT_RATES,
			error: 'Exchange rates API key not configured',
		};
	}

	try {
		const response = await fetch(
			`https://api.apilayer.com/exchangerates_data/latest?base=USD&symbols=${CURRENCY_SYMBOLS}`,
			{
				method: 'GET',
				headers: { 'apikey': apiKey }
			}
		);

		if (!response.ok) {
			throw new Error(`API responded with status ${response.status}`);
		}

		const data = await response.json();

		if (!data.success) {
			throw new Error(data.error?.info || 'API returned unsuccessful response');
		}

		// Ensure all required rates are present, fill missing with defaults
		const rates = {
			HNL: data.rates.HNL || DEFAULT_RATES.HNL,
			GTQ: data.rates.GTQ || DEFAULT_RATES.GTQ,
			CRC: data.rates.CRC || DEFAULT_RATES.CRC,
			NIO: data.rates.NIO || DEFAULT_RATES.NIO,
			PAB: data.rates.PAB || DEFAULT_RATES.PAB,
			BZD: data.rates.BZD || DEFAULT_RATES.BZD,
			MXN: data.rates.MXN || DEFAULT_RATES.MXN,
			DOP: data.rates.DOP || DEFAULT_RATES.DOP,
			COP: data.rates.COP || DEFAULT_RATES.COP,
			PEN: data.rates.PEN || DEFAULT_RATES.PEN,
		};

		return { success: true, rates };
	} catch (err) {
		console.error('Failed to fetch from external API:', err);
		return {
			success: false,
			rates: DEFAULT_RATES,
			error: err instanceof Error ? err.message : 'Unknown error',
		};
	}
}
