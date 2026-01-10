import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";

// Generate advance number (A00001 format)
// Uses sequential numbering based on existing advances
async function generateAdvanceNumber(ctx: QueryCtx, tenantId: string): Promise<string> {
  const existing = await ctx.db
    .query("expenseAdvances")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId as any))
    .collect();

  let maxSeq = 0;
  for (const a of existing) {
    // Parse from A00001 format
    if (a.advanceNumber?.startsWith('A')) {
      const match = a.advanceNumber.match(/^A(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
    // Also parse from legacy format ADV-YYYY-NNNN
    if (a.advanceNumber?.startsWith('ADV-')) {
      const match = a.advanceNumber.match(/ADV-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `A${nextSeq.toString().padStart(5, '0')}`;
}

// List all expense advances for a tenant
export const list = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.string()),
    driverId: v.optional(v.id("drivers")),
    itineraryId: v.optional(v.id("itineraries")),
  },
  handler: async (ctx, args) => {
    let advances;

    if (args.status) {
      advances = await ctx.db
        .query("expenseAdvances")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", args.status!)
        )
        .collect();
    } else {
      advances = await ctx.db
        .query("expenseAdvances")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }

    // Additional filtering
    if (args.driverId) {
      advances = advances.filter(a => a.driverId === args.driverId);
    }
    if (args.itineraryId) {
      advances = advances.filter(a => a.itineraryId === args.itineraryId);
    }

    return advances.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single expense advance by ID
export const get = query({
  args: { id: v.id("expenseAdvances") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get expense advance by itinerary ID
// Returns the active (non-cancelled) advance for this itinerary
export const getByItinerary = query({
  args: { itineraryId: v.id("itineraries") },
  handler: async (ctx, args) => {
    const advances = await ctx.db
      .query("expenseAdvances")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .collect();

    // Return the first non-cancelled advance (most recent first)
    // This allows creating a new advance if all previous ones were cancelled
    return advances
      .filter(a => a.status !== 'cancelled')
      .sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  },
});

// Get advances by driver
export const getByDriver = query({
  args: { driverId: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expenseAdvances")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .collect();
  },
});

// Create expense advance from itinerary
export const createFromItinerary = mutation({
  args: {
    itineraryId: v.id("itineraries"),
    amountLocal: v.optional(v.number()), // Amount in local currency
    amountHnl: v.optional(v.number()), // Legacy parameter
    estimatedFuel: v.optional(v.number()),
    estimatedMeals: v.optional(v.number()),
    estimatedLodging: v.optional(v.number()),
    estimatedTolls: v.optional(v.number()),
    estimatedOther: v.optional(v.number()),
    // Detailed breakdown fields
    estimatedFuelGallons: v.optional(v.number()), // Fuel quantity in gallons
    fuelPriceUsed: v.optional(v.number()), // Fuel price at time of creation
    fuelPriceUnit: v.optional(v.string()), // 'gallon' | 'liter' - Unit used for fuel price
    tripDays: v.optional(v.number()), // Number of trip days
    tripNights: v.optional(v.number()), // Number of nights for lodging
    purpose: v.optional(v.string()),
    notes: v.optional(v.string()),
    saveAsDraft: v.optional(v.boolean()), // If true, saves as draft instead of pending
  },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) throw new Error("Itinerary not found");

    // Check if an active (non-cancelled) advance already exists for this itinerary
    const existingAdvances = await ctx.db
      .query("expenseAdvances")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .collect();

    const activeAdvance = existingAdvances.find(a => a.status !== 'cancelled');
    if (activeAdvance) {
      throw new Error("Expense advance already exists for this itinerary");
    }

    const now = Date.now();

    // Calculate suggested advance if not provided
    // Use quotation costs if available, otherwise use estimates
    const estimatedFuel = args.estimatedFuel ?? 0;
    const estimatedMeals = args.estimatedMeals ?? 0;
    const estimatedLodging = args.estimatedLodging ?? 0;
    const estimatedTolls = args.estimatedTolls ?? 0;
    const estimatedOther = args.estimatedOther ?? 0;

    const totalEstimated = estimatedFuel + estimatedMeals + estimatedLodging + estimatedTolls + estimatedOther;
    // Use local currency amount, fallback to legacy HNL parameter
    const amountLocal = args.amountLocal ?? args.amountHnl ?? totalEstimated;
    const amountUsd = amountLocal / itinerary.exchangeRateUsed;

    const purpose = args.purpose || `Gastos de viaje: ${itinerary.origin} → ${itinerary.destination}`;

    // Use draft status if requested, otherwise pending
    const status = args.saveAsDraft ? "draft" : "pending";

    const advanceNumber = await generateAdvanceNumber(ctx, itinerary.tenantId);
    const advanceId = await ctx.db.insert("expenseAdvances", {
      tenantId: itinerary.tenantId,
      advanceNumber,
      itineraryId: args.itineraryId,
      driverId: itinerary.driverId,
      // Currency configuration (from itinerary)
      localCurrency: itinerary.localCurrency,
      exchangeRateUsed: itinerary.exchangeRateUsed,
      // Amount in both currencies (frozen)
      amountLocal,
      amountHnl: amountLocal, // Legacy field
      amountUsd,
      purpose,
      estimatedFuel,
      estimatedMeals,
      estimatedLodging,
      estimatedTolls,
      estimatedOther,
      // Detailed breakdown fields
      estimatedFuelGallons: args.estimatedFuelGallons,
      fuelPriceUsed: args.fuelPriceUsed,
      fuelPriceUnit: args.fuelPriceUnit,
      tripDays: args.tripDays,
      tripNights: args.tripNights,
      status,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return advanceId;
  },
});

// Create expense advance manually
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    itineraryId: v.id("itineraries"),
    driverId: v.optional(v.id("drivers")),
    // Currency configuration
    localCurrency: v.optional(v.string()),
    exchangeRateUsed: v.number(),
    // Amount in local currency
    amountLocal: v.optional(v.number()),
    amountHnl: v.number(), // Legacy parameter
    purpose: v.string(),
    estimatedFuel: v.optional(v.number()),
    estimatedMeals: v.optional(v.number()),
    estimatedLodging: v.optional(v.number()),
    estimatedTolls: v.optional(v.number()),
    estimatedOther: v.optional(v.number()),
    // Detailed breakdown fields
    estimatedFuelGallons: v.optional(v.number()), // Fuel quantity in gallons
    fuelPriceUsed: v.optional(v.number()), // Fuel price at time of creation
    fuelPriceUnit: v.optional(v.string()), // 'gallon' | 'liter' - Unit used for fuel price
    tripDays: v.optional(v.number()), // Number of trip days
    tripNights: v.optional(v.number()), // Number of nights for lodging
    notes: v.optional(v.string()),
    saveAsDraft: v.optional(v.boolean()), // If true, saves as draft instead of pending
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Use local currency amount, fallback to legacy HNL
    const amountLocal = args.amountLocal ?? args.amountHnl;
    const amountUsd = amountLocal / args.exchangeRateUsed;

    // Use draft status if requested, otherwise pending
    const status = args.saveAsDraft ? "draft" : "pending";

    const advanceNumber = await generateAdvanceNumber(ctx, args.tenantId);
    const advanceId = await ctx.db.insert("expenseAdvances", {
      tenantId: args.tenantId,
      itineraryId: args.itineraryId,
      driverId: args.driverId,
      advanceNumber,
      // Currency configuration
      localCurrency: args.localCurrency,
      exchangeRateUsed: args.exchangeRateUsed,
      // Amount in both currencies (frozen)
      amountLocal,
      amountHnl: amountLocal, // Legacy field
      amountUsd,
      purpose: args.purpose,
      estimatedFuel: args.estimatedFuel,
      estimatedMeals: args.estimatedMeals,
      estimatedLodging: args.estimatedLodging,
      estimatedTolls: args.estimatedTolls,
      estimatedOther: args.estimatedOther,
      // Detailed breakdown fields
      estimatedFuelGallons: args.estimatedFuelGallons,
      fuelPriceUsed: args.fuelPriceUsed,
      fuelPriceUnit: args.fuelPriceUnit,
      tripDays: args.tripDays,
      tripNights: args.tripNights,
      notes: args.notes,
      status,
      createdAt: now,
      updatedAt: now,
    });

    return advanceId;
  },
});

// Update expense advance details
export const update = mutation({
  args: {
    id: v.id("expenseAdvances"),
    amountLocal: v.optional(v.number()),
    amountHnl: v.optional(v.number()), // Legacy parameter
    purpose: v.optional(v.string()),
    estimatedFuel: v.optional(v.number()),
    estimatedMeals: v.optional(v.number()),
    estimatedLodging: v.optional(v.number()),
    estimatedTolls: v.optional(v.number()),
    estimatedOther: v.optional(v.number()),
    // Detailed breakdown fields
    estimatedFuelGallons: v.optional(v.number()),
    fuelPriceUsed: v.optional(v.number()),
    fuelPriceUnit: v.optional(v.string()),
    tripDays: v.optional(v.number()),
    tripNights: v.optional(v.number()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, amountLocal, amountHnl, ...updates } = args;
    const advance = await ctx.db.get(id);
    if (!advance) throw new Error("Expense advance not found");

    // Allow updates for draft and pending advances
    if (advance.status !== "draft" && advance.status !== "pending") {
      throw new Error("Can only update draft or pending advances");
    }

    // Recalculate USD if amount changed
    const newAmountLocal = amountLocal ?? amountHnl;
    let amountUsd = advance.amountUsd;
    let finalAmountLocal = advance.amountLocal ?? advance.amountHnl;

    if (newAmountLocal !== undefined) {
      finalAmountLocal = newAmountLocal;
      amountUsd = newAmountLocal / advance.exchangeRateUsed;
    }

    await ctx.db.patch(id, {
      ...updates,
      amountLocal: finalAmountLocal,
      amountHnl: finalAmountLocal, // Legacy field
      amountUsd,
      updatedAt: Date.now(),
    });
  },
});

// Submit draft for approval (draft → pending)
export const submitForApproval = mutation({
  args: {
    id: v.id("expenseAdvances"),
  },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status !== "draft") {
      throw new Error("Can only submit draft advances for approval");
    }

    await ctx.db.patch(args.id, {
      status: "pending",
      updatedAt: Date.now(),
    });
  },
});

// Approve expense advance
export const approve = mutation({
  args: {
    id: v.id("expenseAdvances"),
    approvedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status !== "pending") {
      throw new Error("Can only approve pending advances");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "approved",
      approvedBy: args.approvedBy,
      approvedAt: now,
      updatedAt: now,
    });
  },
});

