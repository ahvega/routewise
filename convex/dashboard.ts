import { v } from "convex/values";
import { query } from "./_generated/server";

// Get comprehensive dashboard statistics
export const getStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Fetch all data in parallel
    const [quotations, itineraries, invoices, advances, clients, vehicles, drivers] = await Promise.all([
      ctx.db.query("quotations").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("itineraries").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("invoices").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("expenseAdvances").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("clients").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("vehicles").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("drivers").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    // Quotation stats
    const quotationStats = {
      total: quotations.length,
      draft: quotations.filter(q => q.status === "draft").length,
      sent: quotations.filter(q => q.status === "sent").length,
      approved: quotations.filter(q => q.status === "approved").length,
      rejected: quotations.filter(q => q.status === "rejected").length,
      last30Days: quotations.filter(q => q.createdAt > thirtyDaysAgo).length,
      approvedValue: quotations
        .filter(q => q.status === "approved")
        .reduce((sum, q) => sum + q.salePriceHnl, 0),
      conversionRate: quotations.filter(q => q.status === "sent" || q.status === "approved" || q.status === "rejected").length > 0
        ? (quotations.filter(q => q.status === "approved").length /
           quotations.filter(q => q.status === "sent" || q.status === "approved" || q.status === "rejected").length) * 100
        : 0,
    };

    // Itinerary stats
    const itineraryStats = {
      total: itineraries.length,
      scheduled: itineraries.filter(i => i.status === "scheduled").length,
      inProgress: itineraries.filter(i => i.status === "in_progress").length,
      completed: itineraries.filter(i => i.status === "completed").length,
      cancelled: itineraries.filter(i => i.status === "cancelled").length,
      upcoming: itineraries.filter(i => i.status === "scheduled" && i.startDate > now).length,
    };

    // Invoice stats
    const invoiceStats = {
      total: invoices.length,
      unpaid: invoices.filter(i => i.paymentStatus === "unpaid").length,
      partial: invoices.filter(i => i.paymentStatus === "partial").length,
      paid: invoices.filter(i => i.paymentStatus === "paid").length,
      overdue: invoices.filter(i => i.paymentStatus === "overdue" || (i.dueDate < now && i.amountDue > 0)).length,
      totalReceivables: invoices.filter(i => i.amountDue > 0).reduce((sum, i) => sum + i.amountDue, 0),
      overdueAmount: invoices
        .filter(i => i.dueDate < now && i.amountDue > 0)
        .reduce((sum, i) => sum + i.amountDue, 0),
    };

    // Expense advance stats
    const advanceStats = {
      total: advances.length,
      pending: advances.filter(a => a.status === "pending").length,
      approved: advances.filter(a => a.status === "approved").length,
      disbursed: advances.filter(a => a.status === "disbursed").length,
      settled: advances.filter(a => a.status === "settled").length,
      outstandingAmount: advances
        .filter(a => a.status === "disbursed")
        .reduce((sum, a) => sum + a.amountHnl, 0),
    };

    // Resource stats
    const resourceStats = {
      clients: {
        total: clients.length,
        active: clients.filter(c => c.status === "active").length,
      },
      vehicles: {
        total: vehicles.length,
        active: vehicles.filter(v => v.status === "active").length,
        maintenance: vehicles.filter(v => v.status === "maintenance").length,
      },
      drivers: {
        total: drivers.length,
        active: drivers.filter(d => d.status === "active").length,
        onLeave: drivers.filter(d => d.status === "on_leave").length,
      },
    };

    return {
      quotations: quotationStats,
      itineraries: itineraryStats,
      invoices: invoiceStats,
      advances: advanceStats,
      resources: resourceStats,
    };
  },
});

