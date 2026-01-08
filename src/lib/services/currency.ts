/**
 * Currency Service
 * Handles currency conversion, exchange rate fetching, and currency formatting
 */

// Latin American currencies supported (Central America first, then others)
export const LATIN_AMERICAN_CURRENCIES = [
	// Central America
	{ code: 'HNL', name: 'Lempira Hondureño', symbol: 'L', country: 'Honduras' },
	{ code: 'GTQ', name: 'Quetzal', symbol: 'Q', country: 'Guatemala' },
	{ code: 'NIO', name: 'Córdoba', symbol: 'C$', country: 'Nicaragua' },
	{ code: 'CRC', name: 'Colón Costarricense', symbol: '₡', country: 'Costa Rica' },
	{ code: 'PAB', name: 'Balboa', symbol: 'B/.', country: 'Panamá' },
	{ code: 'BZD', name: 'Dólar Beliceño', symbol: 'BZ$', country: 'Belice' },
	// Caribbean
	{ code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$', country: 'República Dominicana' },
	// North America
	{ code: 'MXN', name: 'Peso Mexicano', symbol: '$', country: 'México' },
	// South America
	{ code: 'COP', name: 'Peso Colombiano', symbol: '$', country: 'Colombia' },
	{ code: 'PEN', name: 'Sol Peruano', symbol: 'S/', country: 'Perú' },
	{ code: 'ARS', name: 'Peso Argentino', symbol: '$', country: 'Argentina' },
	{ code: 'CLP', name: 'Peso Chileno', symbol: '$', country: 'Chile' },
	{ code: 'BRL', name: 'Real Brasileño', symbol: 'R$', country: 'Brasil' },
	{ code: 'UYU', name: 'Peso Uruguayo', symbol: '$U', country: 'Uruguay' },
	{ code: 'PYG', name: 'Guaraní', symbol: '₲', country: 'Paraguay' },
	{ code: 'BOB', name: 'Boliviano', symbol: 'Bs', country: 'Bolivia' },
] as const;

export type LocalCurrencyCode = typeof LATIN_AMERICAN_CURRENCIES[number]['code'];

export interface ExchangeRateResponse {
	success: boolean;
	rate: number;
	source: string;
	timestamp: number;
	error?: string;
}

/**
 * Get currency info by code
 */
export function getCurrencyInfo(code: string) {
	return LATIN_AMERICAN_CURRENCIES.find(c => c.code === code) || {
		code,
		name: code,
		symbol: code,
		country: 'Unknown'
	};
}

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(code: string): string {
	if (code === 'USD') return '$';
	const currency = LATIN_AMERICAN_CURRENCIES.find(c => c.code === code);
	return currency?.symbol || code;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currencyCode: string, locale: string = 'es-419'): string {
	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	} catch {
		// Fallback for unsupported currencies
		const symbol = getCurrencySymbol(currencyCode);
		return `${symbol} ${value.toFixed(2)}`;
	}
}

/**
 * Convert between currencies
 */
export function convertCurrency(
	amount: number,
	fromCurrency: string,
	toCurrency: string,
	exchangeRate: number
): number {
	if (fromCurrency === toCurrency) return amount;

	// Exchange rate is always USD to Local
	if (fromCurrency === 'USD' && toCurrency !== 'USD') {
		return amount * exchangeRate;
	} else if (fromCurrency !== 'USD' && toCurrency === 'USD') {
		return amount / exchangeRate;
	}

	return amount;
}

/**
 * Round currency value according to rounding preference
 */
export function roundCurrency(value: number, roundingUnit: number): number {
	if (!roundingUnit || roundingUnit <= 0) return value;
	return Math.round(value / roundingUnit) * roundingUnit;
}

/**
 * Fetch exchange rate from our API endpoint
 * Rates are stored in Convex and updated daily automatically
 * Falls back to default rates if unavailable
 */
export async function fetchExchangeRate(localCurrency: string): Promise<ExchangeRateResponse> {
	try {
		// Use our server-side API endpoint which returns rates from Convex
		const response = await fetch('/api/exchange-rates');

		if (!response.ok) {
			throw new Error(`API returned ${response.status}`);
		}

		const data = await response.json();

		const rate = data.rates?.[localCurrency];
		if (!rate) {
			throw new Error(`Rate not found for ${localCurrency}`);
		}

		return {
			success: data.success,
			rate: rate,
			source: data.source || 'convex',
			timestamp: data.timestamp || Date.now()
		};
	} catch (error) {
		// Return default rate on error
		return {
			success: false,
			rate: getDefaultExchangeRate(localCurrency),
			source: 'default',
			timestamp: Date.now(),
			error: error instanceof Error ? error.message : 'Failed to fetch exchange rate'
		};
	}
}

/**
 * Fetch all exchange rates at once
 * Rates are stored in Convex and updated daily automatically
 */
export async function fetchAllExchangeRates(): Promise<{
	success: boolean;
	rates: Record<string, number>;
	source: string;
	timestamp: number;
	cached?: boolean;
	error?: string;
}> {
	try {
		const response = await fetch('/api/exchange-rates');

		if (!response.ok) {
			throw new Error(`API returned ${response.status}`);
		}

		const data = await response.json();

		return {
			success: data.success,
			rates: data.rates || {},
			source: data.source || 'convex',
			timestamp: data.timestamp || Date.now(),
			cached: data.cached
		};
	} catch (error) {
		return {
			success: false,
			rates: {},
			source: 'error',
			timestamp: Date.now(),
			error: error instanceof Error ? error.message : 'Failed to fetch exchange rates'
		};
	}
}

/**
 * Force refresh exchange rates from external API
 * Should only be called by admin/cron, not regular users
 */
export async function refreshExchangeRates(): Promise<{
	success: boolean;
	message?: string;
	error?: string;
}> {
	try {
		const response = await fetch('/api/exchange-rates', {
			method: 'POST'
		});

		const data = await response.json();
		return data;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to refresh rates'
		};
	}
}

/**
 * Get default exchange rate for a currency (fallback rates as of Nov 2025)
 * These are used when the API is unavailable
 */
export function getDefaultExchangeRate(localCurrency: string): number {
	const defaults: Record<string, number> = {
		// Central America (rates as of Nov 28, 2025)
		HNL: 26.31,    // Honduras
		GTQ: 7.66,     // Guatemala
		NIO: 36.78,    // Nicaragua
		CRC: 498.39,   // Costa Rica
		PAB: 1.00,     // Panama (pegged to USD)
		BZD: 2.00,     // Belize (pegged to USD at 2:1)
		// Caribbean
		DOP: 62.59,    // Dominican Republic
		// North America
		MXN: 18.31,    // Mexico
		// South America
		COP: 3740.40,  // Colombia
		PEN: 3.36,     // Peru
		ARS: 1450.65,  // Argentina
		CLP: 927.38,   // Chile
		BRL: 5.34,     // Brazil
		UYU: 39.59,    // Uruguay
		PYG: 6983.83,  // Paraguay
		BOB: 6.91,     // Bolivia
	};
	return defaults[localCurrency] || 1.00;
}