// Mark as disbursed (money given to driver)
export const disburse = mutation({
  args: {
    id: v.id("expenseAdvances"),
    disbursementMethod: v.optional(v.string()),
    disbursementReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status !== "approved") {
      throw new Error("Can only disburse approved advances");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "disbursed",
      disbursedAt: now,
      disbursementMethod: args.disbursementMethod,
      disbursementReference: args.disbursementReference,
      updatedAt: now,
    });
  },
});

// Settle expense advance (record actual expenses)
export const settle = mutation({
  args: {
    id: v.id("expenseAdvances"),
    actualFuel: v.optional(v.number()),
    actualMeals: v.optional(v.number()),
    actualLodging: v.optional(v.number()),
    actualTolls: v.optional(v.number()),
    actualOther: v.optional(v.number()),
    receiptsCount: v.optional(v.number()),
    settlementNotes: v.optional(v.string()),
    settledBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status !== "disbursed") {
      throw new Error("Can only settle disbursed advances");
    }

    const now = Date.now();

    // Calculate actual expenses (in local currency)
    const actualFuel = args.actualFuel ?? 0;
    const actualMeals = args.actualMeals ?? 0;
    const actualLodging = args.actualLodging ?? 0;
    const actualTolls = args.actualTolls ?? 0;
    const actualOther = args.actualOther ?? 0;
    const actualExpenses = actualFuel + actualMeals + actualLodging + actualTolls + actualOther;

    // Calculate balance: positive = driver owes company, negative = company owes driver
    // Use local currency amount
    const amountLocal = advance.amountLocal ?? advance.amountHnl;
    const balanceAmount = amountLocal - actualExpenses;

    await ctx.db.patch(args.id, {
      status: "settled",
      actualExpenses,
      actualFuel,
      actualMeals,
      actualLodging,
      actualTolls,
      actualOther,
      receiptsCount: args.receiptsCount,
      balanceAmount,
      balanceSettled: false, // Not yet settled financially
      settlementNotes: args.settlementNotes,
      settledAt: now,
      settledBy: args.settledBy,
      updatedAt: now,
    });
  },
});