// Get alerts (license expiry, overdue invoices, etc.)
export const getAlerts = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    const [drivers, invoices, advances, itineraries] = await Promise.all([
      ctx.db.query("drivers").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("invoices").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("expenseAdvances").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("itineraries").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    const alerts: Array<{
      type: "danger" | "warning" | "info";
      category: string;
      title: string;
      message: string;
      entityId?: string;
      entityType?: string;
      date?: number;
      // For i18n support
      titleKey?: string;
      messageKey?: string;
      messageParams?: Record<string, string | number>;
    }> = [];

    // License expiry alerts
    for (const driver of drivers) {
      if (driver.status !== "active") continue;
      const driverName = `${driver.firstName} ${driver.lastName}`;

      if (driver.licenseExpiry < now) {
        alerts.push({
          type: "danger",
          category: "license",
          title: "License Expired",
          message: `${driverName}'s license has expired`,
          entityId: driver._id,
          entityType: "driver",
          date: driver.licenseExpiry,
          titleKey: "dashboard.licenseExpired",
          messageKey: "dashboard.licenseExpired",
          messageParams: { name: driverName },
        });
      } else if (driver.licenseExpiry < sevenDaysFromNow) {
        alerts.push({
          type: "danger",
          category: "license",
          title: "License Expiring Soon",
          message: `${driverName}'s license expires in less than 7 days`,
          entityId: driver._id,
          entityType: "driver",
          date: driver.licenseExpiry,
          titleKey: "dashboard.licenseExpiring",
          messageKey: "dashboard.licenseExpiring",
          messageParams: { name: driverName },
        });
      } else if (driver.licenseExpiry < thirtyDaysFromNow) {
        alerts.push({
          type: "warning",
          category: "license",
          title: "License Expiring",
          message: `${driverName}'s license expires within 30 days`,
          entityId: driver._id,
          entityType: "driver",
          date: driver.licenseExpiry,
          titleKey: "dashboard.licenseExpiring",
          messageKey: "dashboard.licenseExpiring",
          messageParams: { name: driverName },
        });
      }
    }

    // Overdue invoice alerts
    for (const invoice of invoices) {
      if (invoice.amountDue <= 0) continue;

      const daysOverdue = Math.floor((now - invoice.dueDate) / (24 * 60 * 60 * 1000));

      if (daysOverdue > 30) {
        alerts.push({
          type: "danger",
          category: "invoice",
          title: "Severely Overdue Invoice",
          message: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
          entityId: invoice._id,
          entityType: "invoice",
          date: invoice.dueDate,
        });
      } else if (daysOverdue > 0) {
        alerts.push({
          type: "warning",
          category: "invoice",
          title: "Overdue Invoice",
          message: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
          entityId: invoice._id,
          entityType: "invoice",
          date: invoice.dueDate,
        });
      }
    }

    // Pending advance approvals
    const pendingAdvances = advances.filter(a => a.status === "pending");
    if (pendingAdvances.length > 0) {
      alerts.push({
        type: "info",
        category: "advance",
        title: "Pending Advance Approvals",
        message: `${pendingAdvances.length} expense advance(s) waiting for approval`,
      });
    }

    // Unsettled advances (disbursed but not settled)
    const unsettledAdvances = advances.filter(a => a.status === "disbursed");
    if (unsettledAdvances.length > 0) {
      alerts.push({
        type: "warning",
        category: "advance",
        title: "Unsettled Advances",
        message: `${unsettledAdvances.length} expense advance(s) need settlement`,
      });
    }

    // Upcoming itineraries without driver/vehicle
    const upcomingUnassigned = itineraries.filter(
      i => i.status === "scheduled" &&
           i.startDate < sevenDaysFromNow &&
           (!i.driverId || !i.vehicleId)
    );
    for (const itinerary of upcomingUnassigned) {
      const missing = [];
      if (!itinerary.driverId) missing.push("driver");
      if (!itinerary.vehicleId) missing.push("vehicle");

      alerts.push({
        type: "warning",
        category: "itinerary",
        title: "Unassigned Itinerary",
        message: `${itinerary.itineraryNumber} needs ${missing.join(" and ")} assignment`,
        entityId: itinerary._id,
        entityType: "itinerary",
        date: itinerary.startDate,
      });
    }

    // Sort by type priority (danger first, then warning, then info)
    const typePriority = { danger: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

    return alerts;
  },
});

