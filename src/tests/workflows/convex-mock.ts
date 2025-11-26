/**
 * Convex Mock Utilities for Testing
 *
 * This module provides mock implementations of Convex data and operations
 * for testing the full workflow: Quotation → Itinerary → Invoice → Payment
 */

import { vi } from 'vitest';

// Mock ID generator
let idCounter = 0;
export function generateMockId(table: string): string {
  idCounter++;
  return `${table}_${idCounter}_${Date.now()}`;
}

export function resetMockIds(): void {
  idCounter = 0;
}

// Mock tenant for testing
export const mockTenant = {
  _id: 'tenants_test_1',
  companyName: 'Test Transport Co',
  slug: 'test-transport',
  plan: 'professional',
  status: 'active',
  primaryContactEmail: 'admin@test.com',
  country: 'Honduras',
  timezone: 'America/Tegucigalpa',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Mock client
export const mockClient = {
  _id: 'clients_test_1',
  tenantId: mockTenant._id,
  type: 'company',
  companyName: 'Acme Tours',
  email: 'contact@acmetours.com',
  phone: '+504 9999-1234',
  country: 'Honduras',
  pricingLevel: 'standard',
  discountPercentage: 0,
  creditLimit: 100000,
  paymentTerms: 30,
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Mock vehicle
export const mockVehicle = {
  _id: 'vehicles_test_1',
  tenantId: mockTenant._id,
  name: 'Bus Ejecutivo 45',
  make: 'Mercedes-Benz',
  model: 'O500',
  year: 2022,
  licensePlate: 'AAA-1234',
  passengerCapacity: 45,
  fuelCapacity: 400,
  fuelEfficiency: 3.5,
  fuelEfficiencyUnit: 'km/l',
  costPerDistance: 5,
  costPerDay: 2000,
  distanceUnit: 'km',
  ownership: 'owned',
  status: 'active',
  baseLocation: 'San Pedro Sula, Honduras',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Mock driver
export const mockDriver = {
  _id: 'drivers_test_1',
  tenantId: mockTenant._id,
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: '+504 9876-5432',
  licenseNumber: 'HN-12345678',
  licenseExpiry: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year from now
  licenseCategory: 'Profesional',
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Quotation status workflow
export const QuotationStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

// Itinerary status workflow
export const ItineraryStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Invoice status workflow
export const InvoiceStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  VOID: 'void',
} as const;

// Payment status workflow
export const PaymentStatus = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

// Valid status transitions
export const validQuotationTransitions: Record<string, string[]> = {
  [QuotationStatus.DRAFT]: [QuotationStatus.SENT, QuotationStatus.APPROVED],
  [QuotationStatus.SENT]: [QuotationStatus.APPROVED, QuotationStatus.REJECTED, QuotationStatus.EXPIRED],
  [QuotationStatus.APPROVED]: [], // Terminal for quotation (converts to itinerary)
  [QuotationStatus.REJECTED]: [],
  [QuotationStatus.EXPIRED]: [],
};

export const validItineraryTransitions: Record<string, string[]> = {
  [ItineraryStatus.SCHEDULED]: [ItineraryStatus.IN_PROGRESS, ItineraryStatus.CANCELLED],
  [ItineraryStatus.IN_PROGRESS]: [ItineraryStatus.COMPLETED, ItineraryStatus.CANCELLED],
  [ItineraryStatus.COMPLETED]: [], // Terminal (can generate invoice)
  [ItineraryStatus.CANCELLED]: [],
};

export const validInvoiceTransitions: Record<string, string[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
  [InvoiceStatus.SENT]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.VOID],
  [InvoiceStatus.PAID]: [InvoiceStatus.VOID], // Can void a paid invoice
  [InvoiceStatus.CANCELLED]: [],
  [InvoiceStatus.VOID]: [],
};

// Create a mock quotation
export function createMockQuotation(overrides: Partial<typeof baseQuotation> = {}) {
  const now = Date.now();
  const baseQuotation = {
    _id: generateMockId('quotations'),
    tenantId: mockTenant._id,
    quotationNumber: `QT-${new Date().getFullYear()}-0001`,
    clientId: mockClient._id,
    vehicleId: mockVehicle._id,
    origin: 'San Pedro Sula',
    destination: 'Tegucigalpa',
    baseLocation: 'San Pedro Sula',
    groupSize: 30,
    extraMileage: 0,
    estimatedDays: 1,
    totalDistance: 250,
    totalTime: 4 * 60 * 60 * 1000, // 4 hours
    // Cost breakdown
    fuelCost: 500,
    refuelingCost: 50,
    driverMealsCost: 150,
    driverLodgingCost: 0,
    driverIncentiveCost: 200,
    vehicleDistanceCost: 1250,
    vehicleDailyCost: 2000,
    tollCost: 300,
    totalCost: 4450,
    // Pricing
    selectedMarkupPercentage: 20,
    salePriceHnl: 5340,
    salePriceUsd: 216,
    exchangeRateUsed: 24.72,
    // Options
    includeFuel: true,
    includeMeals: true,
    includeTolls: true,
    includeDriverIncentive: true,
    // Status
    status: QuotationStatus.DRAFT,
    validUntil: now + (30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: now,
    updatedAt: now,
  };

  return { ...baseQuotation, ...overrides };
}

// Create a mock itinerary
export function createMockItinerary(quotation: ReturnType<typeof createMockQuotation>, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  const startDate = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now

  const baseItinerary = {
    _id: generateMockId('itineraries'),
    tenantId: quotation.tenantId,
    itineraryNumber: `IT-${new Date().getFullYear()}-0001`,
    quotationId: quotation._id,
    clientId: quotation.clientId,
    vehicleId: quotation.vehicleId,
    driverId: mockDriver._id,
    origin: quotation.origin,
    destination: quotation.destination,
    baseLocation: quotation.baseLocation,
    groupSize: quotation.groupSize,
    totalDistance: quotation.totalDistance,
    totalTime: quotation.totalTime,
    startDate,
    estimatedDays: quotation.estimatedDays,
    pickupLocation: quotation.origin,
    pickupTime: '08:00',
    dropoffLocation: quotation.destination,
    dropoffTime: '12:00',
    agreedPriceHnl: quotation.salePriceHnl,
    agreedPriceUsd: quotation.salePriceUsd,
    exchangeRateUsed: quotation.exchangeRateUsed,
    status: ItineraryStatus.SCHEDULED,
    createdAt: now,
    updatedAt: now,
  };

  return { ...baseItinerary, ...overrides };
}

// Create a mock invoice
export function createMockInvoice(itinerary: ReturnType<typeof createMockItinerary>, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  const taxPercentage = 15; // ISV Honduras
  const subtotalHnl = itinerary.agreedPriceHnl;
  const taxAmountHnl = subtotalHnl * (taxPercentage / 100);
  const totalHnl = subtotalHnl + taxAmountHnl;
  const totalUsd = totalHnl / itinerary.exchangeRateUsed;

  const baseInvoice = {
    _id: generateMockId('invoices'),
    tenantId: itinerary.tenantId,
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    itineraryId: itinerary._id,
    clientId: itinerary.clientId,
    invoiceDate: now,
    dueDate: now + (30 * 24 * 60 * 60 * 1000), // 30 days
    description: `Servicio de transporte: ${itinerary.origin} → ${itinerary.destination}`,
    subtotalHnl,
    taxPercentage,
    taxAmountHnl,
    totalHnl,
    totalUsd,
    exchangeRateUsed: itinerary.exchangeRateUsed,
    amountPaid: 0,
    amountDue: totalHnl,
    paymentStatus: PaymentStatus.UNPAID,
    status: InvoiceStatus.DRAFT,
    createdAt: now,
    updatedAt: now,
  };

  return { ...baseInvoice, ...overrides };
}

// Create a mock payment
export function createMockPayment(invoice: ReturnType<typeof createMockInvoice>, amount: number, overrides: Record<string, unknown> = {}) {
  const now = Date.now();

  const basePayment = {
    _id: generateMockId('invoicePayments'),
    tenantId: invoice.tenantId,
    invoiceId: invoice._id,
    paymentDate: now,
    amount,
    paymentMethod: 'transfer',
    referenceNumber: `PAY-${Date.now()}`,
    createdAt: now,
  };

  return { ...basePayment, ...overrides };
}

// Helper to calculate payment status after recording payment
export function calculatePaymentStatus(totalHnl: number, amountPaid: number): string {
  const amountDue = totalHnl - amountPaid;
  if (amountDue <= 0) return PaymentStatus.PAID;
  if (amountPaid > 0) return PaymentStatus.PARTIAL;
  return PaymentStatus.UNPAID;
}

// Validate status transition
export function isValidTransition(
  transitions: Record<string, string[]>,
  currentStatus: string,
  newStatus: string
): boolean {
  const validNextStatuses = transitions[currentStatus];
  return validNextStatuses?.includes(newStatus) ?? false;
}