// Mark balance as settled
export const settleBalance = mutation({
  args: {
    id: v.id("expenseAdvances"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status !== "settled") {
      throw new Error("Can only settle balance of settled advances");
    }

    await ctx.db.patch(args.id, {
      balanceSettled: true,
      settlementNotes: args.notes ?? advance.settlementNotes,
      updatedAt: Date.now(),
    });
  },
});

// Cancel expense advance
export const cancel = mutation({
  args: {
    id: v.id("expenseAdvances"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status === "settled" || advance.status === "cancelled") {
      throw new Error("Cannot cancel settled or already cancelled advances");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "cancelled",
      cancelledAt: now,
      cancellationReason: args.reason,
      updatedAt: now,
    });
  },
});

// Delete expense advance (draft, pending, or cancelled)
export const remove = mutation({
  args: { id: v.id("expenseAdvances") },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    // Allow deleting draft, pending, or cancelled advances
    // Approved, disbursed, and settled advances cannot be deleted (they are financial records)
    const deletableStatuses = ["draft", "pending", "cancelled"];
    if (!deletableStatuses.includes(advance.status)) {
      throw new Error("Only draft, pending, or cancelled advances can be deleted");
    }

    await ctx.db.delete(args.id);
  },
});

// Get statistics for dashboard
export const getStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const advances = await ctx.db
      .query("expenseAdvances")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const draft = advances.filter(a => a.status === "draft");
    const pending = advances.filter(a => a.status === "pending");
    const approved = advances.filter(a => a.status === "approved");
    const disbursed = advances.filter(a => a.status === "disbursed");
    const settled = advances.filter(a => a.status === "settled");
    const unsettledBalances = settled.filter(a => !a.balanceSettled);

    // Use local currency amounts (fallback to HNL for backwards compatibility)
    const totalDisbursed = disbursed.reduce((sum, a) => sum + (a.amountLocal ?? a.amountHnl), 0) +
                          settled.reduce((sum, a) => sum + (a.amountLocal ?? a.amountHnl), 0);

    const totalOutstanding = disbursed.reduce((sum, a) => sum + (a.amountLocal ?? a.amountHnl), 0);

    const totalBalanceOwed = unsettledBalances.reduce((sum, a) => sum + (a.balanceAmount ?? 0), 0);

    return {
      draftCount: draft.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      disbursedCount: disbursed.length,
      settledCount: settled.length,
      unsettledBalancesCount: unsettledBalances.length,
      totalDisbursed, // In local currency
      totalOutstanding, // In local currency
      totalBalanceOwed, // In local currency
    };
  },
});

