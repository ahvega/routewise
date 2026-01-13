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
    logoStorageId: v.optional(v.id("_storage")), // Convex file storage ID for logo
    primaryContactEmail: v.string(),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    timezone: v.string(),
    // Website URL for PDF header
    websiteUrl: v.optional(v.string()),
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
    // Fiscal document configuration (country-specific)
    fiscalDocumentName: v.optional(v.string()), // "RTN" in Honduras, "NIT" in Guatemala, etc.
    fiscalDocumentNumber: v.optional(v.string()), // Company's fiscal document number
    // Sales agents configuration (for quotation assignment)
    salesAgents: v.optional(v.array(v.object({
      userId: v.id("users"),
      initials: v.string(), // 2-3 character initials like "AH", "JM"
      isDefault: v.boolean(),
    }))),
    // Default payment conditions for quotations
    defaultPaymentConditions: v.optional(v.string()), // "Contado", "Crédito 15 días", etc.
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
    fuelPriceUnit: v.optional(v.string()), // 'gallon' | 'liter' - Unit for fuel price (default: gallon)
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

    // Tax Configuration
    taxName: v.optional(v.string()), // "ISV", "IVA", etc.
    taxPercentage: v.optional(v.number()), // 15, 12, 0, etc.
    isTransportTaxable: v.optional(v.boolean()), // Whether transportation services are taxed
    alwaysShowTaxLine: v.optional(v.boolean()), // Show 0% tax line when exempt (default: true)

    // Workflow Configuration
    autoCreateItinerary: v.optional(v.boolean()), // Auto-create itinerary on quotation approval
    autoCreateInvoice: v.optional(v.boolean()), // Auto-create invoice on quotation approval (prepayment)

    // Reminder Configuration
    quotationReminderDays: v.optional(v.array(v.number())), // Days after sent to remind staff, e.g., [3, 7, 14]
    invoiceReminderDays: v.optional(v.array(v.number())), // Days after due date to remind, e.g., [3, 7]

    // WhatsApp Settings (premium feature)
    whatsappEnabled: v.optional(v.boolean()),
    whatsappPhoneNumberId: v.optional(v.string()), // Twilio WhatsApp number

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
    // Client code for quotation naming (4-letter acronym, e.g., "HOTR" for "Honduras Travel")
    clientCode: v.optional(v.string()), // Auto-generated or manually set
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
    .index("by_tenant_email", ["tenantId", "email"])
    .index("by_tenant_code", ["tenantId", "clientCode"]),

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
    quotationNumber: v.string(), // Short format: 2512-C00005
    quotationLongName: v.optional(v.string()), // Full format: 2512-C00005-HOTR-Carlos_Perez_x_08 (deprecated, kept for compat)
    quotationDisplayName: v.optional(v.string()), // Display format with spaces: 2512-C00005-CTA-Juan Pérez x 08
    quotationFileSafeName: v.optional(v.string()), // File-safe format with underscores: 2512-C00005-CTA-Juan_Perez_x_08
    quotationSequence: v.optional(v.number()), // The sequential number (e.g., 5)
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    createdBy: v.optional(v.id("users")),
    // Sales agent assignment
    assignedTo: v.optional(v.id("users")), // Sales agent responsible for this quotation
    assignedToInitials: v.optional(v.string()), // Cached initials for PDF display (e.g., "AH")
    // Group leader info (for naming convention)
    groupLeaderName: v.optional(v.string()), // e.g., "Erasmo Santos"
    groupLeaderPhone: v.optional(v.string()),
    groupLeaderEmail: v.optional(v.string()),
    // Payment and commercial terms
    paymentConditions: v.optional(v.string()), // "Contado", "Crédito 15 días", etc.
    purchaseOrderNumber: v.optional(v.string()), // Client's P.O. number
    // Trip details
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    extraMileage: v.number(),
    estimatedDays: v.number(),
    isRoundTrip: v.optional(v.boolean()), // true = round trip, false = one-way (defaults to true for backwards compat)
    departureDate: v.optional(v.number()), // Planned departure date
    returnDate: v.optional(v.number()), // Planned return date (for multi-day trips)
    // Route info
    totalDistance: v.number(),
    totalTime: v.number(),
    deadheadDistance: v.optional(v.number()), // Repositioning distance (base->origin + return to base)
    mainTripDistance: v.optional(v.number()), // Client trip distance (origin->destination, with or without return)
    // Multi-vehicle service lines (for quotations with multiple vehicles/dates)
    serviceLines: v.optional(v.array(v.object({
      id: v.string(), // Unique line ID (UUID)
      description: v.string(), // Full service description
      route: v.string(), // "Tegucigalpa - La Ceiba - Tegucigalpa"
      days: v.number(), // Trip duration in days
      distance: v.number(), // Distance in km
      dates: v.string(), // Date range string "15-17/jul/2025"
      vehicleId: v.optional(v.id("vehicles")),
      vehicleName: v.string(), // "01 Coaster x 22"
      quantity: v.number(), // Usually 1
      unitPrice: v.number(), // Price per unit in local currency
      totalPrice: v.number(), // quantity * unitPrice
    }))),
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
    // Client discount (applied after subtotal)
    discountPercentage: v.optional(v.number()), // e.g., 10 for 10%
    discountAmount: v.optional(v.number()), // Calculated discount amount in local currency
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
    .index("by_client", ["clientId"])
    .index("by_assigned", ["assignedTo"]),

  // Itineraries (Scheduled trips from approved quotations)
  itineraries: defineTable({
    tenantId: v.id("tenants"),
    itineraryNumber: v.string(), // Short format: 2512-I00005
    itineraryLongName: v.optional(v.string()), // Full format: 2512-I00005-HOTR-Carlos_Perez_x_08 (deprecated, kept for compat)
    itineraryDisplayName: v.optional(v.string()), // Display format with spaces: 2512-I00005-CTA-Juan Pérez x 08
    itineraryFileSafeName: v.optional(v.string()), // File-safe format with underscores: 2512-I00005-CTA-Juan_Perez_x_08
    itinerarySequence: v.optional(v.number()), // Sequential number
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
    isRoundTrip: v.optional(v.boolean()), // true = round trip, false = one-way
    // Schedule
    startDate: v.number(),
    endDate: v.optional(v.number()),
    estimatedDays: v.number(),
    // Trip Leader Information (SPOC - Single Point of Contact)
    tripLeaderName: v.optional(v.string()),
    tripLeaderPhone: v.optional(v.string()),
    tripLeaderEmail: v.optional(v.string()),

    // Pickup details
    pickupLocation: v.optional(v.string()), // General pickup area
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    // Exact pickup location (collected before trip via client portal)
    pickupExactAddress: v.optional(v.string()),
    pickupCoordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    pickupGoogleMapsUrl: v.optional(v.string()),
    pickupWazeUrl: v.optional(v.string()),
    pickupQrCodeDataUrl: v.optional(v.string()), // Base64 QR code for universal link

    // Dropoff details
    dropoffLocation: v.optional(v.string()), // General dropoff area
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    // Exact dropoff location (collected before trip via client portal)
    dropoffExactAddress: v.optional(v.string()),
    dropoffCoordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    dropoffGoogleMapsUrl: v.optional(v.string()),
    dropoffWazeUrl: v.optional(v.string()),
    dropoffQrCodeDataUrl: v.optional(v.string()), // Base64 QR code for universal link

    // Client Portal (magic link for collecting trip details)
    clientAccessToken: v.optional(v.string()), // Secure token for magic link
    clientAccessExpiresAt: v.optional(v.number()), // Token expiry timestamp
    detailsCompletedAt: v.optional(v.number()), // When client filled in trip details
    detailsCompletedBy: v.optional(v.string()), // 'client' | 'staff'

    // Linked Invoice (direct reference for quick access)
    invoiceId: v.optional(v.id("invoices")),
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
    // Activity log / timeline notes
    activityNotes: v.optional(v.array(v.object({
      timestamp: v.number(),
      note: v.string(),
      createdBy: v.optional(v.string()), // User name or 'system'
    }))),
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
    invoiceNumber: v.string(), // Short format: 2512-F00005
    invoiceLongName: v.optional(v.string()), // Full format: 2512-F00005-HOTR-Carlos_Perez_x_08
    invoiceSequence: v.optional(v.number()), // Sequential number
    quotationId: v.optional(v.id("quotations")), // Reference to source quotation
    itineraryId: v.optional(v.id("itineraries")),
    clientId: v.optional(v.id("clients")),
    createdBy: v.optional(v.id("users")),
    // Invoice details
    invoiceDate: v.number(),
    dueDate: v.number(),
    // Currency used for this invoice (frozen at creation)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    exchangeRateUsed: v.number(),

    // Line items (structured service breakdown)
    lineItems: v.optional(v.array(v.object({
      description: v.string(), // Service description line
      quantity: v.number(), // Usually 1 for transport services
      unitPriceLocal: v.number(), // Price in local currency
      unitPriceUsd: v.optional(v.number()), // Price in USD
      totalLocal: v.number(), // quantity * unitPriceLocal
      totalUsd: v.optional(v.number()), // quantity * unitPriceUsd
    }))),

    // Natural language service description (generated from quotation/itinerary)
    serviceDescription: v.optional(v.string()), // Full prose description of service

    // Legacy field (for backwards compatibility)
    description: v.string(), // Simple trip description
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
    internalNotes: v.optional(v.string()), // Staff-only notes
    // Activity log / timeline notes
    activityNotes: v.optional(v.array(v.object({
      timestamp: v.number(),
      note: v.string(),
      createdBy: v.optional(v.string()), // User name or 'system'
    }))),
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
    .index("by_quotation", ["quotationId"])
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
    // Detailed breakdown for PDF and UI
    estimatedFuelGallons: v.optional(v.number()), // Fuel quantity in gallons
    fuelPriceUsed: v.optional(v.number()), // Fuel price at time of creation
    fuelPriceUnit: v.optional(v.string()), // 'gallon' | 'liter' - Unit used for fuel price
    tripDays: v.optional(v.number()), // Number of trip days for meal/lodging calculation
    tripNights: v.optional(v.number()), // Number of nights for lodging
    // Status workflow: draft → pending → approved → disbursed → settled
    status: v.string(), // 'draft' | 'pending' | 'approved' | 'disbursed' | 'settled' | 'cancelled'
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

  // ============================================================
  // SALES WORKFLOW TABLES
  // ============================================================

  // Notifications (in-app, email, and WhatsApp notifications)
  notifications: defineTable({
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")), // Specific user, or null for all staff

    // Notification type and priority
    type: v.string(), // 'quotation_followup' | 'quotation_approved' | 'quotation_rejected' | 'quotation_expired' |
                      // 'itinerary_created' | 'trip_details_requested' | 'trip_details_completed' | 'trip_tomorrow' |
                      // 'invoice_created' | 'invoice_sent' | 'invoice_overdue' | 'payment_received'
    priority: v.string(), // 'low' | 'medium' | 'high' | 'urgent'

    // Content
    title: v.string(),
    message: v.string(),

    // Reference to related entity
    entityType: v.optional(v.string()), // 'quotation' | 'itinerary' | 'invoice'
    entityId: v.optional(v.string()), // ID of the related entity (stored as string for flexibility)

    // Delivery channels
    channels: v.array(v.string()), // ['in_app', 'email', 'whatsapp']

    // In-app status
    read: v.boolean(),
    readAt: v.optional(v.number()),
    dismissed: v.optional(v.boolean()),
    dismissedAt: v.optional(v.number()),

    // Email delivery tracking
    emailSent: v.optional(v.boolean()),
    emailSentAt: v.optional(v.number()),
    emailError: v.optional(v.string()),

    // WhatsApp delivery tracking
    whatsappSent: v.optional(v.boolean()),
    whatsappSentAt: v.optional(v.number()),
    whatsappError: v.optional(v.string()),
    whatsappMessageId: v.optional(v.string()), // Twilio message SID

    // Scheduling (for future/recurring notifications)
    scheduledFor: v.optional(v.number()), // Future timestamp for delayed delivery
    processed: v.optional(v.boolean()), // Whether scheduled notification was processed

    // Action URL (where clicking the notification should go)
    actionUrl: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_user", ["tenantId", "userId"])
    .index("by_tenant_unread", ["tenantId", "read"])
    .index("by_tenant_user_unread", ["tenantId", "userId", "read"])
    .index("by_scheduled", ["scheduledFor", "processed"])
    .index("by_entity", ["entityType", "entityId"]),

  // Client Access Tokens (magic links for client portal)
  clientAccessTokens: defineTable({
    tenantId: v.id("tenants"),
    itineraryId: v.id("itineraries"),
    clientId: v.optional(v.id("clients")),

    // Token
    token: v.string(), // Unique secure token (UUID or random string)
    email: v.string(), // Client email the link was sent to

    // Validity
    expiresAt: v.number(), // Token expiry timestamp (default 7 days)
    maxUses: v.optional(v.number()), // Max number of times token can be used (default unlimited)
    useCount: v.optional(v.number()), // Number of times token has been used

    // Usage tracking
    usedAt: v.optional(v.number()), // First access timestamp
    lastUsedAt: v.optional(v.number()), // Last access timestamp
    ipAddress: v.optional(v.string()), // IP of first access (for audit)
    userAgent: v.optional(v.string()), // Browser/device of first access

    // Status
    status: v.string(), // 'active' | 'used' | 'expired' | 'revoked'
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("users")),
    revokeReason: v.optional(v.string()),

    // Who created the token
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_itinerary", ["itineraryId"])
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_expiry", ["expiresAt", "status"]),

  // Scheduled Reminders (tracks which reminders have been sent)
  scheduledReminders: defineTable({
    tenantId: v.id("tenants"),

    // What entity this reminder is for
    entityType: v.string(), // 'quotation' | 'invoice' | 'itinerary'
    entityId: v.string(), // ID of the entity

    // Reminder configuration
    reminderType: v.string(), // 'quotation_followup' | 'invoice_overdue' | 'trip_upcoming' | 'trip_details_incomplete'
    reminderDay: v.number(), // Which day in the sequence (e.g., 3, 7, 14 for quotation followup)

    // Scheduling
    scheduledFor: v.number(), // When the reminder should be sent
    processed: v.boolean(), // Whether the reminder has been processed
    processedAt: v.optional(v.number()),

    // Result tracking
    notificationId: v.optional(v.id("notifications")), // Link to created notification
    skipped: v.optional(v.boolean()), // Whether reminder was skipped (e.g., entity status changed)
    skipReason: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_scheduled", ["scheduledFor", "processed"])
    .index("by_tenant_type", ["tenantId", "reminderType"]),
});
