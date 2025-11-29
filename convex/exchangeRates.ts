import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// API configuration
const CURRENCY_SYMBOLS = "HNL,GTQ,CRC,NIO,PAB,BZD,MXN,DOP,COP,PEN";
const API_URL = `https://api.apilayer.com/exchangerates_data/latest?base=USD&symbols=${CURRENCY_SYMBOLS}`;

/**
 * Exchange Rates Management
 *
 * Stores and retrieves exchange rates for Central American currencies.
 * Rates are updated daily via a scheduled action.
 */

// Default rates as fallback (as of Nov 28, 2025)
const DEFAULT_RATES = {
  HNL: 26.31,    // Honduras
  GTQ: 7.66,     // Guatemala
  CRC: 498.39,   // Costa Rica
  NIO: 36.78,    // Nicaragua
  PAB: 1.0,      // Panama (pegged to USD)
  BZD: 2.0,      // Belize (pegged to USD at 2:1)
  MXN: 18.31,    // Mexico
  DOP: 62.59,    // Dominican Republic
  COP: 3740.40,  // Colombia
  PEN: 3.36,     // Peru
};

// Get the latest exchange rates
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    // Get the most recent exchange rates record
    const latest = await ctx.db
      .query("exchangeRates")
      .withIndex("by_fetched_at")
      .order("desc")
      .first();

    if (!latest) {
      // Return defaults if no rates exist yet
      return {
        baseCurrency: "USD",
        rates: DEFAULT_RATES,
        source: "default",
        fetchedAt: Date.now(),
        isDefault: true,
      };
    }

    return {
      ...latest,
      isDefault: false,
    };
  },
});

// Get a specific currency rate
export const getRate = query({
  args: { currency: v.string() },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("exchangeRates")
      .withIndex("by_fetched_at")
      .order("desc")
      .first();

    const rates = latest?.rates || DEFAULT_RATES;
    const rate = rates[args.currency as keyof typeof rates];

    return {
      currency: args.currency,
      rate: rate || 1.0,
      source: latest?.source || "default",
      fetchedAt: latest?.fetchedAt || Date.now(),
    };
  },
});

// Internal mutation to store fetched rates
export const storeRates = internalMutation({
  args: {
    rates: v.object({
      HNL: v.number(),
      GTQ: v.number(),
      CRC: v.number(),
      NIO: v.number(),
      PAB: v.number(),
      BZD: v.number(),
      MXN: v.number(),
      DOP: v.number(),
      COP: v.number(),
      PEN: v.number(),
    }),
    source: v.string(),
    fetchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("exchangeRates", {
      baseCurrency: "USD",
      rates: args.rates,
      source: args.source,
      fetchedAt: args.fetchedAt,
      createdAt: now,
    });

    // Clean up old records (keep last 30 days)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oldRecords = await ctx.db
      .query("exchangeRates")
      .withIndex("by_fetched_at")
      .filter((q) => q.lt(q.field("fetchedAt"), thirtyDaysAgo))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { success: true };
  },
});

// Internal action to fetch rates from external API (called by cron job)
export const fetchRatesFromAPI = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.EXCHANGE_RATES_API_KEY;

    if (!apiKey) {
      console.error("EXCHANGE_RATES_API_KEY not configured");
      return { success: false, error: "API key not configured" };
    }

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: { apikey: apiKey },
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.info || "API returned unsuccessful response");
      }

      // Ensure all required rates are present, fill missing with defaults
      const rates = {
        HNL: data.rates.HNL || DEFAULT_RATES.HNL,
        GTQ: data.rates.GTQ || DEFAULT_RATES.GTQ,
        CRC: data.rates.CRC || DEFAULT_RATES.CRC,
        NIO: data.rates.NIO || DEFAULT_RATES.NIO,
        PAB: data.rates.PAB || DEFAULT_RATES.PAB,
        BZD: data.rates.BZD || DEFAULT_RATES.BZD,
        MXN: data.rates.MXN || DEFAULT_RATES.MXN,
        DOP: data.rates.DOP || DEFAULT_RATES.DOP,
        COP: data.rates.COP || DEFAULT_RATES.COP,
        PEN: data.rates.PEN || DEFAULT_RATES.PEN,
      };

      // Store the rates
      await ctx.runMutation(internal.exchangeRates.storeRates, {
        rates,
        source: "apilayer",
        fetchedAt: Date.now(),
      });

      console.log("Exchange rates updated successfully via cron job");
      return { success: true, rates };
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Action to fetch rates from external API (called from HTTP endpoint)
export const fetchAndStoreRates = action({
  args: {
    rates: v.object({
      HNL: v.number(),
      GTQ: v.number(),
      CRC: v.number(),
      NIO: v.number(),
      PAB: v.number(),
      BZD: v.number(),
      MXN: v.number(),
      DOP: v.number(),
      COP: v.number(),
      PEN: v.number(),
    }),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.exchangeRates.storeRates, {
      rates: args.rates,
      source: args.source,
      fetchedAt: Date.now(),
    });

    return { success: true };
  },
});

// Manual rate update (for admin use)
export const updateManually = mutation({
  args: {
    rates: v.object({
      HNL: v.number(),
      GTQ: v.number(),
      CRC: v.number(),
      NIO: v.number(),
      PAB: v.number(),
      BZD: v.number(),
      MXN: v.number(),
      DOP: v.number(),
      COP: v.number(),
      PEN: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("exchangeRates", {
      baseCurrency: "USD",
      rates: args.rates,
      source: "manual",
      fetchedAt: now,
      createdAt: now,
    });

    return { success: true };
  },
});

// Get exchange rate history (for reports)
export const getHistory = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const records = await ctx.db
      .query("exchangeRates")
      .withIndex("by_fetched_at")
      .filter((q) => q.gte(q.field("fetchedAt"), since))
      .order("desc")
      .collect();

    return records;
  },
});

// Check if rates need updating (older than 24 hours)
export const needsUpdate = query({
  args: {},
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("exchangeRates")
      .withIndex("by_fetched_at")
      .order("desc")
      .first();

    if (!latest) {
      return { needsUpdate: true, lastUpdate: null };
    }

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const needsUpdate = latest.fetchedAt < twentyFourHoursAgo;

    return {
      needsUpdate,
      lastUpdate: latest.fetchedAt,
      source: latest.source,
    };
  },
});