// Get recent activity feed
export const getRecentActivity = query({
  args: { tenantId: v.id("tenants"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const [quotations, itineraries, invoices, advances] = await Promise.all([
      ctx.db.query("quotations").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("itineraries").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("invoices").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("expenseAdvances").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    const activities: Array<{
      type: "quotation" | "itinerary" | "invoice" | "advance";
      action: string;
      title: string;
      description: string;
      entityId: string;
      timestamp: number;
    }> = [];

    // Add quotation activities
    for (const q of quotations) {
      activities.push({
        type: "quotation",
        action: "created",
        title: q.quotationNumber,
        description: `${q.origin} → ${q.destination}`,
        entityId: q._id,
        timestamp: q.createdAt,
      });

      if (q.approvedAt) {
        activities.push({
          type: "quotation",
          action: "approved",
          title: q.quotationNumber,
          description: `Approved for L${q.salePriceHnl.toLocaleString()}`,
          entityId: q._id,
          timestamp: q.approvedAt,
        });
      }
    }

    // Add itinerary activities
    for (const i of itineraries) {
      activities.push({
        type: "itinerary",
        action: "created",
        title: i.itineraryNumber,
        description: `${i.origin} → ${i.destination}`,
        entityId: i._id,
        timestamp: i.createdAt,
      });

      if (i.startedAt) {
        activities.push({
          type: "itinerary",
          action: "started",
          title: i.itineraryNumber,
          description: "Trip started",
          entityId: i._id,
          timestamp: i.startedAt,
        });
      }

      if (i.completedAt) {
        activities.push({
          type: "itinerary",
          action: "completed",
          title: i.itineraryNumber,
          description: "Trip completed",
          entityId: i._id,
          timestamp: i.completedAt,
        });
      }
    }

    // Add invoice activities
    for (const inv of invoices) {
      activities.push({
        type: "invoice",
        action: "created",
        title: inv.invoiceNumber,
        description: `Invoice for L${inv.totalHnl.toLocaleString()}`,
        entityId: inv._id,
        timestamp: inv.createdAt,
      });

      if (inv.paidAt) {
        activities.push({
          type: "invoice",
          action: "paid",
          title: inv.invoiceNumber,
          description: "Payment completed",
          entityId: inv._id,
          timestamp: inv.paidAt,
        });
      }
    }

    // Add advance activities
    for (const a of advances) {
      activities.push({
        type: "advance",
        action: "created",
        title: a.advanceNumber,
        description: `Advance for L${a.amountHnl.toLocaleString()}`,
        entityId: a._id,
        timestamp: a.createdAt,
      });

      if (a.disbursedAt) {
        activities.push({
          type: "advance",
          action: "disbursed",
          title: a.advanceNumber,
          description: "Funds disbursed",
          entityId: a._id,
          timestamp: a.disbursedAt,
        });
      }

      if (a.settledAt) {
        activities.push({
          type: "advance",
          action: "settled",
          title: a.advanceNumber,
          description: "Expenses settled",
          entityId: a._id,
          timestamp: a.settledAt,
        });
      }
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);

    return activities.slice(0, limit);
  },
});

// Get upcoming itineraries
export const getUpcomingItineraries = query({
  args: { tenantId: v.id("tenants"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 5;

    const itineraries = await ctx.db
      .query("itineraries")
      .withIndex("by_tenant", q => q.eq("tenantId", args.tenantId))
      .collect();

    // Get upcoming scheduled itineraries
    const upcoming = itineraries
      .filter(i => i.status === "scheduled" && i.startDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, limit);

    // Enrich with driver and vehicle names
    const enriched = await Promise.all(
      upcoming.map(async (itinerary) => {
        let driverName = null;
        let vehicleName = null;

        if (itinerary.driverId) {
          const driver = await ctx.db.get(itinerary.driverId);
          if (driver) {
            driverName = `${driver.firstName} ${driver.lastName}`;
          }
        }

        if (itinerary.vehicleId) {
          const vehicle = await ctx.db.get(itinerary.vehicleId);
          if (vehicle) {
            vehicleName = vehicle.name;
          }
        }

        return {
          ...itinerary,
          driverName,
          vehicleName,
        };
      })
    );

    return enriched;
  },
});

// Get revenue history for charts
export const getRevenueHistory = query({
  args: {
    tenantId: v.id("tenants"),
    days: v.optional(v.number()), // 7, 30, 90
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;

    const quotations = await ctx.db
      .query("quotations")
      .withIndex("by_tenant", q => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter approved quotations within the date range
    const approvedQuotations = quotations.filter(
      q => q.status === "approved" && q.approvedAt && q.approvedAt >= startDate
    );

    // Group by date (day or week depending on range)
    const groupByWeek = days > 30;
    const dataPoints: Map<string, number> = new Map();

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = groupByWeek
        ? getWeekKey(date)
        : date.toISOString().split('T')[0];
      if (!dataPoints.has(key)) {
        dataPoints.set(key, 0);
      }
    }

    // Add approved quotation values
    for (const q of approvedQuotations) {
      const date = new Date(q.approvedAt!);
      const key = groupByWeek
        ? getWeekKey(date)
        : date.toISOString().split('T')[0];
      dataPoints.set(key, (dataPoints.get(key) || 0) + q.salePriceHnl);
    }

    // Convert to array sorted by date
    const result = Array.from(dataPoints.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }));

    return result;
  },
});

// Helper function to get week key
function getWeekKey(date: Date): string {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek.toISOString().split('T')[0];
}

// Get quotation pipeline distribution
export const getPipelineStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const quotations = await ctx.db
      .query("quotations")
      .withIndex("by_tenant", q => q.eq("tenantId", args.tenantId))
      .collect();

    const now = Date.now();

    // Check for expired quotations (validUntil passed and not approved)
    const pipeline = {
      draft: quotations.filter(q => q.status === "draft").length,
      sent: quotations.filter(q =>
        q.status === "sent" && (!q.validUntil || q.validUntil > now)
      ).length,
      approved: quotations.filter(q => q.status === "approved").length,
      rejected: quotations.filter(q => q.status === "rejected").length,
      expired: quotations.filter(q =>
        (q.status === "sent" && q.validUntil && q.validUntil < now) ||
        q.status === "expired"
      ).length,
      total: quotations.length,
    };

    return pipeline;
  },
});

