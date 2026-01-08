/**
 * Cost Calculation Service
 * Core business logic for calculating transportation costs
 *
 * Ported from legacy Next.js app - adapted for Convex-based data access
 */

import type {
	DetailedCosts,
	CostCalculationRequest,
	FuelCosts,
	DriverExpenses,
	VehicleCosts,
	RefuelingCosts,
	TollCosts,
	Vehicle,
	SystemParameters,
	ICostCalculationService
} from '$lib/types';
import { DEFAULT_SYSTEM_PARAMETERS, TOLL_COSTS, ErrorType } from '$lib/types';
import { convertDistance, convertFuelEfficiency } from '$lib/utils';

/**
 * Fuel calculation utilities
 */
export class FuelCalculator {
	/**
	 * Calculate fuel costs based on distance and vehicle specifications
	 */
	calculateFuelCosts(
		distance: number,
		vehicle: Vehicle,
		fuelPrice: number
	): FuelCosts {
		// Convert distance to vehicle's preferred unit
		const distanceInVehicleUnit = convertDistance(
			distance,
			'km',
			vehicle.distanceUnit
		);

		// Convert fuel efficiency to consistent units (distance per gallon)
		const targetUnit =
			vehicle.distanceUnit === 'km' ? 'kpg' : 'mpg';
		const efficiencyInVehicleUnit = convertFuelEfficiency(
			vehicle.fuelEfficiency,
			vehicle.fuelEfficiencyUnit,
			targetUnit
		);

		// Calculate fuel consumption in gallons
		const consumption = distanceInVehicleUnit / efficiencyInVehicleUnit;

		// Calculate total fuel cost
		const cost = consumption * fuelPrice;

		return {
			consumption: Math.round(consumption * 100) / 100,
			cost: Math.round(cost * 100) / 100,
			pricePerUnit: fuelPrice
		};
	}

	/**
	 * Calculate refueling costs for long-distance trips
	 */
	calculateRefuelingCosts(
		distance: number,
		vehicle: Vehicle,
		fuelPrice: number
	): RefuelingCosts {
		// Convert distance to vehicle's preferred unit
		const distanceInVehicleUnit = convertDistance(
			distance,
			'km',
			vehicle.distanceUnit
		);

		// Calculate vehicle autonomy (range per tank)
		const targetUnit =
			vehicle.distanceUnit === 'km' ? 'kpg' : 'mpg';
		const efficiencyInVehicleUnit = convertFuelEfficiency(
			vehicle.fuelEfficiency,
			vehicle.fuelEfficiencyUnit,
			targetUnit
		);
		const autonomy = vehicle.fuelCapacity * efficiencyInVehicleUnit;

		// Calculate number of refueling stops needed
		const stops = Math.max(0, Math.floor(distanceInVehicleUnit / autonomy) - 1);

		// Cost per refueling stop (full tank)
		const costPerStop = vehicle.fuelCapacity * fuelPrice;

		const total = stops * costPerStop;

		return {
			stops,
			costPerStop: Math.round(costPerStop * 100) / 100,
			total: Math.round(total * 100) / 100
		};
	}
}

/**
 * Driver expense calculation utilities
 */
export class DriverExpenseCalculator {
	/**
	 * Calculate driver expenses based on trip duration
	 */
	calculateDriverExpenses(
		days: number,
		parameters: SystemParameters,
		includeIncentive: boolean = false
	): DriverExpenses {
		// Calculate meal costs (3 meals per day)
		const meals = days * parameters.mealCostPerDay;

		// Calculate lodging costs (only if trip is more than 1 day)
		const lodging = days > 1 ? (days - 1) * parameters.hotelCostPerNight : 0;

		// Calculate driver incentive (optional)
		const incentive = includeIncentive
			? days * parameters.driverIncentivePerDay
			: 0;

		const total = meals + lodging + incentive;

		return {
			meals: Math.round(meals * 100) / 100,
			lodging: Math.round(lodging * 100) / 100,
			incentive: Math.round(incentive * 100) / 100,
			days,
			total: Math.round(total * 100) / 100
		};
	}

	/**
	 * Calculate days from duration in minutes
	 * Assumes 8-hour working days for multi-day trips
	 */
	calculateDaysFromDuration(durationMinutes: number): number {
		return Math.ceil(durationMinutes / (8 * 60));
	}
}

/**
 * Vehicle cost calculation utilities
 */
export class VehicleCostCalculator {
	/**
	 * Calculate vehicle operational costs
	 */
	calculateVehicleCosts(
		distance: number,
		days: number,
		vehicle: Vehicle
	): VehicleCosts {
		// Convert distance to vehicle's preferred unit
		const distanceInVehicleUnit = convertDistance(
			distance,
			'km',
			vehicle.distanceUnit
		);

		// Calculate distance-based costs
		const distanceCost = distanceInVehicleUnit * vehicle.costPerDistance;

		// Calculate daily costs
		const dailyCost = days * vehicle.costPerDay;

		const total = distanceCost + dailyCost;

		return {
			distanceCost: Math.round(distanceCost * 100) / 100,
			dailyCost: Math.round(dailyCost * 100) / 100,
			total: Math.round(total * 100) / 100
		};
	}
}

/**
 * Toll cost calculator for Honduras routes
 */
