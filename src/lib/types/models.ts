/**
 * Core Business Models
 * Ported from legacy Next.js app with Convex integration in mind
 */

// Vehicle Model - Enhanced for SaaS multi-tenancy
export interface Vehicle {
	id: string;
	tenantId?: string;
	name: string;
	make?: string;
	model?: string;
	year?: number;
	licensePlate?: string;
	passengerCapacity: number;
	fuelCapacity: number;
	fuelEfficiency: number;
	fuelEfficiencyUnit: FuelEfficiencyUnit;
	costPerDistance: number;
	costPerDay: number;
	distanceUnit: DistanceUnit;
	ownership: 'owned' | 'rented';
	status: 'active' | 'inactive' | 'maintenance';
	createdAt?: number;
	updatedAt?: number;
}

// Legacy Vehicle interface for backward compatibility with JSON data
export interface LegacyVehicle {
	id: number;
	nombre: string;
	rendimiento: number;
	costo_por_dia: string;
	costo_por_km: string;
	capacidad_nominal: number;
	capacidad_real: number;
	galones_tanque: string;
	slug: string;
	creado: string;
	actualizado: string;
}

// System Parameters Model - Enhanced for SaaS multi-tenancy
export interface SystemParameters {
	id?: string;
	tenantId?: string;
	year: number;
	fuelPrice: number;
	mealCostPerDay: number;
	hotelCostPerNight: number;
	driverIncentivePerDay: number;
	exchangeRate: number;
	useCustomExchangeRate: boolean;
	preferredDistanceUnit: DistanceUnit;
	preferredCurrency: CurrencyType;
	isActive: boolean;
	createdAt?: number;
	updatedAt?: number;
}

// Legacy Parameter interface for backward compatibility
export interface LegacyParameter {
	id: number;
	annio: number;
	nombre: string;
	valor: string;
	unidad: string;
	orden: number;
	slug: string;
	creado: string;
	actualizado: string;
}

// Exchange Rates
export interface ExchangeRates {
	country: string;
	buyRateUSD: number;
	saleRateUSD: number;
	buyRateEUR: number;
	saleRateEUR: number;
}

// Client Model for SaaS
export interface Client {
	id: string;
	tenantId: string;
	type: 'individual' | 'company';
	companyName?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	country: string;
	taxId?: string;
	pricingLevel: 'standard' | 'preferred' | 'vip';
	discountPercentage: number;
	creditLimit: number;
	paymentTerms: number;
	notes?: string;
	status: 'active' | 'inactive';
	createdAt?: number;
	updatedAt?: number;
}

// Driver Model for SaaS
export interface Driver {
	id: string;
	tenantId: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone: string;
	licenseNumber: string;
	licenseExpiry: number;
	licenseCategory?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	status: 'active' | 'inactive' | 'on_leave';
	hireDate?: number;
	notes?: string;
	createdAt?: number;
	updatedAt?: number;
}

// Unit Types
export type DistanceUnit = 'km' | 'mile';
export type FuelEfficiencyUnit = 'mpg' | 'mpl' | 'kpl' | 'kpg';
export type CurrencyType = 'USD' | 'HNL';

// Cost Models
export interface FuelCosts {
	consumption: number;
	cost: number;
	pricePerUnit: number;
}

export interface DriverExpenses {
	meals: number;
	lodging: number;
	incentive: number;
	days: number;
	total: number;
}

export interface VehicleCosts {
	distanceCost: number;
	dailyCost: number;
	total: number;
}

export interface RefuelingCosts {
	stops: number;
	costPerStop: number;
	total: number;
}

export interface TollCosts {
	salida: number;
	sapTGU: number;
	sapTLA: number;
	ptzSAP: number;
	total: number;
}

export interface DetailedCosts {
	fuel: FuelCosts;
	driver: DriverExpenses;
	vehicle: VehicleCosts;
	refueling: RefuelingCosts;
	tolls: TollCosts;
	total: number;
}

// Route and Location Models
export interface RouteSegment {
	origin: string;
	destination: string;
	distance: number;
	duration: number;
}

export interface RouteResult {
	totalDistance: number;
	totalTime: number;
	segments: RouteSegment[];
	polyline?: string;
}

// Quotation Models
export interface QuotationRequest {
	origin: string;
	destination: string;
	baseLocation: string;
	groupSize: number;
	extraMileage?: number;
	estimatedDays?: number;
	includeDriverIncentive?: boolean;
	includeFuel?: boolean;
	includeMeals?: boolean;
	includeTolls?: boolean;
}

export interface PricingOption {
	markup: number;
	cost: number;
	salePrice: number;
	salePriceUSD: number;
	salePriceHNL: number;
	recommended: boolean;
}

export interface Quotation {
	id: string;
	tenantId: string;
	quotationNumber: string;
	clientId?: string;
	vehicleId?: string;
	createdById?: string;
	// Trip details
	origin: string;
	destination: string;
	baseLocation: string;
	groupSize: number;
	extraMileage: number;
	estimatedDays: number;
	// Route info
	totalDistance: number;
	totalTime: number;
	// Cost breakdown
	fuelCost: number;
	refuelingCost: number;
	driverMealsCost: number;
	driverLodgingCost: number;
	driverIncentiveCost: number;
	vehicleDistanceCost: number;
	vehicleDailyCost: number;
	tollCost: number;
	totalCost: number;
	// Pricing
	selectedMarkupPercentage: number;
	salePriceHnl: number;
	salePriceUsd: number;
	exchangeRateUsed: number;
	// Options
	includeFuel: boolean;
	includeMeals: boolean;
	includeTolls: boolean;
	includeDriverIncentive: boolean;
	// Status
	status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
	validUntil?: number;
	notes?: string;
	internalNotes?: string;
	// PDF
	pdfUrl?: string;
	pdfGeneratedAt?: number;
	// Timestamps
	sentAt?: number;
	approvedAt?: number;
	rejectedAt?: number;
	createdAt: number;
	updatedAt: number;
}

export interface QuotationResult {
	route: RouteResult;
	costs: DetailedCosts;
	vehicle: Vehicle;
	pricing: PricingOption[];
	parameters: SystemParameters;
}

// Cost Calculation Request
export interface CostCalculationRequest {
	route: RouteResult;
	vehicle: Vehicle;
	groupSize: number;
	extraMileage?: number;
	estimatedDays?: number;
	includeDriverIncentive?: boolean;
	includeFuel?: boolean;
	includeMeals?: boolean;
	includeTolls?: boolean;
}

// Error Handling
export enum ErrorType {
	NETWORK_ERROR = 'NETWORK_ERROR',
	API_ERROR = 'API_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	CALCULATION_ERROR = 'CALCULATION_ERROR',
	LOCATION_NOT_FOUND = 'LOCATION_NOT_FOUND',
	UNAUTHORIZED = 'UNAUTHORIZED',
	FORBIDDEN = 'FORBIDDEN'
}

export interface AppError {
	type: ErrorType;
	message: string;
	details?: unknown;
}
