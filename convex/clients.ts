import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// Helper to generate client code from name (4 letters)
function generateClientCode(name: string): string {
  // Remove common suffixes and clean the name
  const cleaned = name
    .replace(/\s+(S\.?\s*A\.?|Inc\.?|LLC|Ltd\.?|Corp\.?|Company|Co\.?)$/i, '')
    .trim();

  // Split into words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return 'XXXX';
  if (words.length === 1) {
    // Single word: take first 4 letters
    return words[0].substring(0, 4).toUpperCase();
  }
  if (words.length === 2) {
    // Two words: take 2 letters from each
    return (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
  }
  // 3+ words: take first letter of first 4 words, or 2+1+1 pattern
  if (words.length >= 4) {
    return (words[0][0] + words[1][0] + words[2][0] + words[3][0]).toUpperCase();
  }
  // 3 words: 2 from first, 1 from second, 1 from third
  return (words[0].substring(0, 2) + words[1][0] + words[2][0]).toUpperCase();
}

// List all clients for a tenant
export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

// Get a single client by ID
export const get = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search clients by email
export const byEmail = query({
  args: {
    tenantId: v.id("tenants"),
    email: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clients")
      .withIndex("by_tenant_email", (q) =>
        q.eq("tenantId", args.tenantId).eq("email", args.email)
      )
      .first();
  },
});

// Create a new client
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    type: v.string(),
    clientCode: v.optional(v.string()), // 4-letter acronym for quotation naming
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.string(),
    taxId: v.optional(v.string()),
    pricingLevel: v.string(),
    discountPercentage: v.number(),
    creditLimit: v.number(),
    paymentTerms: v.number(),
    notes: v.optional(v.string()),
    status: v.string(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate client code if not provided
    let clientCode = args.clientCode;
    if (!clientCode) {
      const clientName = args.type === 'company'
        ? args.companyName || ''
        : `${args.firstName || ''} ${args.lastName || ''}`.trim();
      if (clientName) {
        clientCode = generateClientCode(clientName);
      }
    } else {
      // Ensure code is uppercase and max 4 chars
      clientCode = clientCode.toUpperCase().substring(0, 4);
    }

    return await ctx.db.insert("clients", {
      ...args,
      clientCode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a client
export const update = mutation({
  args: {
    id: v.id("clients"),
    type: v.optional(v.string()),
    clientCode: v.optional(v.string()), // 4-letter acronym for quotation naming
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    taxId: v.optional(v.string()),
    pricingLevel: v.optional(v.string()),
    discountPercentage: v.optional(v.number()),
    creditLimit: v.optional(v.number()),
    paymentTerms: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, clientCode, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Client not found");

    // Normalize client code if provided
    const normalizedCode = clientCode
      ? clientCode.toUpperCase().substring(0, 4)
      : undefined;

    await ctx.db.patch(id, {
      ...updates,
      ...(normalizedCode !== undefined && { clientCode: normalizedCode }),
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete a client
export const remove = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================================
// CLIENT CODE MIGRATION
// ============================================================

// Get clients without a client code (for migration)
export const getClientsWithoutCode = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return clients.filter((c) => !c.clientCode);
  },
});

// Generate preview code from name (exposed for UI preview)
export const previewClientCode = query({
  args: {
    type: v.string(),
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const clientName = args.type === 'company'
      ? args.companyName || ''
      : `${args.firstName || ''} ${args.lastName || ''}`.trim();

    if (!clientName) return null;
    return generateClientCode(clientName);
  },
});

// Migrate client codes for a tenant (internal use)
export const migrateClientCodes = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    let migrated = 0;
    for (const client of clients) {
      if (!client.clientCode) {
        const clientName = client.type === 'company'
          ? client.companyName || ''
          : `${client.firstName || ''} ${client.lastName || ''}`.trim();

        if (clientName) {
          const code = generateClientCode(clientName);
          await ctx.db.patch(client._id, { clientCode: code });
          migrated++;
        }
      }
    }

    return { total: clients.length, migrated };
  },
});

// Public mutation to trigger migration (can be called from admin UI)
export const runClientCodeMigration = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    let migrated = 0;
    const results: Array<{ id: string; name: string; code: string }> = [];

    for (const client of clients) {
      if (!client.clientCode) {
        const clientName = client.type === 'company'
          ? client.companyName || ''
          : `${client.firstName || ''} ${client.lastName || ''}`.trim();

        if (clientName) {
          const code = generateClientCode(clientName);
          await ctx.db.patch(client._id, { clientCode: code });
          migrated++;
          results.push({ id: client._id, name: clientName, code });
        }
      }
    }

    return { total: clients.length, migrated, results };
  },
});