export class TollCalculator {
	/**
	 * Calculate toll costs based on route
	 * This is a simplified version - in production, this would analyze
	 * the actual route waypoints
	 */
	calculateTollCosts(
		origin: string,
		destination: string,
		includeTolls: boolean = true
	): TollCosts {
		if (!includeTolls) {
			return {
				salida: 0,
				sapTGU: 0,
				sapTLA: 0,
				ptzSAP: 0,
				total: 0
			};
		}

		const originLower = origin.toLowerCase();
		const destLower = destination.toLowerCase();

		let salida = 0;
		let sapTGU = 0;
		let sapTLA = 0;
		let ptzSAP = 0;

		// Check for San Pedro Sula departure
		if (
			originLower.includes('san pedro sula') ||
			originLower.includes('sps')
		) {
			salida = TOLL_COSTS.SALIDA_SPS;
		}

		// Check for Tegucigalpa route
		if (
			destLower.includes('tegucigalpa') ||
			destLower.includes('tgu') ||
			destLower.includes('comayagua')
		) {
			sapTGU = TOLL_COSTS.SAP_TGU;
		}

		// Check for La Ceiba / North coast route
		if (
			destLower.includes('ceiba') ||
			destLower.includes('tela') ||
			destLower.includes('atlantida')
		) {
			sapTLA = TOLL_COSTS.SAP_TLA;
		}

		// Check for Potrerillos route
		if (
			destLower.includes('potrerillos') ||
			originLower.includes('potrerillos')
		) {
			ptzSAP = TOLL_COSTS.PTZ_SAP;
		}

		const total = salida + sapTGU + sapTLA + ptzSAP;

		return {
			salida,
			sapTGU,
			sapTLA,
			ptzSAP,
			total: Math.round(total * 100) / 100
		};
	}
}

/**
 * Comprehensive cost calculation service
 */
export class CostCalculationService implements ICostCalculationService {
	private fuelCalculator: FuelCalculator;
	private driverExpenseCalculator: DriverExpenseCalculator;
	private vehicleCostCalculator: VehicleCostCalculator;
	private tollCalculator: TollCalculator;

	constructor() {
		this.fuelCalculator = new FuelCalculator();
		this.driverExpenseCalculator = new DriverExpenseCalculator();
		this.vehicleCostCalculator = new VehicleCostCalculator();
		this.tollCalculator = new TollCalculator();
	}

	/**
	 * Calculate total costs for a transportation request
	 * @param request - The cost calculation request
	 * @param parameters - System parameters (from Convex or defaults)
	 */
	async calculateTotalCosts(
		request: CostCalculationRequest,
		parameters?: SystemParameters
	): Promise<DetailedCosts> {
		const params = parameters || (DEFAULT_SYSTEM_PARAMETERS as SystemParameters);

		const {
			route,
			vehicle,
			extraMileage = 0,
			estimatedDays,
			includeDriverIncentive = false,
			includeFuel = true,
			includeMeals = true,
			includeTolls = true
		} = request;

		const totalDistance = route.totalDistance + extraMileage;

		// Calculate days - use estimatedDays if provided, otherwise calculate from duration
		const days =
			estimatedDays ||
			this.driverExpenseCalculator.calculateDaysFromDuration(route.totalTime);

		// Calculate all cost components
		const fuel = this.calculateFuelCosts(totalDistance, vehicle, params.fuelPrice);
		const driver = this.calculateDriverExpenses(days, params, includeDriverIncentive);
		const vehicleCosts = this.calculateVehicleCosts(totalDistance, days, vehicle);
		const refueling = this.fuelCalculator.calculateRefuelingCosts(
			totalDistance,
			vehicle,
			params.fuelPrice
		);
		const tolls = this.tollCalculator.calculateTollCosts(
			route.segments[0]?.origin || '',
			route.segments[route.segments.length - 1]?.destination || '',
			includeTolls
		);

		// Calculate total cost - only include selected components
		// When includeFuel=false: Rent-a-car mode - client receives vehicle with full tank
		const total =
			(includeFuel ? fuel.cost : 0) +
			(includeFuel ? refueling.total : 0) +
			(includeMeals ? driver.total : 0) +
			(includeTolls ? tolls.total : 0) +
			vehicleCosts.total; // Vehicle operational costs always included

		return {
			fuel,
			driver,
			vehicle: vehicleCosts,
			refueling,
			tolls,
			total: Math.round(total * 100) / 100
		};
	}

	/**
	 * Calculate fuel costs
	 */
	calculateFuelCosts(
		distance: number,
		vehicle: Vehicle,
		fuelPrice?: number
	): FuelCosts {
		const price = fuelPrice || DEFAULT_SYSTEM_PARAMETERS.fuelPrice;
		return this.fuelCalculator.calculateFuelCosts(distance, vehicle, price);
	}

	/**
	 * Calculate driver expenses
	 */
	calculateDriverExpenses(
		days: number,
		parameters: SystemParameters,
		includeIncentive: boolean = false
	): DriverExpenses {
		return this.driverExpenseCalculator.calculateDriverExpenses(
			days,
			parameters,
			includeIncentive
		);
	}

	/**
	 * Calculate vehicle costs
	 */
	calculateVehicleCosts(
		distance: number,
		days: number,
		vehicle: Vehicle
	): VehicleCosts {
		return this.vehicleCostCalculator.calculateVehicleCosts(
			distance,
			days,
			vehicle
		);
	}
}

// Export singleton instance
export const costCalculationService = new CostCalculationService();
