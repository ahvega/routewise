/**
 * Unit Conversion Utilities
 */

import type { DistanceUnit, FuelEfficiencyUnit } from '$lib/types';
import { DISTANCE_CONVERSION, FUEL_EFFICIENCY_CONVERSION } from '$lib/types';

/**
 * Convert distance between kilometers and miles
 */
export function convertDistance(
	value: number,
	from: DistanceUnit,
	to: DistanceUnit
): number {
	if (from === to) return value;

	if (from === 'km' && to === 'mile') {
		return value * DISTANCE_CONVERSION.KM_TO_MILES;
	}

	if (from === 'mile' && to === 'km') {
		return value * DISTANCE_CONVERSION.MILES_TO_KM;
	}

	return value;
}

/**
 * Convert fuel efficiency between different units
 * Uses km per liter as the common base for conversions
 */
export function convertFuelEfficiency(
	value: number,
	from: FuelEfficiencyUnit,
	to: FuelEfficiencyUnit
): number {
	if (from === to) return value;

	// Convert to a common base (km per liter) first, then to target
	let kmPerLiter: number;

	switch (from) {
		case 'kpl':
			kmPerLiter = value;
			break;
		case 'mpg':
			kmPerLiter = value * FUEL_EFFICIENCY_CONVERSION.MPG_TO_KPL;
			break;
		case 'mpl':
			// miles per liter to km per liter
			kmPerLiter = value * DISTANCE_CONVERSION.MILES_TO_KM;
			break;
		case 'kpg':
			// km per gallon to km per liter (1 gallon = 3.78541 liters)
			kmPerLiter = value / 3.78541;
			break;
		default:
			kmPerLiter = value;
	}

	// Convert from km per liter to target unit
	switch (to) {
		case 'kpl':
			return kmPerLiter;
		case 'mpg':
			return kmPerLiter * FUEL_EFFICIENCY_CONVERSION.KPL_TO_MPG;
		case 'mpl':
			return kmPerLiter * DISTANCE_CONVERSION.KM_TO_MILES;
		case 'kpg':
			return kmPerLiter * 3.78541;
		default:
			return kmPerLiter;
	}
}

/**
 * Get display label for distance unit
 */
export function getDistanceUnitLabel(unit: DistanceUnit): string {
	return unit === 'km' ? 'Kilometers' : 'Miles';
}

/**
 * Get short label for distance unit
 */
export function getDistanceUnitShort(unit: DistanceUnit): string {
	return unit === 'km' ? 'km' : 'mi';
}

/**
 * Get display label for fuel efficiency unit
 */
export function getFuelEfficiencyUnitLabel(unit: FuelEfficiencyUnit): string {
	const labels: Record<FuelEfficiencyUnit, string> = {
		mpg: 'Miles per Gallon',
		mpl: 'Miles per Liter',
		kpl: 'Kilometers per Liter',
		kpg: 'Kilometers per Gallon'
	};

	return labels[unit];
}

/**
 * Get short label for fuel efficiency unit
 */
export function getFuelEfficiencyUnitShort(unit: FuelEfficiencyUnit): string {
	return unit.toUpperCase();
}

/**
 * Calculate fuel consumption in gallons for a given distance
 */
export function calculateFuelConsumption(
	distanceKm: number,
	fuelEfficiency: number,
	fuelEfficiencyUnit: FuelEfficiencyUnit
): number {
	// Convert efficiency to km per gallon
	const kpg = convertFuelEfficiency(fuelEfficiency, fuelEfficiencyUnit, 'kpg');
	// Return gallons needed
	return distanceKm / kpg;
}

// Conversion constant: 1 gallon = 3.78541 liters
export const LITERS_PER_GALLON = 3.78541;
export const GALLONS_PER_LITER = 1 / LITERS_PER_GALLON;

export type FuelPriceUnit = 'gallon' | 'liter';

/**
 * Normalize fuel price between gallon and liter units
 * Used to convert fuel prices stored in different units to a consistent unit for calculations
 */
export function normalizeFuelPrice(
	price: number,
	fromUnit: FuelPriceUnit,
	toUnit: FuelPriceUnit
): number {
	if (fromUnit === toUnit) return price;

	if (fromUnit === 'liter' && toUnit === 'gallon') {
		// Price per liter to price per gallon: multiply by liters per gallon
		return price * LITERS_PER_GALLON;
	}

	// Price per gallon to price per liter: divide by liters per gallon
	return price / LITERS_PER_GALLON;
}

/**
 * Get display label for fuel price unit
 */
export function getFuelPriceUnitLabel(unit: FuelPriceUnit): string {
	return unit === 'gallon' ? 'per Gallon' : 'per Liter';
}

/**
 * Get short label for fuel price unit
 */
export function getFuelPriceUnitShort(unit: FuelPriceUnit): string {
	return unit === 'gallon' ? '/gal' : '/L';
}

/**
 * Convert fuel volume between gallons and liters
 */
export function convertFuelVolume(
	value: number,
	fromUnit: FuelPriceUnit,
	toUnit: FuelPriceUnit
): number {
	if (fromUnit === toUnit) return value;

	if (fromUnit === 'gallon' && toUnit === 'liter') {
		return value * LITERS_PER_GALLON;
	}

	return value * GALLONS_PER_LITER;
}
