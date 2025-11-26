/**
 * Constants and Default Values
 */

import type { SystemParameters, DistanceUnit, FuelEfficiencyUnit } from './models';

// Markup Options
export const MARKUP_OPTIONS = [10, 15, 20, 25, 30] as const;
export const RECOMMENDED_MARKUP = 15;

// Unit Conversion Constants
export const DISTANCE_CONVERSION = {
	KM_TO_MILES: 0.621371,
	MILES_TO_KM: 1.60934
} as const;

export const FUEL_EFFICIENCY_CONVERSION = {
	MPG_TO_KPL: 0.425144,
	KPL_TO_MPG: 2.35215,
	MPL_TO_KPG: 1,
	KPG_TO_MPL: 1
} as const;

// Default System Parameters (Honduras context)
export const DEFAULT_SYSTEM_PARAMETERS: Omit<SystemParameters, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
	year: new Date().getFullYear(),
	fuelPrice: 125.50, // HNL per gallon
	mealCostPerDay: 300, // HNL per day (3 meals)
	hotelCostPerNight: 800, // HNL per night
	driverIncentivePerDay: 500, // HNL per day
	exchangeRate: 24.80, // HNL per USD
	useCustomExchangeRate: false,
	preferredDistanceUnit: 'km',
	preferredCurrency: 'HNL',
	isActive: true
};

// Validation Limits
export const VALIDATION_LIMITS = {
	groupSize: {
		min: 1,
		max: 50
	},
	extraMileage: {
		min: 0,
		max: 1000
	},
	fuelEfficiency: {
		min: 1,
		max: 100
	},
	passengerCapacity: {
		min: 1,
		max: 60
	}
} as const;

// Toll Costs (Honduras specific - HNL)
export const TOLL_COSTS = {
	SALIDA_SPS: 50, // Leaving San Pedro Sula
	SAP_TGU: 150, // San Pedro Sula to Tegucigalpa route
	SAP_TLA: 100, // San Pedro Sula to La Ceiba route
	PTZ_SAP: 75 // Potrerillos to San Pedro Sula
} as const;

// Status Options
export const QUOTATION_STATUS = ['draft', 'sent', 'approved', 'rejected', 'expired'] as const;
export const VEHICLE_STATUS = ['active', 'inactive', 'maintenance'] as const;
export const CLIENT_STATUS = ['active', 'inactive'] as const;
export const DRIVER_STATUS = ['active', 'inactive', 'on_leave'] as const;

// Pricing Levels
export const PRICING_LEVELS = ['standard', 'preferred', 'vip'] as const;

// User Roles
export const USER_ROLES = ['admin', 'sales', 'operations', 'finance', 'viewer'] as const;

// Distance and Fuel Unit Options
export const DISTANCE_UNITS: DistanceUnit[] = ['km', 'mile'];
export const FUEL_EFFICIENCY_UNITS: FuelEfficiencyUnit[] = ['mpg', 'mpl', 'kpl', 'kpg'];
