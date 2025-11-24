import {
  CostCalculationService,
  DetailedCosts,
  CostCalculationRequest,
  FuelCosts,
  DriverExpenses,
  VehicleCosts,
  RefuelingCosts,
  Vehicle,
  SystemParameters,
  ErrorType,
  AppError
} from '@/types';
import { convertDistance, convertFuelEfficiency } from '@/utils/unitConversion';
import { parameterManagementService } from './ParameterManagementService';

/**
 * Fuel calculation service
 */
export class FuelCalculator {
  /**
   * Calculate fuel costs based on distance and vehicle specifications
   */
  calculateFuelCosts(distance: number, vehicle: Vehicle, fuelPrice: number): FuelCosts {
    try {
      // Convert distance to vehicle's preferred unit
      const distanceInVehicleUnit = convertDistance(distance, 'km', vehicle.distanceUnit);

      // Convert fuel efficiency to consistent units (distance per gallon)
      const efficiencyInVehicleUnit = convertFuelEfficiency(
        vehicle.fuelEfficiency,
        vehicle.fuelEfficiencyUnit,
        `${vehicle.distanceUnit}pg` as any
      );

      // Calculate fuel consumption in gallons
      const consumption = distanceInVehicleUnit / efficiencyInVehicleUnit;

      // Calculate total fuel cost
      const cost = consumption * fuelPrice;

      return {
        consumption: Math.round(consumption * 100) / 100, // Round to 2 decimal places
        cost: Math.round(cost * 100) / 100,
        pricePerUnit: fuelPrice
      };
    } catch (error) {
      throw new Error(`Fuel cost calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate refueling costs for long-distance trips
   */
  calculateRefuelingCosts(distance: number, vehicle: Vehicle, fuelPrice: number): RefuelingCosts {
    try {
      // Convert distance to vehicle's preferred unit
      const distanceInVehicleUnit = convertDistance(distance, 'km', vehicle.distanceUnit);

      // Calculate vehicle autonomy (range per tank)
      const efficiencyInVehicleUnit = convertFuelEfficiency(
        vehicle.fuelEfficiency,
        vehicle.fuelEfficiencyUnit,
        `${vehicle.distanceUnit}pg` as any
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
    } catch (error) {
      throw new Error(`Refueling cost calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Driver expense calculation service
 */
export class DriverExpenseCalculator {
  /**
   * Calculate driver expenses based on trip duration
   */
  calculateDriverExpenses(duration: number, parameters: SystemParameters, includeIncentive: boolean = false): DriverExpenses {
    try {
      // Convert duration from minutes to days (assuming 8-hour working days)
      const days = Math.ceil(duration / (8 * 60));

      // Calculate meal costs (3 meals per day)
      const meals = days * parameters.mealCostPerDay;

      // Calculate lodging costs (only if trip is more than 1 day)
      const lodging = days > 1 ? (days - 1) * parameters.hotelCostPerNight : 0;

      // Calculate driver incentive (optional)
      const incentive = includeIncentive ? days * parameters.driverIncentivePerDay : 0;

      const total = meals + lodging + incentive;

      return {
        meals: Math.round(meals * 100) / 100,
        lodging: Math.round(lodging * 100) / 100,
        incentive: Math.round(incentive * 100) / 100,
        days,
        total: Math.round(total * 100) / 100
      };
    } catch (error) {
      throw new Error(`Driver expense calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Vehicle cost calculation service
 */
export class VehicleCostCalculator {
  /**
   * Calculate vehicle operational costs
   */
  calculateVehicleCosts(distance: number, duration: number, vehicle: Vehicle): VehicleCosts {
    try {
      // Convert distance to vehicle's preferred unit
      const distanceInVehicleUnit = convertDistance(distance, 'km', vehicle.distanceUnit);

      // Convert duration from minutes to days
      const days = Math.ceil(duration / (24 * 60));

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
    } catch (error) {
      throw new Error(`Vehicle cost calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Comprehensive cost calculation service that integrates all cost components
 */
export class CostCalculationServiceImpl implements CostCalculationService {
  private fuelCalculator: FuelCalculator;
  private driverExpenseCalculator: DriverExpenseCalculator;
  private vehicleCostCalculator: VehicleCostCalculator;

  constructor() {
    this.fuelCalculator = new FuelCalculator();
    this.driverExpenseCalculator = new DriverExpenseCalculator();
    this.vehicleCostCalculator = new VehicleCostCalculator();
  }

  /**
   * Calculate total costs for a transportation request
   */
  async calculateTotalCosts(request: CostCalculationRequest): Promise<DetailedCosts> {
    try {
      // Get current system parameters from ParameterManagementService
      const parameters = parameterManagementService.getParameters();

      const {
        route,
        vehicle,
        extraMileage = 0,
        includeDriverIncentive = false,
        includeFuel = true,
        includeMeals = true,
        includeTolls = true
      } = request;
      const totalDistance = route.totalDistance + extraMileage;

      // Calculate all cost components (always calculate for display purposes)
      const fuel = this.calculateFuelCosts(totalDistance, vehicle, parameters.fuelPrice);
      const driver = this.calculateDriverExpenses(route.totalTime, parameters, includeDriverIncentive);
      const vehicleCosts = this.calculateVehicleCosts(totalDistance, route.totalTime, vehicle);
      const refueling = this.fuelCalculator.calculateRefuelingCosts(totalDistance, vehicle, parameters.fuelPrice);

      // Calculate total cost - only include selected components
      // When includeFuel=false: Rent-a-car mode - client receives vehicle with full tank and returns it full
      const total =
        (includeFuel ? fuel.cost : 0) +           // Base fuel consumption
        (includeFuel ? refueling.total : 0) +     // Additional refueling stops
        (includeMeals ? driver.total : 0) +       // Driver meals and lodging
        vehicleCosts.total;                        // Vehicle operational costs (always included)
      // Note: Toll costs would be added here if we had a separate toll calculator

      return {
        fuel,
        driver,
        vehicle: vehicleCosts,
        refueling,
        total: Math.round(total * 100) / 100
      };

    } catch (error) {
      throw this.handleError(error, 'Failed to calculate total costs');
    }
  }

  /**
   * Calculate fuel costs using the fuel calculator
   */
  calculateFuelCosts(distance: number, vehicle: Vehicle, fuelPrice?: number): FuelCosts {
    const price = fuelPrice || parameterManagementService.getParameters().fuelPrice;
    return this.fuelCalculator.calculateFuelCosts(distance, vehicle, price);
  }

  /**
   * Calculate driver expenses using the driver expense calculator
   */
  calculateDriverExpenses(duration: number, parameters?: SystemParameters, includeIncentive: boolean = false): DriverExpenses {
    const params = parameters || parameterManagementService.getParameters();
    return this.driverExpenseCalculator.calculateDriverExpenses(duration, params, includeIncentive);
  }

  /**
   * Calculate vehicle costs using the vehicle cost calculator
   */
  calculateVehicleCosts(distance: number, duration: number, vehicle: Vehicle): VehicleCosts {
    return this.vehicleCostCalculator.calculateVehicleCosts(distance, duration, vehicle);
  }

  /**
   * Handle and transform errors into AppError format
   */
  private handleError(error: any, message: string): AppError {
    console.error('CostCalculationService error:', error);

    return {
      type: ErrorType.CALCULATION_ERROR,
      message: `${message}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

// Export singleton instances
export const costCalculationService = new CostCalculationServiceImpl();
export const fuelCalculator = new FuelCalculator();
export const driverExpenseCalculator = new DriverExpenseCalculator();
export const vehicleCostCalculator = new VehicleCostCalculator();