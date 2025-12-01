import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { canCreateQuotation, isTenantActive } from "./lib/planLimits";

// List all quotations for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quotations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

// List quotations by status
export const byStatus = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quotations")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", args.status)
      )
      .order("desc")
      .collect();
  },
});

// List quotations by client
export const byClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quotations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

// Get a single quotation by ID
export const get = query({
  args: { id: v.id("quotations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Generate next quotation number
async function generateQuotationNumber(ctx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await ctx.db
    .query("quotations")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const thisYearQuotes = existing.filter((q: any) =>
    q.quotationNumber.startsWith(`QT-${year}`)
  );

  const nextNum = thisYearQuotes.length + 1;
  return `QT-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Create a new quotation
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    createdBy: v.optional(v.id("users")),
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    extraMileage: v.number(),
    estimatedDays: v.number(),
    departureDate: v.optional(v.number()),
    isRoundTrip: v.optional(v.boolean()), // true = round trip, false = one-way
    totalDistance: v.number(),
    totalTime: v.number(),
    deadheadDistance: v.optional(v.number()), // Repositioning distance
    mainTripDistance: v.optional(v.number()), // Client trip distance
    // Currency configuration (frozen at creation)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    exchangeRateUsed: v.number(),
    // Cost breakdown - local currency values
    fuelCostLocal: v.optional(v.number()),
    refuelingCostLocal: v.optional(v.number()),
    driverMealsCostLocal: v.optional(v.number()),
    driverLodgingCostLocal: v.optional(v.number()),
    driverIncentiveCostLocal: v.optional(v.number()),
    vehicleDistanceCostLocal: v.optional(v.number()),
    vehicleDailyCostLocal: v.optional(v.number()),
    tollCostLocal: v.optional(v.number()),
    totalCostLocal: v.optional(v.number()),
    // Cost breakdown - USD values
    fuelCostUsd: v.optional(v.number()),
    refuelingCostUsd: v.optional(v.number()),
    driverMealsCostUsd: v.optional(v.number()),
    driverLodgingCostUsd: v.optional(v.number()),
    driverIncentiveCostUsd: v.optional(v.number()),
    vehicleDistanceCostUsd: v.optional(v.number()),
    vehicleDailyCostUsd: v.optional(v.number()),
    tollCostUsd: v.optional(v.number()),
    totalCostUsd: v.optional(v.number()),
    // Legacy cost fields (kept for backwards compatibility)
    fuelCost: v.number(),
    refuelingCost: v.number(),
    driverMealsCost: v.number(),
    driverLodgingCost: v.number(),
    driverIncentiveCost: v.number(),
    vehicleDistanceCost: v.number(),
    vehicleDailyCost: v.number(),
    tollCost: v.number(),
    totalCost: v.number(),
    // Pricing - both currencies
    selectedMarkupPercentage: v.number(),
    salePriceLocal: v.optional(v.number()),
    salePriceHnl: v.number(), // Legacy field
    salePriceUsd: v.number(),
    // Options
    includeFuel: v.boolean(),
    includeMeals: v.boolean(),
    includeTolls: v.boolean(),
    includeDriverIncentive: v.boolean(),
    status: v.string(),
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check tenant status
    const tenantStatus = await isTenantActive(ctx, args.tenantId);
    if (!tenantStatus.active) {
      throw new Error(tenantStatus.message || "Account not active");
    }

    // Check plan limits
    const limitCheck = await canCreateQuotation(ctx, args.tenantId);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || "Quotation limit reached");
    }

    const now = Date.now();
    const quotationNumber = await generateQuotationNumber(ctx, args.tenantId);

    const quotationId = await ctx.db.insert("quotations", {
      ...args,
      quotationNumber,
      createdAt: now,
      updatedAt: now,
    });

    // Increment usage counter
    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (usageRecord) {
      await ctx.db.patch(usageRecord._id, {
        quotationsCreated: (usageRecord.quotationsCreated || 0) + 1,
        updatedAt: now,
      });
    }

    return quotationId;
  },
});

// Update quotation status (simple status change, no workflow triggers)
export const updateStatus = mutation({
  args: {
    id: v.id("quotations"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, notes } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Quotation not found");

    const now = Date.now();
    const updates: Record<string, any> = {
      status,
      updatedAt: now,
    };

    if (notes !== undefined) updates.notes = notes;

    // Set timestamp based on status
    if (status === 'sent') updates.sentAt = now;
    if (status === 'approved') updates.approvedAt = now;
    if (status === 'rejected') updates.rejectedAt = now;

    await ctx.db.patch(id, updates);
    return id;
  },
});

// ============================================================
// APPROVAL WORKFLOW
// ============================================================

/**
 * Approve a quotation with optional automatic itinerary and invoice creation
 *
 * This is the main approval endpoint that triggers the sales workflow:
 * 1. Updates quotation status to 'approved'
 * 2. Creates notification for staff
 * 3. Optionally creates itinerary (based on tenant settings)
 * 4. Optionally creates invoice (based on tenant settings - prepayment model)
 * 5. Cancels any pending follow-up reminders
 */
export const approve = mutation({
  args: {
    id: v.id("quotations"),
    // Optional overrides for automatic creation (overrides tenant settings)
    createItinerary: v.optional(v.boolean()),
    createInvoice: v.optional(v.boolean()),
    // Itinerary details (required if creating itinerary)
    startDate: v.optional(v.number()),
    vehicleId: v.optional(v.id("vehicles")),
    driverId: v.optional(v.id("drivers")),
    // Invoice details (required if creating invoice)
    paymentTermsDays: v.optional(v.number()), // Days until due date, defaults to tenant setting
  },
  handler: async (ctx, args) => {
    const { id, createItinerary, createInvoice, startDate, vehicleId, driverId, paymentTermsDays } = args;
    const now = Date.now();

    // Get the quotation
    const quotation = await ctx.db.get(id);
    if (!quotation) throw new Error("Quotation not found");
    if (quotation.status === "approved") throw new Error("Quotation already approved");
    if (quotation.status === "expired") throw new Error("Cannot approve expired quotation");

    // Get tenant settings
    const currentYear = new Date().getFullYear();
    const parameters = await ctx.db
      .query("parameters")
      .withIndex("by_tenant_year", (q) =>
        q.eq("tenantId", quotation.tenantId).eq("year", currentYear)
      )
      .first();

    // Determine whether to create itinerary and invoice
    const shouldCreateItinerary = createItinerary ?? parameters?.autoCreateItinerary ?? false;
    const shouldCreateInvoice = createInvoice ?? parameters?.autoCreateInvoice ?? true; // Default to prepayment

    // Update quotation status
    await ctx.db.patch(id, {
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    });

    // Get client info for notifications
    let clientName = "Cliente";
    if (quotation.clientId) {
      const client = await ctx.db.get(quotation.clientId);
      if (client) {
        clientName =
          client.type === "company"
            ? client.companyName || "Empresa"
            : `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Cliente";
      }
    }

    // Create approval notification
    await ctx.runMutation(internal.notifications.createQuotationApproved, {
      tenantId: quotation.tenantId,
      quotationId: id,
      quotationNumber: quotation.quotationNumber,
      clientName,
    });

    // Cancel pending follow-up reminders
    await ctx.runMutation(internal.reminders.cancelReminders, {
      entityType: "quotation",
      entityId: id as string,
      reason: "Quotation approved",
    });

    let itineraryId: string | undefined;
    let invoiceId: string | undefined;

    // Create itinerary if requested
    if (shouldCreateItinerary) {
      if (!startDate) {
        throw new Error("Start date is required when creating itinerary");
      }

      // Generate itinerary number
      const itineraryNumber = await generateItineraryNumber(ctx, quotation.tenantId);

      itineraryId = await ctx.db.insert("itineraries", {
        tenantId: quotation.tenantId,
        itineraryNumber,
        quotationId: id,
        clientId: quotation.clientId,
        vehicleId: vehicleId || quotation.vehicleId,
        driverId,
        createdBy: quotation.createdBy,
        origin: quotation.origin,
        destination: quotation.destination,
        baseLocation: quotation.baseLocation,
        groupSize: quotation.groupSize,
        totalDistance: quotation.totalDistance,
        totalTime: quotation.totalTime,
        startDate,
        estimatedDays: quotation.estimatedDays,
        localCurrency: quotation.localCurrency,
        agreedPriceLocal: quotation.salePriceLocal,
        agreedPriceHnl: quotation.salePriceHnl,
        agreedPriceUsd: quotation.salePriceUsd,
        exchangeRateUsed: quotation.exchangeRateUsed,
        status: "scheduled",
        createdAt: now,
        updatedAt: now,
      });

      // Create itinerary notification
      const startDateStr = new Date(startDate).toLocaleDateString("es-HN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      await ctx.runMutation(internal.notifications.createItineraryCreated, {
        tenantId: quotation.tenantId,
        itineraryId,
        itineraryNumber,
        clientName,
        startDate: startDateStr,
      });
    }

    // Create invoice if requested (prepayment model)
    if (shouldCreateInvoice) {
      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(ctx, quotation.tenantId);

      // Calculate due date based on payment terms
      const termsDays = paymentTermsDays ?? parameters?.prepaymentDays ?? 7;
      const dueDate = now + termsDays * 24 * 60 * 60 * 1000;

      // Generate service description
      const vehicle = quotation.vehicleId ? await ctx.db.get(quotation.vehicleId) : null;
      const serviceDescription = generateServiceDescription(quotation, vehicle);

      // Calculate tax based on tenant settings
      const taxPercentage = parameters?.isTransportTaxable ? (parameters?.taxPercentage ?? 15) : 0;
      const subtotalLocal = quotation.salePriceLocal || quotation.salePriceHnl;
      const subtotalUsd = quotation.salePriceUsd;
      const taxAmountLocal = subtotalLocal * (taxPercentage / 100);
      const taxAmountUsd = subtotalUsd * (taxPercentage / 100);
      const totalLocal = subtotalLocal + taxAmountLocal;
      const totalUsd = subtotalUsd + taxAmountUsd;

      // Create line items
      const lineItems = [
        {
          description: serviceDescription,
          quantity: 1,
          unitPriceLocal: subtotalLocal,
          unitPriceUsd: subtotalUsd,
          totalLocal: subtotalLocal,
          totalUsd: subtotalUsd,
        },
      ];

      invoiceId = await ctx.db.insert("invoices", {
        tenantId: quotation.tenantId,
        invoiceNumber,
        quotationId: id,
        itineraryId,
        clientId: quotation.clientId,
        createdBy: quotation.createdBy,
        invoiceDate: now,
        dueDate,
        localCurrency: quotation.localCurrency,
        exchangeRateUsed: quotation.exchangeRateUsed,
        lineItems,
        serviceDescription,
        description: `${quotation.origin} → ${quotation.destination}`,
        subtotalLocal,
        subtotalHnl: quotation.salePriceHnl,
        subtotalUsd,
        taxPercentage,
        taxAmountLocal,
        taxAmountHnl: quotation.salePriceHnl * (taxPercentage / 100),
        taxAmountUsd,
        totalLocal,
        totalHnl: quotation.salePriceHnl * (1 + taxPercentage / 100),
        totalUsd,
        amountPaid: 0,
        amountDue: totalLocal,
        paymentStatus: "unpaid",
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });

      // Link invoice to itinerary if created
      if (itineraryId) {
        await ctx.db.patch(itineraryId, { invoiceId });
      }

      // Create invoice notification
      await ctx.db.insert("notifications", {
        tenantId: quotation.tenantId,
        type: "invoice_created",
        priority: "low",
        title: `Factura Creada: ${invoiceNumber}`,
        message: `Se ha creado la factura ${invoiceNumber} para ${clientName} basada en la cotización aprobada.`,
        entityType: "invoice",
        entityId: invoiceId as string,
        channels: ["in_app"],
        read: false,
        actionUrl: `/invoices/${invoiceId}`,
        createdAt: now,
      });
    }

    return {
      quotationId: id,
      itineraryId,
      invoiceId,
      message: "Quotation approved successfully",
    };
  },
});

