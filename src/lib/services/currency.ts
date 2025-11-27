/**
 * Currency Service
 * Handles currency conversion, exchange rate fetching, and currency formatting
 */

// Latin American currencies supported
export const LATIN_AMERICAN_CURRENCIES = [
	{ code: 'HNL', name: 'Lempira Hondureño', symbol: 'L', country: 'Honduras' },
	{ code: 'GTQ', name: 'Quetzal', symbol: 'Q', country: 'Guatemala' },
	{ code: 'NIO', name: 'Córdoba', symbol: 'C$', country: 'Nicaragua' },
	{ code: 'CRC', name: 'Colón Costarricense', symbol: '₡', country: 'Costa Rica' },
	{ code: 'PAB', name: 'Balboa', symbol: 'B/.', country: 'Panamá' },
	{ code: 'MXN', name: 'Peso Mexicano', symbol: '$', country: 'México' },
	{ code: 'COP', name: 'Peso Colombiano', symbol: '$', country: 'Colombia' },
	{ code: 'PEN', name: 'Sol Peruano', symbol: 'S/', country: 'Perú' },
	{ code: 'ARS', name: 'Peso Argentino', symbol: '$', country: 'Argentina' },
	{ code: 'CLP', name: 'Peso Chileno', symbol: '$', country: 'Chile' },
	{ code: 'BRL', name: 'Real Brasileño', symbol: 'R$', country: 'Brasil' },
	{ code: 'UYU', name: 'Peso Uruguayo', symbol: '$U', country: 'Uruguay' },
	{ code: 'PYG', name: 'Guaraní', symbol: '₲', country: 'Paraguay' },
	{ code: 'BOB', name: 'Boliviano', symbol: 'Bs', country: 'Bolivia' },
	{ code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$', country: 'República Dominicana' },
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
 * Fetch exchange rate from API
 * Uses exchangerate-api.com free tier (1500 requests/month)
 */
export async function fetchExchangeRate(localCurrency: string): Promise<ExchangeRateResponse> {
	try {
		// Using exchangerate.host - free, no API key required
		const response = await fetch(
			`https://api.exchangerate.host/latest?base=USD&symbols=${localCurrency}`
		);

		if (!response.ok) {
			throw new Error(`API returned ${response.status}`);
		}

		const data = await response.json();

		if (data.success === false) {
			throw new Error(data.error?.info || 'Unknown API error');
		}

		const rate = data.rates?.[localCurrency];
		if (!rate) {
			throw new Error(`Rate not found for ${localCurrency}`);
		}

		return {
			success: true,
			rate: rate,
			source: 'exchangerate.host',
			timestamp: Date.now()
		};
	} catch (error) {
		// Fallback to frankfurter.app (free, no API key)
		try {
			const response = await fetch(
				`https://api.frankfurter.app/latest?from=USD&to=${localCurrency}`
			);

			if (!response.ok) {
				throw new Error(`Frankfurter API returned ${response.status}`);
			}

			const data = await response.json();
			const rate = data.rates?.[localCurrency];

			if (!rate) {
				throw new Error(`Rate not found for ${localCurrency}`);
			}

			return {
				success: true,
				rate: rate,
				source: 'frankfurter.app',
				timestamp: Date.now()
			};
		} catch (fallbackError) {
			return {
				success: false,
				rate: 0,
				source: 'none',
				timestamp: Date.now(),
				error: error instanceof Error ? error.message : 'Failed to fetch exchange rate'
			};
		}
	}
}

/**
 * Get default exchange rate for a currency (rough estimates for fallback)
 */
export function getDefaultExchangeRate(localCurrency: string): number {
	const defaults: Record<string, number> = {
		HNL: 24.75,
		GTQ: 7.85,
		NIO: 36.50,
		CRC: 530.00,
		PAB: 1.00, // Pegged to USD
		MXN: 17.50,
		COP: 4000.00,
		PEN: 3.75,
		ARS: 350.00,
		CLP: 900.00,
		BRL: 5.00,
		UYU: 39.00,
		PYG: 7300.00,
		BOB: 6.90,
		DOP: 57.00,
	};
	return defaults[localCurrency] || 1.00;
}
