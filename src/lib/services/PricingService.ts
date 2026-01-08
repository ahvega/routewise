/**
 * Pricing Service
 * Handles markup calculations and pricing options generation
 */

import type {
	DetailedCosts,
	PricingOption,
	SystemParameters
} from '$lib/types';
import { MARKUP_OPTIONS, RECOMMENDED_MARKUP, DEFAULT_SYSTEM_PARAMETERS } from '$lib/types';

/**
 * Generate pricing options with different markup percentages
 */
export function generatePricingOptions(
	baseCost: number,
	exchangeRate: number,
	markups: readonly number[] = MARKUP_OPTIONS
): PricingOption[] {
	return markups.map((markup) => {
		const salePrice = baseCost * (1 + markup / 100);
		const salePriceHNL = Math.round(salePrice * 100) / 100;
		const salePriceUSD = Math.round((salePrice / exchangeRate) * 100) / 100;

		return {
			markup,
			cost: baseCost,
			salePrice: salePriceHNL,
			salePriceHNL,
			salePriceUSD,
			recommended: markup === RECOMMENDED_MARKUP
		};
	});
}

/**
 * Calculate sale price with a specific markup
 */
export function calculateSalePrice(
	baseCost: number,
	markupPercentage: number,
	exchangeRate: number
): { priceHNL: number; priceUSD: number } {
	const priceHNL = Math.round(baseCost * (1 + markupPercentage / 100) * 100) / 100;
	const priceUSD = Math.round((priceHNL / exchangeRate) * 100) / 100;

	return { priceHNL, priceUSD };
}

/**
 * Calculate markup percentage from sale price
 */
export function calculateMarkupFromPrice(
	baseCost: number,
	salePrice: number
): number {
	if (baseCost <= 0) return 0;
	const markup = ((salePrice - baseCost) / baseCost) * 100;
	return Math.round(markup * 100) / 100;
}

/**
 * Calculate profit from sale
 */
export function calculateProfit(
	baseCost: number,
	salePrice: number
): { amount: number; percentage: number } {
	const amount = Math.round((salePrice - baseCost) * 100) / 100;
	const percentage = baseCost > 0 ? Math.round(((salePrice - baseCost) / baseCost) * 10000) / 100 : 0;

	return { amount, percentage };
}

/**
 * Apply client discount to pricing options
 */
export function applyClientDiscount(
	pricingOptions: PricingOption[],
	discountPercentage: number
): PricingOption[] {
	if (discountPercentage <= 0) return pricingOptions;

	return pricingOptions.map((option) => {
		const discountMultiplier = 1 - discountPercentage / 100;
		const discountedPriceHNL = Math.round(option.salePriceHNL * discountMultiplier * 100) / 100;
		const discountedPriceUSD = Math.round(option.salePriceUSD * discountMultiplier * 100) / 100;

		return {
			...option,
			salePrice: discountedPriceHNL,
			salePriceHNL: discountedPriceHNL,
			salePriceUSD: discountedPriceUSD
		};
	});
}

/**
 * Get recommended markup based on trip characteristics
 */
export function getRecommendedMarkup(
	distance: number,
	days: number,
	groupSize: number
): number {
	// Higher markup for shorter trips (higher overhead ratio)
	if (distance < 100 && days === 1) return 25;

	// Standard markup for medium trips
	if (distance < 300) return 20;

	// Lower markup for longer trips (competitive pricing)
	if (distance >= 500 || days >= 3) return 15;

	// Higher markup for small groups (higher per-person costs)
	if (groupSize <= 4) return 20;

	return RECOMMENDED_MARKUP;
}

/**
 * Pricing Service class for more complex operations
 */
export class PricingService {
	private defaultExchangeRate: number;

	constructor(exchangeRate?: number) {
		this.defaultExchangeRate = exchangeRate || DEFAULT_SYSTEM_PARAMETERS.exchangeRate;
	}

	/**
	 * Generate complete pricing from detailed costs
	 */
	generatePricing(
		costs: DetailedCosts,
		parameters?: SystemParameters,
		clientDiscountPercentage?: number
	): PricingOption[] {
		const exchangeRate = parameters?.exchangeRate || this.defaultExchangeRate;
		let options = generatePricingOptions(costs.total, exchangeRate);

		if (clientDiscountPercentage && clientDiscountPercentage > 0) {
			options = applyClientDiscount(options, clientDiscountPercentage);
		}

		return options;
	}

	/**
	 * Update exchange rate
	 */
	setExchangeRate(rate: number): void {
		this.defaultExchangeRate = rate;
	}
}

// Export singleton instance
export const pricingService = new PricingService();
