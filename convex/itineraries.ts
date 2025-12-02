import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// List all itineraries for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

// List itineraries by status
export const byStatus = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", args.status)
      )
      .order("desc")
      .collect();
  },
});

// List itineraries by driver
export const byDriver = query({
  args: { driverId: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .order("desc")
      .collect();
  },
});

// List upcoming itineraries (scheduled, starting within date range)
export const upcoming = query({
  args: {
    tenantId: v.id("tenants"),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fromDate = args.fromDate || now;
    const toDate = args.toDate || now + (30 * 24 * 60 * 60 * 1000); // 30 days default

    const itineraries = await ctx.db
      .query("itineraries")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return itineraries
      .filter(i =>
        i.status === 'scheduled' &&
        i.startDate >= fromDate &&
        i.startDate <= toDate
      )
      .sort((a, b) => a.startDate - b.startDate);
  },
});

// Get a single itinerary by ID
export const get = query({
  args: { id: v.id("itineraries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get itinerary by quotation ID
export const byQuotation = query({
  args: { quotationId: v.id("quotations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("itineraries")
      .withIndex("by_quotation", (q) => q.eq("quotationId", args.quotationId))
      .first();
  },
});

// Document naming convention: YYMM-I#####-CODE-Leader_x_Pax
// Example: 2512-I00005-HOTR-Carlos_Perez_x_08

interface ItineraryNumberParts {
  itineraryNumber: string;
  itineraryLongName: string;
  sequence: number;
}

// Generate YYMM prefix from current date
function getYYMMPrefix(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

// Sanitize group leader name for document naming
function sanitizeLeaderName(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'Grupo';
  return name
    .trim()
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 25);
}

// Get next sequence number for itineraries
async function getNextItinerarySequence(ctx: any, tenantId: string): Promise<number> {
  const existing = await ctx.db
    .query("itineraries")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  let maxSeq = 0;
  for (const i of existing) {
    if (i.itinerarySequence && i.itinerarySequence > maxSeq) {
      maxSeq = i.itinerarySequence;
    }
    // Parse from new format 2512-I00005
    const match = i.itineraryNumber?.match(/^\d{4}-I(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
    // Parse from legacy format IT-YYYY-NNNN
    const legacyMatch = i.itineraryNumber?.match(/^IT-\d{4}-(\d+)/);
    if (legacyMatch) {
      const num = parseInt(legacyMatch[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  return maxSeq + 1;
}

// Generate itinerary number in new format
async function generateItineraryNumber(
  ctx: any,
  tenantId: string,
  clientCode: string | null,
  groupLeaderName: string | null,
  groupSize: number
): Promise<ItineraryNumberParts> {
  const sequence = await getNextItinerarySequence(ctx, tenantId);
  const paddedSeq = String(sequence).padStart(5, '0');
  const yymmPrefix = getYYMMPrefix();
  const code = clientCode || '';
  const leaderPart = sanitizeLeaderName(groupLeaderName);
  const groupSizePadded = String(groupSize).padStart(2, '0');

  // Short number: 2512-I00005
  const itineraryNumber = `${yymmPrefix}-I${paddedSeq}`;

  // Long name: 2512-I00005-HOTR-Carlos_Perez_x_08
  const longNameParts = [itineraryNumber];
  if (code) longNameParts.push(code);
  longNameParts.push(`${leaderPart}_x_${groupSizePadded}`);
  const itineraryLongName = longNameParts.join('-');

  return { itineraryNumber, itineraryLongName, sequence };
}

// Legacy function for backwards compatibility
async function generateItineraryNumberLegacy(ctx: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await ctx.db
    .query("itineraries")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const thisYearItineraries = existing.filter((i: any) =>
    i.itineraryNumber.startsWith(`IT-${year}`)
  );

  const nextNum = thisYearItineraries.length + 1;
  return `IT-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Create itinerary from approved quotation
export const createFromQuotation = mutation({
  args: {
    quotationId: v.id("quotations"),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    driverId: v.optional(v.id("drivers")),
    vehicleId: v.optional(v.id("vehicles")),
    pickupLocation: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffLocation: v.optional(v.string()),
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the quotation
    const quotation = await ctx.db.get(args.quotationId);
    if (!quotation) throw new Error("Quotation not found");
    if (quotation.status !== 'approved') {
      throw new Error("Only approved quotations can be converted to itineraries");
    }

    // Check if itinerary already exists for this quotation
    const existing = await ctx.db
      .query("itineraries")
      .withIndex("by_quotation", (q) => q.eq("quotationId", args.quotationId))
      .first();
    if (existing) {
      throw new Error("An itinerary already exists for this quotation");
    }

    const now = Date.now();

    // Get client code if available
    let clientCode: string | null = null;
    if (quotation.clientId) {
      const client = await ctx.db.get(quotation.clientId);
      if (client?.clientCode) {
        clientCode = client.clientCode;
      }
    }

    // Generate itinerary number with new format
    const { itineraryNumber, itineraryLongName, sequence } = await generateItineraryNumber(
      ctx,
      quotation.tenantId,
      clientCode,
      quotation.groupLeaderName || null,
      quotation.groupSize
    );

    // Use quotation's vehicle if not specified
    const vehicleId = args.vehicleId || quotation.vehicleId;

    return await ctx.db.insert("itineraries", {
      tenantId: quotation.tenantId,
      itineraryNumber,
      itineraryLongName,
      itinerarySequence: sequence,
      quotationId: args.quotationId,
      clientId: quotation.clientId,
      vehicleId,
      driverId: args.driverId,
      createdBy: quotation.createdBy,
      // Copy trip details from quotation
      origin: quotation.origin,
      destination: quotation.destination,
      baseLocation: quotation.baseLocation,
      groupSize: quotation.groupSize,
      totalDistance: quotation.totalDistance,
      totalTime: quotation.totalTime,
      // Schedule
      startDate: args.startDate,
      endDate: args.endDate,
      estimatedDays: quotation.estimatedDays,
      // Pickup/Dropoff
      pickupLocation: args.pickupLocation || quotation.origin,
      pickupTime: args.pickupTime,
      pickupNotes: args.pickupNotes,
      dropoffLocation: args.dropoffLocation || quotation.destination,
      dropoffTime: args.dropoffTime,
      dropoffNotes: args.dropoffNotes,
      // Pricing - copy frozen values from quotation
      localCurrency: quotation.localCurrency,
      agreedPriceLocal: quotation.salePriceLocal,
      agreedPriceHnl: quotation.salePriceHnl, // Legacy field
      agreedPriceUsd: quotation.salePriceUsd,
      exchangeRateUsed: quotation.exchangeRateUsed,
      // Status
      status: 'scheduled',
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create itinerary manually (without quotation)
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    driverId: v.optional(v.id("drivers")),
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    groupLeaderName: v.optional(v.string()), // For document naming
    totalDistance: v.number(),
    totalTime: v.number(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    estimatedDays: v.number(),
    pickupLocation: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffLocation: v.optional(v.string()),
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    // Pricing - frozen at creation (both currencies)
    localCurrency: v.optional(v.string()), // 'HNL', 'GTQ', etc.
    agreedPriceLocal: v.optional(v.number()),
    agreedPriceHnl: v.number(), // Legacy field
    agreedPriceUsd: v.number(),
    exchangeRateUsed: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get client code if available
    let clientCode: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client?.clientCode) {
        clientCode = client.clientCode;
      }
    }

    // Generate itinerary number with new format
    const { itineraryNumber, itineraryLongName, sequence } = await generateItineraryNumber(
      ctx,
      args.tenantId,
      clientCode,
      args.groupLeaderName || null,
      args.groupSize
    );

    return await ctx.db.insert("itineraries", {
      ...args,
      itineraryNumber,
      itineraryLongName,
      itinerarySequence: sequence,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update itinerary
export const update = mutation({
  args: {
    id: v.id("itineraries"),
    vehicleId: v.optional(v.id("vehicles")),
    driverId: v.optional(v.id("drivers")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    pickupLocation: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffLocation: v.optional(v.string()),
    dropoffTime: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    routeLink: v.optional(v.string()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Itinerary not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Update itinerary status
export const updateStatus = mutation({
  args: {
    id: v.id("itineraries"),
    status: v.string(),
    cancellationReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, cancellationReason } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Itinerary not found");

    const now = Date.now();
    const updates: Record<string, any> = {
      status,
      updatedAt: now,
    };

    // Set timestamp based on status
    if (status === 'in_progress') updates.startedAt = now;
    if (status === 'completed') updates.completedAt = now;
    if (status === 'cancelled') {
      updates.cancelledAt = now;
      if (cancellationReason) updates.cancellationReason = cancellationReason;
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Assign driver to itinerary
export const assignDriver = mutation({
  args: {
    id: v.id("itineraries"),
    driverId: v.id("drivers"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Itinerary not found");

    await ctx.db.patch(args.id, {
      driverId: args.driverId,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Assign vehicle to itinerary
export const assignVehicle = mutation({
  args: {
    id: v.id("itineraries"),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Itinerary not found");

    await ctx.db.patch(args.id, {
      vehicleId: args.vehicleId,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Delete itinerary (only scheduled)
export const remove = mutation({
  args: { id: v.id("itineraries") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Itinerary not found");
    if (existing.status !== 'scheduled') {
      throw new Error("Only scheduled itineraries can be deleted. Cancel instead.");
    }
    await ctx.db.delete(args.id);
  },
});

// Check vehicle availability for a date range
export const checkVehicleAvailability = query({
  args: {
    vehicleId: v.id("vehicles"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { vehicleId, startDate, endDate } = args;

    // Get all itineraries for this vehicle that are not cancelled or completed
    const itineraries = await ctx.db
      .query("itineraries")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
      .collect();

    // Filter for active itineraries (scheduled or in_progress)
    const activeItineraries = itineraries.filter(
      (i) => i.status === 'scheduled' || i.status === 'in_progress'
    );

    // Check for overlapping date ranges
    const conflicts = activeItineraries.filter((i) => {
      const itineraryStart = i.startDate;
      const itineraryEnd = i.endDate || (i.startDate + (i.estimatedDays * 24 * 60 * 60 * 1000));

      // Check if date ranges overlap
      return !(endDate < itineraryStart || startDate > itineraryEnd);
    });

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map((c) => ({
        id: c._id,
        itineraryNumber: c.itineraryNumber,
        startDate: c.startDate,
        endDate: c.endDate,
        destination: c.destination,
      })),
    };
  },
});

// Get unavailable vehicles for a date range (for filtering in quotation form)
export const getUnavailableVehicles = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { tenantId, startDate, endDate } = args;

    // Get all itineraries for this tenant that are scheduled or in_progress
    const itineraries = await ctx.db
      .query("itineraries")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const activeItineraries = itineraries.filter(
      (i) => i.status === 'scheduled' || i.status === 'in_progress'
    );

    // Find vehicles with overlapping bookings
    const unavailableVehicleIds: string[] = [];

    for (const itinerary of activeItineraries) {
      if (!itinerary.vehicleId) continue;

      const itineraryStart = itinerary.startDate;
      const itineraryEnd = itinerary.endDate || (itinerary.startDate + (itinerary.estimatedDays * 24 * 60 * 60 * 1000));

      // Check if date ranges overlap
      const overlaps = !(endDate < itineraryStart || startDate > itineraryEnd);

      if (overlaps && !unavailableVehicleIds.includes(itinerary.vehicleId)) {
        unavailableVehicleIds.push(itinerary.vehicleId);
      }
    }

    return unavailableVehicleIds;
  },
});

// ============================================================
// TRIP DETAILS & CLIENT PORTAL
// ============================================================

/**
 * Generate a secure random token for client portal access
 */
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate client access link (magic link for trip details portal)
 */
export const generateClientAccessLink = mutation({
  args: {
    itineraryId: v.id("itineraries"),
    email: v.optional(v.string()),
    expiryDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { itineraryId, expiryDays = 7 } = args;
    const now = Date.now();

    const itinerary = await ctx.db.get(itineraryId);
    if (!itinerary) throw new Error("Itinerary not found");

    // Get client email if not provided
    let email = args.email;
    if (!email && itinerary.clientId) {
      const client = await ctx.db.get(itinerary.clientId);
      email = client?.email;
    }
    if (!email) {
      throw new Error("Client email is required to generate access link");
    }

    // Generate new token
    const token = generateSecureToken();
    const expiresAt = now + expiryDays * 24 * 60 * 60 * 1000;

    // Revoke any existing active tokens for this itinerary
    const existingTokens = await ctx.db
      .query("clientAccessTokens")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", itineraryId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const existingToken of existingTokens) {
      await ctx.db.patch(existingToken._id, {
        status: "revoked",
        revokedAt: now,
        revokeReason: "New token generated",
      });
    }

    // Create new token record
    const tokenId = await ctx.db.insert("clientAccessTokens", {
      tenantId: itinerary.tenantId,
      itineraryId,
      clientId: itinerary.clientId,
      token,
      email,
      expiresAt,
      status: "active",
      createdAt: now,
    });

    // Update itinerary with token reference
    await ctx.db.patch(itineraryId, {
      clientAccessToken: token,
      clientAccessExpiresAt: expiresAt,
      updatedAt: now,
    });

    return {
      token,
      tokenId,
      expiresAt,
      portalUrl: `/portal/${token}`,
    };
  },
});

/**
 * Get itinerary by client access token (public query for portal)
 */
export const getByClientToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the token
    const tokenRecord = await ctx.db
      .query("clientAccessTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenRecord) {
      return { error: "invalid_token", message: "Token inválido o no encontrado" };
    }

    if (tokenRecord.status !== "active") {
      return { error: "token_revoked", message: "Este enlace ha sido revocado" };
    }

    if (tokenRecord.expiresAt < now) {
      return { error: "token_expired", message: "Este enlace ha expirado" };
    }

    // Get the itinerary
    const itinerary = await ctx.db.get(tokenRecord.itineraryId);
    if (!itinerary) {
      return { error: "itinerary_not_found", message: "Itinerario no encontrado" };
    }

    // Get client info
    let client = null;
    if (itinerary.clientId) {
      client = await ctx.db.get(itinerary.clientId);
    }

    // Get vehicle info
    let vehicle = null;
    if (itinerary.vehicleId) {
      vehicle = await ctx.db.get(itinerary.vehicleId);
    }

    // Get tenant info for branding
    const tenant = await ctx.db.get(itinerary.tenantId);

    // Return limited itinerary data for client portal
    return {
      success: true,
      itinerary: {
        _id: itinerary._id,
        itineraryNumber: itinerary.itineraryNumber,
        origin: itinerary.origin,
        destination: itinerary.destination,
        startDate: itinerary.startDate,
        estimatedDays: itinerary.estimatedDays,
        groupSize: itinerary.groupSize,
        pickupTime: itinerary.pickupTime,
        // Existing trip details (if already filled)
        tripLeaderName: itinerary.tripLeaderName,
        tripLeaderPhone: itinerary.tripLeaderPhone,
        tripLeaderEmail: itinerary.tripLeaderEmail,
        pickupExactAddress: itinerary.pickupExactAddress,
        dropoffExactAddress: itinerary.dropoffExactAddress,
        detailsCompletedAt: itinerary.detailsCompletedAt,
      },
      client: client
        ? {
            name:
              client.type === "company"
                ? client.companyName
                : `${client.firstName || ""} ${client.lastName || ""}`.trim(),
            email: client.email,
          }
        : null,
      vehicle: vehicle
        ? {
            name: vehicle.name,
            make: vehicle.make,
            model: vehicle.model,
            passengerCapacity: vehicle.passengerCapacity,
          }
        : null,
      tenant: tenant
        ? {
            companyName: tenant.companyName,
            logoUrl: tenant.logoUrl,
          }
        : null,
    };
  },
});

/**
 * Update trip details from client portal
 */
export const updateTripDetails = mutation({
  args: {
    token: v.string(),
    tripLeaderName: v.string(),
    tripLeaderPhone: v.string(),
    tripLeaderEmail: v.optional(v.string()),
    pickupExactAddress: v.string(),
    dropoffExactAddress: v.string(),
    // Optional coordinates (if geocoded client-side)
    pickupCoordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    dropoffCoordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const {
      token,
      tripLeaderName,
      tripLeaderPhone,
      tripLeaderEmail,
      pickupExactAddress,
      dropoffExactAddress,
      pickupCoordinates,
      dropoffCoordinates,
    } = args;
    const now = Date.now();

    // Find and validate token
    const tokenRecord = await ctx.db
      .query("clientAccessTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord) {
      throw new Error("Token inválido");
    }
    if (tokenRecord.status !== "active") {
      throw new Error("Este enlace ha sido revocado");
    }
    if (tokenRecord.expiresAt < now) {
      throw new Error("Este enlace ha expirado");
    }

    // Get the itinerary
    const itinerary = await ctx.db.get(tokenRecord.itineraryId);
    if (!itinerary) {
      throw new Error("Itinerario no encontrado");
    }

    // Generate map URLs from coordinates or addresses
    const pickupGoogleMapsUrl = pickupCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${pickupCoordinates.lat},${pickupCoordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupExactAddress)}`;

    const pickupWazeUrl = pickupCoordinates
      ? `https://waze.com/ul?ll=${pickupCoordinates.lat},${pickupCoordinates.lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(pickupExactAddress)}&navigate=yes`;

    const dropoffGoogleMapsUrl = dropoffCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${dropoffCoordinates.lat},${dropoffCoordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropoffExactAddress)}`;

    const dropoffWazeUrl = dropoffCoordinates
      ? `https://waze.com/ul?ll=${dropoffCoordinates.lat},${dropoffCoordinates.lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(dropoffExactAddress)}&navigate=yes`;

    // Update itinerary with trip details
    await ctx.db.patch(itinerary._id, {
      tripLeaderName,
      tripLeaderPhone,
      tripLeaderEmail,
      pickupExactAddress,
      pickupCoordinates,
      pickupGoogleMapsUrl,
      pickupWazeUrl,
      dropoffExactAddress,
      dropoffCoordinates,
      dropoffGoogleMapsUrl,
      dropoffWazeUrl,
      detailsCompletedAt: now,
      detailsCompletedBy: "client",
      updatedAt: now,
    });

    // Mark token as used
    await ctx.db.patch(tokenRecord._id, {
      usedAt: tokenRecord.usedAt || now,
      lastUsedAt: now,
      useCount: (tokenRecord.useCount || 0) + 1,
    });

    // Get client name for notification
    let clientName = "Cliente";
    if (itinerary.clientId) {
      const client = await ctx.db.get(itinerary.clientId);
      if (client) {
        clientName =
          client.type === "company"
            ? client.companyName || "Empresa"
            : `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Cliente";
      }
    }

    // Create notification for staff
    await ctx.runMutation(internal.notifications.createTripDetailsCompleted, {
      tenantId: itinerary.tenantId,
      itineraryId: itinerary._id,
      itineraryNumber: itinerary.itineraryNumber,
      clientName,
    });

    return {
      success: true,
      message: "Detalles del viaje actualizados correctamente",
    };
  },
});

/**
 * Update trip details from staff (manual entry)
 */
export const updateTripDetailsStaff = mutation({
  args: {
    itineraryId: v.id("itineraries"),
    tripLeaderName: v.optional(v.string()),
    tripLeaderPhone: v.optional(v.string()),
    tripLeaderEmail: v.optional(v.string()),
    pickupExactAddress: v.optional(v.string()),
    dropoffExactAddress: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    pickupCoordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    dropoffCoordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { itineraryId, ...details } = args;
    const now = Date.now();

    const itinerary = await ctx.db.get(itineraryId);
    if (!itinerary) throw new Error("Itinerary not found");

    const updates: Record<string, any> = {
      updatedAt: now,
    };

    // Update trip leader info
    if (details.tripLeaderName !== undefined) updates.tripLeaderName = details.tripLeaderName;
    if (details.tripLeaderPhone !== undefined) updates.tripLeaderPhone = details.tripLeaderPhone;
    if (details.tripLeaderEmail !== undefined) updates.tripLeaderEmail = details.tripLeaderEmail;

    // Update pickup details
    if (details.pickupExactAddress !== undefined) {
      updates.pickupExactAddress = details.pickupExactAddress;
      // Generate map URLs
      if (details.pickupCoordinates) {
        updates.pickupCoordinates = details.pickupCoordinates;
        updates.pickupGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${details.pickupCoordinates.lat},${details.pickupCoordinates.lng}`;
        updates.pickupWazeUrl = `https://waze.com/ul?ll=${details.pickupCoordinates.lat},${details.pickupCoordinates.lng}&navigate=yes`;
      } else {
        updates.pickupGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.pickupExactAddress)}`;
        updates.pickupWazeUrl = `https://waze.com/ul?q=${encodeURIComponent(details.pickupExactAddress)}&navigate=yes`;
      }
    }

    // Update dropoff details
    if (details.dropoffExactAddress !== undefined) {
      updates.dropoffExactAddress = details.dropoffExactAddress;
      // Generate map URLs
      if (details.dropoffCoordinates) {
        updates.dropoffCoordinates = details.dropoffCoordinates;
        updates.dropoffGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${details.dropoffCoordinates.lat},${details.dropoffCoordinates.lng}`;
        updates.dropoffWazeUrl = `https://waze.com/ul?ll=${details.dropoffCoordinates.lat},${details.dropoffCoordinates.lng}&navigate=yes`;
      } else {
        updates.dropoffGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.dropoffExactAddress)}`;
        updates.dropoffWazeUrl = `https://waze.com/ul?q=${encodeURIComponent(details.dropoffExactAddress)}&navigate=yes`;
      }
    }

    // Update notes
    if (details.pickupNotes !== undefined) updates.pickupNotes = details.pickupNotes;
    if (details.dropoffNotes !== undefined) updates.dropoffNotes = details.dropoffNotes;

    // Check if all required details are now complete
    const updatedItinerary = { ...itinerary, ...updates };
    const detailsComplete =
      updatedItinerary.tripLeaderName &&
      updatedItinerary.tripLeaderPhone &&
      updatedItinerary.pickupExactAddress;

    if (detailsComplete && !itinerary.detailsCompletedAt) {
      updates.detailsCompletedAt = now;
      updates.detailsCompletedBy = "staff";
    }

    await ctx.db.patch(itineraryId, updates);

    return { success: true };
  },
});

/**
 * Revoke client access token
 */
export const revokeClientAccessToken = mutation({
  args: {
    itineraryId: v.id("itineraries"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { itineraryId, reason } = args;
    const now = Date.now();

    // Find active token for this itinerary
    const tokenRecord = await ctx.db
      .query("clientAccessTokens")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", itineraryId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (tokenRecord) {
      await ctx.db.patch(tokenRecord._id, {
        status: "revoked",
        revokedAt: now,
        revokeReason: reason || "Manually revoked",
      });
    }

    // Clear token from itinerary
    await ctx.db.patch(itineraryId, {
      clientAccessToken: undefined,
      clientAccessExpiresAt: undefined,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Check if trip details are complete for an itinerary
 */
export const checkTripDetailsComplete = query({
  args: { itineraryId: v.id("itineraries") },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) return { complete: false, missing: ["itinerary"] };

    const missing: string[] = [];

    if (!itinerary.tripLeaderName) missing.push("tripLeaderName");
    if (!itinerary.tripLeaderPhone) missing.push("tripLeaderPhone");
    if (!itinerary.pickupExactAddress) missing.push("pickupExactAddress");

    return {
      complete: missing.length === 0,
      missing,
      detailsCompletedAt: itinerary.detailsCompletedAt,
      detailsCompletedBy: itinerary.detailsCompletedBy,
    };
  },
});

/**
 * Get itineraries with incomplete trip details (for dashboard/alerts)
 */
export const getIncompleteDetails = query({
  args: {
    tenantId: v.id("tenants"),
    daysUntilTrip: v.optional(v.number()), // Filter by trips starting within N days
  },
  handler: async (ctx, args) => {
    const { tenantId, daysUntilTrip } = args;
    const now = Date.now();

    // Get scheduled itineraries
    const itineraries = await ctx.db
      .query("itineraries")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "scheduled")
      )
      .collect();

    // Filter by incomplete details and optionally by upcoming date
    const incomplete = itineraries.filter((i) => {
      // Check if details are incomplete
      const hasIncomplete =
        !i.tripLeaderName || !i.tripLeaderPhone || !i.pickupExactAddress;

      if (!hasIncomplete) return false;

      // Optionally filter by upcoming date
      if (daysUntilTrip !== undefined) {
        const maxDate = now + daysUntilTrip * 24 * 60 * 60 * 1000;
        return i.startDate <= maxDate;
      }

      return true;
    });

    // Sort by start date (nearest first)
    incomplete.sort((a, b) => a.startDate - b.startDate);

    return incomplete;
  },
});