// Calculate suggested advance from quotation costs
// IMPORTANT: For fuel, we only include the EXTRA fuel needed beyond the vehicle's tank capacity
// The vehicle starts with a full tank, so we only need to advance money for refueling stops
export const calculateSuggestedAdvance = query({
  args: { itineraryId: v.id("itineraries") },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) throw new Error("Itinerary not found");

    // Get the vehicle for tank capacity and fuel efficiency
    let vehicle = null;
    if (itinerary.vehicleId) {
      vehicle = await ctx.db.get(itinerary.vehicleId);
    }

    // Get active parameters for fuel price
    let fuelPrice = 0;
    let fuelPriceUnit: 'gallon' | 'liter' = 'gallon'; // Default to gallon for backward compatibility
    const parameters = await ctx.db
      .query("parameters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", itinerary.tenantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (parameters) {
      fuelPrice = parameters.fuelPrice;
      fuelPriceUnit = (parameters.fuelPriceUnit as 'gallon' | 'liter') || 'gallon';
    }

    // Normalize fuel price to per-gallon for calculations (extraGallons is in gallons)
    // 1 gallon = 3.78541 liters
    const LITERS_PER_GALLON = 3.78541;
    const fuelPricePerGallon = fuelPriceUnit === 'liter'
      ? fuelPrice * LITERS_PER_GALLON
      : fuelPrice;

    // Try to get quotation for cost breakdown (use local currency values)
    let totalFuelCost = 0;
    let mealsCost = 0;
    let lodgingCost = 0;
    let tollCost = 0;
    let localCurrency = itinerary.localCurrency;

    if (itinerary.quotationId) {
      const quotation = await ctx.db.get(itinerary.quotationId);
      if (quotation) {
        // Use local currency values if available, fallback to legacy fields
        const fuelLocal = (quotation.fuelCostLocal ?? quotation.fuelCost) +
                         (quotation.refuelingCostLocal ?? quotation.refuelingCost);
        totalFuelCost = fuelLocal;
        mealsCost = quotation.driverMealsCostLocal ?? quotation.driverMealsCost;
        lodgingCost = quotation.driverLodgingCostLocal ?? quotation.driverLodgingCost;
        tollCost = quotation.tollCostLocal ?? quotation.tollCost;
        localCurrency = quotation.localCurrency ?? localCurrency;
      }
    }

    // Calculate fuel advance: only the EXTRA fuel beyond tank capacity
    // The vehicle starts with a full tank, so we only need to advance for refueling
    let fuelAdvance = 0;
    let tankRange = 0;
    let safeRange = 0;
    let extraFuelNeeded = 0;

    if (vehicle && vehicle.fuelCapacity && vehicle.fuelEfficiency) {
      // Tank capacity with safety threshold (10-15% less than full)
      const safetyThreshold = 0.85; // Use 85% of tank capacity for safety
      const safeTankCapacity = vehicle.fuelCapacity * safetyThreshold;

      // Calculate range on a safe tank
      // fuelEfficiency is in km/gal or km/L depending on fuelEfficiencyUnit
      let fuelEfficiencyKmPerGallon = vehicle.fuelEfficiency;
      if (vehicle.fuelEfficiencyUnit === 'kpl') {
        // Convert km/L to km/gal (1 gal = 3.78541 L)
        fuelEfficiencyKmPerGallon = vehicle.fuelEfficiency * 3.78541;
      }

      // Tank capacity unit (gallons or liters)
      let tankCapacityGallons = vehicle.fuelCapacity;
      if (vehicle.fuelCapacityUnit === 'liters') {
        // Convert liters to gallons
        tankCapacityGallons = vehicle.fuelCapacity / 3.78541;
      }

      // Full tank range
      tankRange = tankCapacityGallons * fuelEfficiencyKmPerGallon;
      // Safe range (with threshold)
      safeRange = (tankCapacityGallons * safetyThreshold) * fuelEfficiencyKmPerGallon;

      // Total trip distance
      const tripDistance = itinerary.totalDistance;

      // Extra fuel needed (if trip is longer than safe range)
      if (tripDistance > safeRange) {
        // Calculate how much extra distance beyond safe range
        const extraDistance = tripDistance - safeRange;
        // Calculate extra fuel needed (in gallons)
        const extraGallons = extraDistance / fuelEfficiencyKmPerGallon;
        // Calculate cost of extra fuel (using normalized price per gallon)
        fuelAdvance = extraGallons * fuelPricePerGallon;
        extraFuelNeeded = extraGallons;
      }
      // If trip is within safe range, no fuel advance needed (starts with full tank)
    } else {
      // No vehicle info available, fall back to total fuel cost
      fuelAdvance = totalFuelCost;
    }

    const totalSuggested = fuelAdvance + mealsCost + lodgingCost + tollCost;

    // Calculate trip days and nights from itinerary
    const tripDays = itinerary.estimatedDays || Math.ceil((itinerary.totalTime || 0) / (8 * 60));
    const tripNights = tripDays > 1 ? tripDays - 1 : 0;

    return {
      // Fuel breakdown
      estimatedFuel: Math.round(fuelAdvance),
      totalFuelCost: Math.round(totalFuelCost), // Total fuel cost for reference
      tankRange: Math.round(tankRange),
      safeRange: Math.round(safeRange),
      extraFuelNeeded: Math.round(extraFuelNeeded * 100) / 100, // Gallons with 2 decimals
      tripDistance: itinerary.totalDistance,
      fuelAdvanceNeeded: fuelAdvance > 0, // Flag to indicate if fuel advance is needed
      // Fuel price details (for detailed breakdown)
      fuelPriceUsed: fuelPrice, // Original fuel price from parameters
      fuelPriceUnit, // 'gallon' | 'liter' - Unit of fuel price
      fuelPricePerGallon, // Normalized price per gallon used in calculation
      // Trip duration (for detailed breakdown)
      tripDays, // Number of trip days
      tripNights, // Number of nights for lodging
      // Other costs
      estimatedMeals: mealsCost,
      estimatedLodging: lodgingCost,
      estimatedTolls: tollCost,
      estimatedOther: 0,
      totalSuggested: Math.round(totalSuggested), // In local currency
      localCurrency,
      exchangeRate: itinerary.exchangeRateUsed,
    };
  },
});