// Get fleet utilization metrics
export const getFleetUtilization = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const [vehicles, drivers, itineraries] = await Promise.all([
      ctx.db.query("vehicles").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("drivers").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("itineraries").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    // Active itineraries (in progress or scheduled for today)
    const activeItineraries = itineraries.filter(i =>
      i.status === "in_progress" ||
      (i.status === "scheduled" && i.startDate >= todayStart && i.startDate < todayEnd)
    );

    // Get IDs of vehicles and drivers currently in use
    const vehiclesInUse = new Set(activeItineraries.map(i => i.vehicleId).filter(Boolean));
    const driversInUse = new Set(activeItineraries.map(i => i.driverId).filter(Boolean));

    // Calculate utilization
    const activeVehicles = vehicles.filter(v => v.status === "active");
    const activeDrivers = drivers.filter(d => d.status === "active");

    return {
      vehicles: {
        total: vehicles.length,
        active: activeVehicles.length,
        inUse: vehiclesInUse.size,
        available: activeVehicles.length - vehiclesInUse.size,
        utilization: activeVehicles.length > 0
          ? Math.round((vehiclesInUse.size / activeVehicles.length) * 100)
          : 0,
        maintenance: vehicles.filter(v => v.status === "maintenance").length,
      },
      drivers: {
        total: drivers.length,
        active: activeDrivers.length,
        inUse: driversInUse.size,
        available: activeDrivers.length - driversInUse.size,
        utilization: activeDrivers.length > 0
          ? Math.round((driversInUse.size / activeDrivers.length) * 100)
          : 0,
        onLeave: drivers.filter(d => d.status === "on_leave").length,
      },
    };
  },
});
