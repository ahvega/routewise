/**
 * Service Interface Definitions
 */

import type {
	RouteResult,
	DetailedCosts,
	CostCalculationRequest,
	FuelCosts,
	DriverExpenses,
	VehicleCosts,
	Vehicle,
	SystemParameters
} from './models';

// Route Calculator Service Interface
export interface IRouteCalculatorService {
	calculateRoute(
		origin: string,
		destination: string,
		baseLocation: string
	): Promise<RouteResult>;
}

// Cost Calculation Service Interface
export interface ICostCalculationService {
	calculateTotalCosts(request: CostCalculationRequest): Promise<DetailedCosts>;
	calculateFuelCosts(distance: number, vehicle: Vehicle): FuelCosts;
	calculateDriverExpenses(days: number, params: SystemParameters): DriverExpenses;
	calculateVehicleCosts(
		distance: number,
		days: number,
		vehicle: Vehicle
	): VehicleCosts;
}

// Vehicle Management Service Interface
export interface IVehicleManagementService {
	getVehicles(): Promise<Vehicle[]>;
	getVehiclesByCapacity(minCapacity: number): Promise<Vehicle[]>;
	getVehicleById(id: string): Promise<Vehicle | null>;
}

// Parameter Management Service Interface
export interface IParameterManagementService {
	getParameters(year?: number): Promise<SystemParameters>;
	getActiveParameters(): Promise<SystemParameters>;
}

// Exchange Rate Service Interface
export interface IExchangeRateService {
	getCurrentRate(): Promise<number>;
	setCustomRate(rate: number): void;
	getCustomRate(): number | null;
	isUsingCustomRate(): boolean;
}

// Quotation Service Interface
export interface IQuotationService {
	generateQuotation(
		request: CostCalculationRequest,
		markups: number[]
	): Promise<{
		costs: DetailedCosts;
		pricing: Array<{
			markup: number;
			salePrice: number;
			salePriceHNL: number;
			salePriceUSD: number;
		}>;
	}>;
}
