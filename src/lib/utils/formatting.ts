/**
 * Formatting Utilities
 */

import type { CurrencyType, DistanceUnit } from '$lib/types';

/**
 * Format currency value with proper symbol and decimals
 */
export function formatCurrency(
	amount: number,
	currency: CurrencyType = 'HNL'
): string {
	const symbols: Record<CurrencyType, string> = {
		USD: '$',
		HNL: 'L.'
	};

	return `${symbols[currency]}${amount.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})}`;
}

/**
 * Format currency with both HNL and USD
 */
export function formatDualCurrency(
	amountHNL: number,
	exchangeRate: number
): string {
	const amountUSD = amountHNL / exchangeRate;
	return `${formatCurrency(amountHNL, 'HNL')} (~${formatCurrency(amountUSD, 'USD')})`;
}

/**
 * Format distance with appropriate unit
 */
export function formatDistance(
	distance: number,
	unit: DistanceUnit = 'km'
): string {
	const unitLabel = unit === 'km' ? 'km' : 'mi';
	return `${distance.toLocaleString('en-US', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	})} ${unitLabel}`;
}

/**
 * Format duration in hours and minutes
 */
export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);

	if (hours === 0) {
		return `${mins} min`;
	}

	if (mins === 0) {
		return `${hours} hr`;
	}

	return `${hours} hr ${mins} min`;
}

/**
 * Format duration from seconds
 */
export function formatDurationFromSeconds(seconds: number): string {
	return formatDuration(seconds / 60);
}

/**
 * Format percentage with % symbol
 */
export function formatPercentage(value: number, decimals: number = 0): string {
	return `${value.toFixed(decimals)}%`;
}

/**
 * Format fuel efficiency with unit
 */
export function formatFuelEfficiency(value: number, unit: string): string {
	return `${value.toFixed(1)} ${unit}`;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(value: number, decimals: number = 0): string {
	return value.toLocaleString('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

/**
 * Format date for display
 */
export function formatDate(
	timestamp: number,
	options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}
): string {
	return new Date(timestamp).toLocaleDateString('en-US', options);
}

/**
 * Format date and time for display
 */
export function formatDateTime(
	timestamp: number,
	options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}
): string {
	return new Date(timestamp).toLocaleString('en-US', options);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;

	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes} min ago`;
	if (hours < 24) return `${hours} hr ago`;
	if (days < 7) return `${days} days ago`;

	return formatDate(timestamp);
}
