import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Generate advance number
function generateAdvanceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ADV-${year}-${random}`;
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
export const getByItinerary = query({
  args: { itineraryId: v.id("itineraries") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expenseAdvances")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .first();
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
    purpose: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) throw new Error("Itinerary not found");

    // Check if advance already exists for this itinerary
    const existingAdvance = await ctx.db
      .query("expenseAdvances")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .first();

    if (existingAdvance) {
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

    const advanceId = await ctx.db.insert("expenseAdvances", {
      tenantId: itinerary.tenantId,
      advanceNumber: generateAdvanceNumber(),
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
      status: "pending",
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Use local currency amount, fallback to legacy HNL
    const amountLocal = args.amountLocal ?? args.amountHnl;
    const amountUsd = amountLocal / args.exchangeRateUsed;

    const advanceId = await ctx.db.insert("expenseAdvances", {
      tenantId: args.tenantId,
      itineraryId: args.itineraryId,
      driverId: args.driverId,
      advanceNumber: generateAdvanceNumber(),
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
      notes: args.notes,
      status: "pending",
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
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, amountLocal, amountHnl, ...updates } = args;
    const advance = await ctx.db.get(id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status !== "pending") {
      throw new Error("Can only update pending advances");
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

// Delete expense advance (only pending)
export const remove = mutation({
  args: { id: v.id("expenseAdvances") },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new Error("Expense advance not found");

    if (advance.status !== "pending") {
      throw new Error("Only pending advances can be deleted");
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
export const calculateSuggestedAdvance = query({
  args: { itineraryId: v.id("itineraries") },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) throw new Error("Itinerary not found");

    // Try to get quotation for cost breakdown (use local currency values)
    let fuelCost = 0;
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
        fuelCost = fuelLocal;
        mealsCost = quotation.driverMealsCostLocal ?? quotation.driverMealsCost;
        lodgingCost = quotation.driverLodgingCostLocal ?? quotation.driverLodgingCost;
        tollCost = quotation.tollCostLocal ?? quotation.tollCost;
        localCurrency = quotation.localCurrency ?? localCurrency;
      }
    }

    const totalSuggested = fuelCost + mealsCost + lodgingCost + tollCost;

    return {
      estimatedFuel: fuelCost,
      estimatedMeals: mealsCost,
      estimatedLodging: lodgingCost,
      estimatedTolls: tollCost,
      estimatedOther: 0,
      totalSuggested, // In local currency
      localCurrency,
      exchangeRate: itinerary.exchangeRateUsed,
    };
  },
});