/**
 * Reject a quotation
 */
export const reject = mutation({
  args: {
    id: v.id("quotations"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, reason } = args;
    const now = Date.now();

    const quotation = await ctx.db.get(id);
    if (!quotation) throw new Error("Quotation not found");
    if (quotation.status === "approved") throw new Error("Cannot reject approved quotation");

    await ctx.db.patch(id, {
      status: "rejected",
      rejectedAt: now,
      internalNotes: reason
        ? `${quotation.internalNotes || ""}\n[${new Date().toISOString()}] Rejected: ${reason}`.trim()
        : quotation.internalNotes,
      updatedAt: now,
    });

    // Cancel pending follow-up reminders
    await ctx.runMutation(internal.reminders.cancelReminders, {
      entityType: "quotation",
      entityId: id as string,
      reason: "Quotation rejected",
    });

    // Get client name for notification
    let clientName = "Cliente";
    if (quotation.clientId) {
      const client = await ctx.db.get(quotation.clientId);
      if (client) {
        clientName =
          client.type === "company"
            ? client.companyName || "Empresa"
            : `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Cliente";
      }
    }

    // Create rejection notification
    await ctx.db.insert("notifications", {
      tenantId: quotation.tenantId,
      type: "quotation_rejected",
      priority: "medium",
      title: `Cotización Rechazada: ${quotation.quotationNumber}`,
      message: `${clientName} ha rechazado la cotización ${quotation.quotationNumber}.${reason ? ` Razón: ${reason}` : ""}`,
      entityType: "quotation",
      entityId: id as string,
      channels: ["in_app"],
      read: false,
      actionUrl: `/quotations/${id}`,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Mark quotation as sent and schedule follow-up reminders
 */
export const markSent = mutation({
  args: {
    id: v.id("quotations"),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, validUntil } = args;
    const now = Date.now();

    const quotation = await ctx.db.get(id);
    if (!quotation) throw new Error("Quotation not found");
    if (quotation.status !== "draft") throw new Error("Only draft quotations can be sent");

    // Get tenant settings for default validity period
    const currentYear = new Date().getFullYear();
    const parameters = await ctx.db
      .query("parameters")
      .withIndex("by_tenant_year", (q) =>
        q.eq("tenantId", quotation.tenantId).eq("year", currentYear)
      )
      .first();

    // Calculate validUntil if not provided
    const validityDays = parameters?.quotationValidityDays ?? 30;
    const calculatedValidUntil = validUntil || now + validityDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(id, {
      status: "sent",
      sentAt: now,
      validUntil: calculatedValidUntil,
      updatedAt: now,
    });

    // Schedule follow-up reminders
    await ctx.runMutation(internal.reminders.scheduleQuotationReminders, {
      quotationId: id,
      tenantId: quotation.tenantId,
      sentAt: now,
    });

    return { success: true, validUntil: calculatedValidUntil };
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate next itinerary number for a tenant
 */
async function generateItineraryNumber(ctx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await ctx.db
    .query("itineraries")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const thisYearItineraries = existing.filter((i: any) =>
    i.itineraryNumber.startsWith(`IT-${year}`)
  );

  const nextNum = thisYearItineraries.length + 1;
  return `IT-${year}-${String(nextNum).padStart(4, "0")}`;
}

/**
 * Generate next invoice number for a tenant
 */
async function generateInvoiceNumber(ctx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await ctx.db
    .query("invoices")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const thisYearInvoices = existing.filter((i: any) =>
    i.invoiceNumber.startsWith(`INV-${year}`)
  );

  const nextNum = thisYearInvoices.length + 1;
  return `INV-${year}-${String(nextNum).padStart(4, "0")}`;
}

/**
 * Generate natural language service description for invoice
 */
function generateServiceDescription(
  quotation: any,
  vehicle: any | null
): string {
  const parts: string[] = [];

  // Main service line
  parts.push(`Servicio de transporte ${quotation.origin} - ${quotation.destination}`);

  // Date if available
  if (quotation.departureDate) {
    const date = new Date(quotation.departureDate);
    const dateStr = date.toLocaleDateString("es-HN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    parts.push(`Fecha: ${dateStr}`);
  }

  // Vehicle info
  if (vehicle) {
    const vehicleInfo = vehicle.name || `${vehicle.make || ""} ${vehicle.model || ""}`.trim();
    parts.push(`Vehículo: ${vehicleInfo} (${vehicle.passengerCapacity} pasajeros)`);
  }

  // Distance and duration
  const distanceKm = Math.round(quotation.totalDistance);
  parts.push(`Distancia: ${distanceKm} km, Duración estimada: ${quotation.estimatedDays} día${quotation.estimatedDays > 1 ? "s" : ""}`);

  // Included services
  const included: string[] = [];
  if (quotation.includeFuel) included.push("combustible");
  if (quotation.includeTolls) included.push("peajes");
  if (quotation.includeMeals) included.push("viáticos del conductor");
  if (quotation.includeDriverIncentive) included.push("incentivo del conductor");

  if (included.length > 0) {
    parts.push(`Incluye: ${included.join(", ")}`);
  }

  return parts.join(". ");
}

// Update quotation details
export const update = mutation({
  args: {
    id: v.id("quotations"),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    origin: v.optional(v.string()),
    destination: v.optional(v.string()),
    baseLocation: v.optional(v.string()),
    groupSize: v.optional(v.number()),
    extraMileage: v.optional(v.number()),
    estimatedDays: v.optional(v.number()),
    departureDate: v.optional(v.number()),
    totalDistance: v.optional(v.number()),
    totalTime: v.optional(v.number()),
    // Currency configuration
    localCurrency: v.optional(v.string()),
    exchangeRateUsed: v.optional(v.number()),
    // Cost breakdown - local currency
    fuelCostLocal: v.optional(v.number()),
    refuelingCostLocal: v.optional(v.number()),
    driverMealsCostLocal: v.optional(v.number()),
    driverLodgingCostLocal: v.optional(v.number()),
    driverIncentiveCostLocal: v.optional(v.number()),
    vehicleDistanceCostLocal: v.optional(v.number()),
    vehicleDailyCostLocal: v.optional(v.number()),
    tollCostLocal: v.optional(v.number()),
    totalCostLocal: v.optional(v.number()),
    // Cost breakdown - USD
    fuelCostUsd: v.optional(v.number()),
    refuelingCostUsd: v.optional(v.number()),
    driverMealsCostUsd: v.optional(v.number()),
    driverLodgingCostUsd: v.optional(v.number()),
    driverIncentiveCostUsd: v.optional(v.number()),
    vehicleDistanceCostUsd: v.optional(v.number()),
    vehicleDailyCostUsd: v.optional(v.number()),
    tollCostUsd: v.optional(v.number()),
    totalCostUsd: v.optional(v.number()),
    // Legacy cost fields
    fuelCost: v.optional(v.number()),
    refuelingCost: v.optional(v.number()),
    driverMealsCost: v.optional(v.number()),
    driverLodgingCost: v.optional(v.number()),
    driverIncentiveCost: v.optional(v.number()),
    vehicleDistanceCost: v.optional(v.number()),
    vehicleDailyCost: v.optional(v.number()),
    tollCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    // Pricing
    selectedMarkupPercentage: v.optional(v.number()),
    salePriceLocal: v.optional(v.number()),
    salePriceHnl: v.optional(v.number()),
    salePriceUsd: v.optional(v.number()),
    // Options
    includeFuel: v.optional(v.boolean()),
    includeMeals: v.optional(v.boolean()),
    includeTolls: v.optional(v.boolean()),
    includeDriverIncentive: v.optional(v.boolean()),
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    pdfGeneratedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Quotation not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete a quotation (only drafts)
export const remove = mutation({
  args: { id: v.id("quotations") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Quotation not found");
    if (existing.status !== 'draft') {
      throw new Error("Only draft quotations can be deleted");
    }
    await ctx.db.delete(args.id);
  },
});
