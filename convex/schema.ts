import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tenants (Organizations)
  tenants: defineTable({
    companyName: v.string(),
    slug: v.string(),
    plan: v.string(), // 'starter' | 'professional' | 'business' | 'enterprise'
    status: v.string(), // 'active' | 'suspended' | 'cancelled'
    logoUrl: v.optional(v.string()),
    primaryContactEmail: v.string(),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    timezone: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  // Users
  users: defineTable({
    tenantId: v.id("tenants"),
    workosUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.string(), // 'admin' | 'sales' | 'operations' | 'finance' | 'viewer'
    status: v.string(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_workos_id", ["workosUserId"])
    .index("by_email", ["email"]),

  // Vehicles
  vehicles: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    licensePlate: v.optional(v.string()),
    passengerCapacity: v.number(),
    fuelCapacity: v.number(),
    fuelEfficiency: v.number(),
    fuelEfficiencyUnit: v.string(),
    costPerDistance: v.number(),
    costPerDay: v.number(),
    distanceUnit: v.string(),
    ownership: v.string(), // 'owned' | 'rented'
    status: v.string(),
    // Base location for deadhead calculation
    baseLocation: v.optional(v.string()), // e.g., "San Pedro Sula, Honduras"
    baseLocationLat: v.optional(v.number()),
    baseLocationLng: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tenant", ["tenantId"]),

  // Parameters (System settings per tenant/year)
  parameters: defineTable({
    tenantId: v.id("tenants"),
    year: v.number(),
    fuelPrice: v.number(),
    mealCostPerDay: v.number(),
    hotelCostPerNight: v.number(),
    driverIncentivePerDay: v.number(),
    exchangeRate: v.number(),
    useCustomExchangeRate: v.boolean(),
    preferredDistanceUnit: v.string(),
    preferredCurrency: v.string(),
    // Deadhead (base-to-origin) charging mode
    deadheadChargeMode: v.optional(v.string()), // 'cost_only' | 'cost_plus_margin'
    deadheadMarginPercentage: v.optional(v.number()), // Margin for cost_plus_margin mode (e.g., 15)
    // Toll costs (Honduras-specific)
    tollSapYojoa: v.optional(v.number()),
    tollSapSiguatepeque: v.optional(v.number()),
    tollSapZambrano: v.optional(v.number()),
    tollSalidaSap: v.optional(v.number()),
    tollSalidaPtz: v.optional(v.number()),
    // Default markup percentages
    defaultMarkupPercentage: v.optional(v.number()),
    // Rounding preferences
    roundingHnl: v.optional(v.number()), // e.g., 100 (round to nearest 100 Lps)
    roundingUsd: v.optional(v.number()), // e.g., 5 (round to nearest $5)
    // Terms and Conditions parameters
    quotationValidityDays: v.optional(v.number()), // e.g., 30 days
    prepaymentDays: v.optional(v.number()), // e.g., 3 days before trip
    cancellationMinHours: v.optional(v.number()), // e.g., 48 hours before
    cancellationPenaltyPercentage: v.optional(v.number()), // e.g., 50%
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_year", ["tenantId", "year"]),

  // Clients
  clients: defineTable({
    tenantId: v.id("tenants"),
    type: v.string(), // 'individual' | 'company'
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    taxId: v.optional(v.string()),
    pricingLevel: v.string(), // 'standard' | 'preferred' | 'vip'
    discountPercentage: v.number(),
    creditLimit: v.number(),
    paymentTerms: v.number(),
    notes: v.optional(v.string()),
    status: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_email", ["tenantId", "email"]),

  // Drivers
  drivers: defineTable({
    tenantId: v.id("tenants"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    licenseNumber: v.string(),
    licenseExpiry: v.number(),
    licenseCategory: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    status: v.string(),
    hireDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tenant", ["tenantId"]),

  // Quotations
  quotations: defineTable({
    tenantId: v.id("tenants"),
    quotationNumber: v.string(),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    createdBy: v.optional(v.id("users")),
    // Trip details
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    extraMileage: v.number(),
    estimatedDays: v.number(),
    departureDate: v.optional(v.number()), // Planned departure date
    // Route info
    totalDistance: v.number(),
    totalTime: v.number(),
    // Cost breakdown
    fuelCost: v.number(),
    refuelingCost: v.number(),
    driverMealsCost: v.number(),
    driverLodgingCost: v.number(),
    driverIncentiveCost: v.number(),
    vehicleDistanceCost: v.number(),
    vehicleDailyCost: v.number(),
    tollCost: v.number(),
    totalCost: v.number(),
    // Pricing
    selectedMarkupPercentage: v.number(),
    salePriceHnl: v.number(),
    salePriceUsd: v.number(),
    exchangeRateUsed: v.number(),
    // Options
    includeFuel: v.boolean(),
    includeMeals: v.boolean(),
    includeTolls: v.boolean(),
    includeDriverIncentive: v.boolean(),
    // Status
    status: v.string(), // 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    // PDF
    pdfUrl: v.optional(v.string()),
    pdfGeneratedAt: v.optional(v.number()),
    // Timestamps
    sentAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_client", ["clientId"]),

  // Itineraries (Scheduled trips from approved quotations)
  itineraries: defineTable({
    tenantId: v.id("tenants"),
    itineraryNumber: v.string(),
    quotationId: v.optional(v.id("quotations")),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    driverId: v.optional(v.id("drivers")),
    createdBy: v.optional(v.id("users")),
    // Trip details (copied from quotation or entered manually)
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    totalDistance: v.number(),
    totalTime: v.number(),
    // Schedule
    startDate: v.number(),
    endDate: v.optional(v.number()),
    estimatedDays: v.number(),
    // Pickup/Dropoff details
    pickupLocation: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffLocation: v.optional(v.string()),
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    // Pricing (from quotation)
    agreedPriceHnl: v.number(),
    agreedPriceUsd: v.number(),
    exchangeRateUsed: v.number(),
    // Status
    status: v.string(), // 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    // Route link
    routeLink: v.optional(v.string()),
    // Notes
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    // Timestamps
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_driver", ["driverId"])
    .index("by_vehicle", ["vehicleId"])
    .index("by_quotation", ["quotationId"])
    .index("by_start_date", ["tenantId", "startDate"]),

  // Invoices
  invoices: defineTable({
    tenantId: v.id("tenants"),
    invoiceNumber: v.string(),
    itineraryId: v.optional(v.id("itineraries")),
    clientId: v.optional(v.id("clients")),
    createdBy: v.optional(v.id("users")),
    // Invoice details
    invoiceDate: v.number(),
    dueDate: v.number(),
    // Line items (services rendered)
    description: v.string(), // Trip description
    subtotalHnl: v.number(),
    // Tax (ISV 15% in Honduras)
    taxPercentage: v.number(),
    taxAmountHnl: v.number(),
    // Totals
    totalHnl: v.number(),
    totalUsd: v.optional(v.number()),
    exchangeRateUsed: v.number(),
    // Payment tracking
    amountPaid: v.number(),
    amountDue: v.number(),
    paymentStatus: v.string(), // 'unpaid' | 'partial' | 'paid' | 'overdue'
    // Additional charges/discounts
    additionalCharges: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
    }))),
    discounts: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
    }))),
    // PDF
    pdfUrl: v.optional(v.string()),
    pdfGeneratedAt: v.optional(v.number()),
    // Status
    status: v.string(), // 'draft' | 'sent' | 'paid' | 'cancelled' | 'void'
    notes: v.optional(v.string()),
    // Timestamps
    sentAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_tenant_payment_status", ["tenantId", "paymentStatus"])
    .index("by_itinerary", ["itineraryId"])
    .index("by_client", ["clientId"]),

  // Invoice Payments (for tracking partial payments)
  invoicePayments: defineTable({
    tenantId: v.id("tenants"),
    invoiceId: v.id("invoices"),
    paymentDate: v.number(),
    amount: v.number(),
    paymentMethod: v.optional(v.string()), // 'cash' | 'transfer' | 'card' | 'check'
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_tenant", ["tenantId"]),

  // Expense Advances (money given to drivers for trip expenses)
  expenseAdvances: defineTable({
    tenantId: v.id("tenants"),
    advanceNumber: v.string(),
    itineraryId: v.id("itineraries"),
    driverId: v.optional(v.id("drivers")),
    createdBy: v.optional(v.id("users")),
    // Advance details
    amountHnl: v.number(),
    amountUsd: v.optional(v.number()),
    exchangeRateUsed: v.number(),
    purpose: v.string(),
    // Expense breakdown (suggested amounts)
    estimatedFuel: v.optional(v.number()),
    estimatedMeals: v.optional(v.number()),
    estimatedLodging: v.optional(v.number()),
    estimatedTolls: v.optional(v.number()),
    estimatedOther: v.optional(v.number()),
    // Status workflow: pending → approved → disbursed → settled
    status: v.string(), // 'pending' | 'approved' | 'disbursed' | 'settled' | 'cancelled'
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    disbursedAt: v.optional(v.number()),
    disbursementMethod: v.optional(v.string()), // 'cash' | 'transfer'
    disbursementReference: v.optional(v.string()),
    // Settlement (after trip completion)
    actualExpenses: v.optional(v.number()),
    actualFuel: v.optional(v.number()),
    actualMeals: v.optional(v.number()),
    actualLodging: v.optional(v.number()),
    actualTolls: v.optional(v.number()),
    actualOther: v.optional(v.number()),
    receiptsCount: v.optional(v.number()),
    // Balance calculation
    balanceAmount: v.optional(v.number()), // positive = driver owes, negative = company owes
    balanceSettled: v.optional(v.boolean()),
    settlementNotes: v.optional(v.string()),
    settledAt: v.optional(v.number()),
    settledBy: v.optional(v.id("users")),
    // General
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_itinerary", ["itineraryId"])
    .index("by_driver", ["driverId"]),
});
