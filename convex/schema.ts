import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tenants (Organizations)
  tenants: defineTable({
    companyName: v.string(),
    slug: v.string(),
    plan: v.string(), // 'trial' | 'starter' | 'professional' | 'business' | 'enterprise' | 'founder'
    status: v.string(), // 'active' | 'suspended' | 'cancelled' | 'trial_expired'
    logoUrl: v.optional(v.string()),
    primaryContactEmail: v.string(),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    timezone: v.string(),
    // Subscription fields
    subscriptionId: v.optional(v.string()), // Stripe subscription ID
    subscriptionStatus: v.optional(v.string()), // 'trialing' | 'active' | 'past_due' | 'cancelled'
    billingCycle: v.optional(v.string()), // 'monthly' | 'yearly' | 'lifetime'
    // Trial tracking
    trialStartedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    // Subscription period
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    // Plan limits (can override defaults)
    maxUsers: v.optional(v.number()),
    maxVehicles: v.optional(v.number()),
    maxDrivers: v.optional(v.number()),
    maxQuotationsPerMonth: v.optional(v.number()),
    maxEmailsPerMonth: v.optional(v.number()),
    // Feature flags
    features: v.optional(v.object({
      emailEnabled: v.boolean(),
      pdfExport: v.boolean(),
      customBranding: v.boolean(),
      apiAccess: v.boolean(),
      advancedReports: v.boolean(),
      multiCurrency: v.boolean(),
    })),
    // Owner reference
    ownerId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"]),

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
    fuelCapacityUnit: v.optional(v.string()), // 'gallons' | 'liters'
    fuelEfficiency: v.number(),
    fuelEfficiencyUnit: v.string(),
    costPerDistance: v.number(),
    costPerDistanceCurrency: v.optional(v.string()), // 'HNL' | 'USD' | local currency
    costPerDay: v.number(),
    costPerDayCurrency: v.optional(v.string()), // 'HNL' | 'USD' | local currency
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
    // Currency configuration
    localCurrency: v.optional(v.string()), // 3-letter code: HNL, GTQ, NIO, etc. Defaults to HNL
    exchangeRate: v.number(), // USD to local currency rate
    useCustomExchangeRate: v.boolean(), // false = use API rate
    exchangeRateUpdatedAt: v.optional(v.number()), // Last API update timestamp
    preferredDistanceUnit: v.string(),
    preferredCurrency: v.string(), // Display preference: 'USD' or local currency code
    // Operating costs (stored in local currency)
    fuelPrice: v.number(),
    fuelPriceCurrency: v.optional(v.string()), // Currency of fuelPrice
    mealCostPerDay: v.number(),
    mealCostCurrency: v.optional(v.string()),
    hotelCostPerNight: v.number(),
    hotelCostCurrency: v.optional(v.string()),
    driverIncentivePerDay: v.number(),
    driverIncentiveCurrency: v.optional(v.string()),
    // Deadhead (base-to-origin) charging mode
    deadheadChargeMode: v.optional(v.string()), // 'cost_only' | 'cost_plus_margin'
    deadheadMarginPercentage: v.optional(v.number()), // Margin for cost_plus_margin mode (e.g., 15)
    // Toll costs (stored in local currency)
    tollSapYojoa: v.optional(v.number()),
    tollSapSiguatepeque: v.optional(v.number()),
    tollSapZambrano: v.optional(v.number()),
    tollSalidaSap: v.optional(v.number()),
    tollSalidaPtz: v.optional(v.number()),
    // Default markup percentages
    defaultMarkupPercentage: v.optional(v.number()),
    // Client pricing levels configuration
    pricingLevels: v.optional(v.array(v.object({
      key: v.string(),        // 'standard', 'preferred', 'vip', or custom
      name: v.string(),       // Display name
      discountPercentage: v.number(),  // Discount for this level
      isDefault: v.optional(v.boolean()), // Is this the default level?
    }))),
    // Driver license categories configuration
    licenseCategories: v.optional(v.array(v.object({
      key: v.string(),        // e.g., 'comercial_a', 'comercial_b', 'particular'
      name: v.string(),       // Display name e.g., 'Comercial A'
      description: v.optional(v.string()), // Optional description
    }))),
    // Custom vehicle makes/models (tenant-specific, grows over time)
    customVehicleMakes: v.optional(v.array(v.object({
      make: v.string(),       // e.g., 'Scania', 'Marcopolo'
      models: v.array(v.string()), // e.g., ['K380', 'K400']
    }))),
    // Rounding preferences
    roundingLocal: v.optional(v.number()), // Round local currency to nearest N (e.g., 100)
    roundingUsd: v.optional(v.number()), // Round USD to nearest N (e.g., 5)
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
    state: v.optional(v.string()), // State/Province/Department
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
    // Currency used for this quotation (frozen at creation)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc. - defaults to HNL for backwards compatibility
    exchangeRateUsed: v.number(), // Exchange rate at time of creation
    // Cost breakdown - stored in BOTH currencies (frozen at creation)
    // Local currency values
    fuelCostLocal: v.optional(v.number()),
    refuelingCostLocal: v.optional(v.number()),
    driverMealsCostLocal: v.optional(v.number()),
    driverLodgingCostLocal: v.optional(v.number()),
    driverIncentiveCostLocal: v.optional(v.number()),
    vehicleDistanceCostLocal: v.optional(v.number()),
    vehicleDailyCostLocal: v.optional(v.number()),
    tollCostLocal: v.optional(v.number()),
    totalCostLocal: v.optional(v.number()),
    // USD values
    fuelCostUsd: v.optional(v.number()),
    refuelingCostUsd: v.optional(v.number()),
    driverMealsCostUsd: v.optional(v.number()),
    driverLodgingCostUsd: v.optional(v.number()),
    driverIncentiveCostUsd: v.optional(v.number()),
    vehicleDistanceCostUsd: v.optional(v.number()),
    vehicleDailyCostUsd: v.optional(v.number()),
    tollCostUsd: v.optional(v.number()),
    totalCostUsd: v.optional(v.number()),
    // Legacy fields (for backwards compatibility - stored in local currency)
    fuelCost: v.number(),
    refuelingCost: v.number(),
    driverMealsCost: v.number(),
    driverLodgingCost: v.number(),
    driverIncentiveCost: v.number(),
    vehicleDistanceCost: v.number(),
    vehicleDailyCost: v.number(),
    tollCost: v.number(),
    totalCost: v.number(),
    // Pricing - stored in BOTH currencies (frozen at creation)
    selectedMarkupPercentage: v.number(),
    salePriceLocal: v.optional(v.number()), // Sale price in local currency
    salePriceHnl: v.number(), // Legacy field, kept for backwards compatibility
    salePriceUsd: v.number(),
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
    // Pricing (from quotation) - frozen at creation
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    agreedPriceLocal: v.optional(v.number()), // Price in local currency
    agreedPriceHnl: v.number(), // Legacy field for backwards compatibility
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
    // Currency used for this invoice (frozen at creation)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    exchangeRateUsed: v.number(),
    // Line items (services rendered)
    description: v.string(), // Trip description
    // Subtotal in both currencies (frozen at creation)
    subtotalLocal: v.optional(v.number()), // Subtotal in local currency
    subtotalHnl: v.number(), // Legacy field
    subtotalUsd: v.optional(v.number()),
    // Tax (ISV 15% in Honduras)
    taxPercentage: v.number(),
    taxAmountLocal: v.optional(v.number()), // Tax in local currency
    taxAmountHnl: v.number(), // Legacy field
    taxAmountUsd: v.optional(v.number()),
    // Totals in both currencies (frozen at creation)
    totalLocal: v.optional(v.number()), // Total in local currency
    totalHnl: v.number(), // Legacy field
    totalUsd: v.optional(v.number()),
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
    // Currency used (frozen at creation)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    exchangeRateUsed: v.number(),
    // Advance details - both currencies (frozen at creation)
    amountLocal: v.optional(v.number()), // Amount in local currency
    amountHnl: v.number(), // Legacy field
    amountUsd: v.optional(v.number()),
    purpose: v.string(),
    // Expense breakdown (suggested amounts - in local currency)
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

  // Invitations (for team member invites)
  invitations: defineTable({
    tenantId: v.id("tenants"),
    email: v.string(),
    role: v.string(), // 'admin' | 'sales' | 'operations' | 'finance' | 'viewer'
    token: v.string(), // Unique invite token
    status: v.string(), // 'pending' | 'accepted' | 'expired' | 'cancelled'
    invitedBy: v.id("users"),
    acceptedBy: v.optional(v.id("users")),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"]),

  // Usage Tracking (per billing period)
  usageTracking: defineTable({
    tenantId: v.id("tenants"),
    periodStart: v.number(), // Start of billing period (timestamp)
    periodEnd: v.number(), // End of billing period (timestamp)
    // Resource counts
    quotationsCreated: v.number(),
    emailsSent: v.number(),
    pdfGenerated: v.number(),
    // Snapshot of resource counts at period start (for limit checking)
    usersCount: v.optional(v.number()),
    vehiclesCount: v.optional(v.number()),
    driversCount: v.optional(v.number()),
    clientsCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_period", ["tenantId", "periodStart"]),

  // Exchange Rates (global, updated daily)
  exchangeRates: defineTable({
    baseCurrency: v.string(), // Always 'USD'
    rates: v.object({
      HNL: v.number(),  // Honduras
      GTQ: v.number(),  // Guatemala
      CRC: v.number(),  // Costa Rica
      NIO: v.number(),  // Nicaragua
      PAB: v.number(),  // Panama
      BZD: v.number(),  // Belize
      MXN: v.number(),  // Mexico
      DOP: v.number(),  // Dominican Republic
      COP: v.number(),  // Colombia
      PEN: v.number(),  // Peru
    }),
    source: v.string(), // 'apilayer' | 'manual' | 'default'
    fetchedAt: v.number(), // When the rates were fetched from API
    createdAt: v.number(),
  }).index("by_fetched_at", ["fetchedAt"]),
});
