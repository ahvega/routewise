import { v } from "convex/values";
import { query } from "./_generated/server";

// Get sales pipeline report (quotations by status)
export const getSalesPipeline = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const quotations = await ctx.db
      .query("quotations")
      .withIndex("by_tenant", q => q.eq("tenantId", args.tenantId))
      .collect();

    const byStatus = {
      draft: { count: 0, value: 0 },
      sent: { count: 0, value: 0 },
      approved: { count: 0, value: 0 },
      rejected: { count: 0, value: 0 },
      expired: { count: 0, value: 0 },
    };

    for (const q of quotations) {
      const status = q.status as keyof typeof byStatus;
      if (byStatus[status]) {
        byStatus[status].count++;
        byStatus[status].value += q.salePriceHnl;
      }
    }

    const total = quotations.length;
    const sentOrBeyond = quotations.filter(q =>
      q.status === "sent" || q.status === "approved" || q.status === "rejected"
    ).length;
    const approved = byStatus.approved.count;
    const conversionRate = sentOrBeyond > 0 ? (approved / sentOrBeyond) * 100 : 0;

    return {
      byStatus,
      total,
      conversionRate,
      totalPipelineValue: byStatus.draft.value + byStatus.sent.value,
      approvedValue: byStatus.approved.value,
    };
  },
});

// Get revenue by client
export const getRevenueByClient = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const [quotations, clients] = await Promise.all([
      ctx.db.query("quotations").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("clients").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    const clientMap = new Map(clients.map(c => [c._id, c]));
    const revenueByClient: Record<string, { clientName: string; quotations: number; approved: number; revenue: number }> = {};

    for (const q of quotations) {
      if (!q.clientId) continue; // Skip quotations without client
      const clientId = q.clientId as string;
      if (!revenueByClient[clientId]) {
        const client = clientMap.get(q.clientId);
        revenueByClient[clientId] = {
          clientName: client ? (client.type === "company" ? client.companyName || "Unknown" : `${client.firstName} ${client.lastName}`) : "Unknown",
          quotations: 0,
          approved: 0,
          revenue: 0,
        };
      }
      revenueByClient[clientId].quotations++;
      if (q.status === "approved") {
        revenueByClient[clientId].approved++;
        revenueByClient[clientId].revenue += q.salePriceHnl;
      }
    }

    // Sort by revenue descending
    const sorted = Object.values(revenueByClient)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20); // Top 20

    return sorted;
  },
});

// Get revenue by vehicle
export const getRevenueByVehicle = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const [quotations, vehicles] = await Promise.all([
      ctx.db.query("quotations").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("vehicles").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    const vehicleMap = new Map(vehicles.map(v => [v._id, v]));
    const revenueByVehicle: Record<string, { vehicleName: string; quotations: number; approved: number; revenue: number }> = {};

    for (const q of quotations) {
      if (!q.vehicleId) continue; // Skip quotations without vehicle
      const vehicleId = q.vehicleId as string;
      if (!revenueByVehicle[vehicleId]) {
        const vehicle = vehicleMap.get(q.vehicleId);
        revenueByVehicle[vehicleId] = {
          vehicleName: vehicle?.name || "Unknown",
          quotations: 0,
          approved: 0,
          revenue: 0,
        };
      }
      revenueByVehicle[vehicleId].quotations++;
      if (q.status === "approved") {
        revenueByVehicle[vehicleId].approved++;
        revenueByVehicle[vehicleId].revenue += q.salePriceHnl;
      }
    }

    // Sort by revenue descending
    const sorted = Object.values(revenueByVehicle)
      .sort((a, b) => b.revenue - a.revenue);

    return sorted;
  },
});

// Get monthly revenue summary
export const getMonthlyRevenue = query({
  args: { tenantId: v.id("tenants"), months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const monthsToShow = args.months || 12;
    const now = new Date();

    const quotations = await ctx.db
      .query("quotations")
      .withIndex("by_tenant", q => q.eq("tenantId", args.tenantId))
      .collect();

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant", q => q.eq("tenantId", args.tenantId))
      .collect();

    // Build monthly data
    const monthlyData: Array<{
      month: string;
      year: number;
      monthNum: number;
      quotationsCreated: number;
      quotationsApproved: number;
      quotationValue: number;
      invoiced: number;
      collected: number;
    }> = [];

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthStart = new Date(year, month, 1).getTime();
      const monthEnd = new Date(year, month + 1, 1).getTime();

      const monthQuotations = quotations.filter(q =>
        q.createdAt >= monthStart && q.createdAt < monthEnd
      );
      const approvedThisMonth = quotations.filter(q =>
        q.status === "approved" && q.approvedAt && q.approvedAt >= monthStart && q.approvedAt < monthEnd
      );
      const monthInvoices = invoices.filter(inv =>
        inv.createdAt >= monthStart && inv.createdAt < monthEnd
      );
      const paidThisMonth = invoices.filter(inv =>
        inv.paidAt && inv.paidAt >= monthStart && inv.paidAt < monthEnd
      );

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year,
        monthNum: month,
        quotationsCreated: monthQuotations.length,
        quotationsApproved: approvedThisMonth.length,
        quotationValue: approvedThisMonth.reduce((sum, q) => sum + q.salePriceHnl, 0),
        invoiced: monthInvoices.reduce((sum, inv) => sum + inv.totalHnl, 0),
        collected: paidThisMonth.reduce((sum, inv) => sum + inv.amountPaid, 0),
      });
    }

    return monthlyData;
  },
});

// Get receivables aging report
export const getReceivablesAging = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const [invoices, clients] = await Promise.all([
      ctx.db.query("invoices").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("clients").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    const clientMap = new Map(clients.map(c => [c._id, c]));

    // Filter unpaid invoices
    const unpaidInvoices = invoices.filter(inv => inv.amountDue > 0);

    // Aging buckets
    const aging = {
      current: { count: 0, amount: 0 },      // Not yet due
      days1_30: { count: 0, amount: 0 },     // 1-30 days overdue
      days31_60: { count: 0, amount: 0 },    // 31-60 days overdue
      days61_90: { count: 0, amount: 0 },    // 61-90 days overdue
      over90: { count: 0, amount: 0 },       // 90+ days overdue
    };

    // Detailed list
    const invoiceList: Array<{
      invoiceNumber: string;
      clientName: string;
      amount: number;
      dueDate: number;
      daysOverdue: number;
      bucket: string;
    }> = [];

    for (const inv of unpaidInvoices) {
      const daysOverdue = Math.floor((now - inv.dueDate) / (24 * 60 * 60 * 1000));
      const client = inv.clientId ? clientMap.get(inv.clientId) : undefined;
      const clientName = client
        ? (client.type === "company" ? client.companyName || "Unknown" : `${client.firstName} ${client.lastName}`)
        : "Unknown";

      let bucket: keyof typeof aging;
      if (daysOverdue <= 0) {
        bucket = "current";
      } else if (daysOverdue <= 30) {
        bucket = "days1_30";
      } else if (daysOverdue <= 60) {
        bucket = "days31_60";
      } else if (daysOverdue <= 90) {
        bucket = "days61_90";
      } else {
        bucket = "over90";
      }

      aging[bucket].count++;
      aging[bucket].amount += inv.amountDue;

      invoiceList.push({
        invoiceNumber: inv.invoiceNumber,
        clientName,
        amount: inv.amountDue,
        dueDate: inv.dueDate,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      });
    }

    // Sort by days overdue descending
    invoiceList.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totalReceivables = unpaidInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
    const totalOverdue = aging.days1_30.amount + aging.days31_60.amount + aging.days61_90.amount + aging.over90.amount;

    return {
      aging,
      totalReceivables,
      totalOverdue,
      invoiceCount: unpaidInvoices.length,
      invoices: invoiceList.slice(0, 50), // Top 50
    };
  },
});

// Get driver utilization
export const getDriverUtilization = query({
  args: { tenantId: v.id("tenants"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysToAnalyze = args.days || 30;
    const now = Date.now();
    const startDate = now - daysToAnalyze * 24 * 60 * 60 * 1000;

    const [drivers, itineraries] = await Promise.all([
      ctx.db.query("drivers").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("itineraries").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    // Filter relevant itineraries (completed or in progress within timeframe)
    const relevantItineraries = itineraries.filter(it =>
      it.startDate >= startDate || (it.completedAt && it.completedAt >= startDate)
    );

    const utilization = drivers.map(driver => {
      const driverItineraries = relevantItineraries.filter(it => it.driverId === driver._id);
      const completed = driverItineraries.filter(it => it.status === "completed");
      const inProgress = driverItineraries.filter(it => it.status === "in_progress");
      const scheduled = driverItineraries.filter(it => it.status === "scheduled");

      // Estimate trip days
      const tripDays = completed.reduce((sum, it) => {
        return sum + (it.estimatedDays || 1);
      }, 0);

      return {
        driverId: driver._id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        status: driver.status,
        totalTrips: driverItineraries.length,
        completed: completed.length,
        inProgress: inProgress.length,
        scheduled: scheduled.length,
        tripDays,
        utilizationRate: daysToAnalyze > 0 ? (tripDays / daysToAnalyze) * 100 : 0,
      };
    });

    // Sort by utilization rate
    utilization.sort((a, b) => b.utilizationRate - a.utilizationRate);

    const activeDrivers = drivers.filter(d => d.status === "active").length;
    const totalTrips = relevantItineraries.length;
    const avgTripsPerDriver = activeDrivers > 0 ? totalTrips / activeDrivers : 0;

    return {
      drivers: utilization,
      summary: {
        totalDrivers: drivers.length,
        activeDrivers,
        totalTrips,
        avgTripsPerDriver: avgTripsPerDriver.toFixed(1),
      },
    };
  },
});

// Get vehicle utilization
export const getVehicleUtilization = query({
  args: { tenantId: v.id("tenants"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysToAnalyze = args.days || 30;
    const now = Date.now();
    const startDate = now - daysToAnalyze * 24 * 60 * 60 * 1000;

    const [vehicles, itineraries] = await Promise.all([
      ctx.db.query("vehicles").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("itineraries").withIndex("by_tenant", q => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    // Filter relevant itineraries
    const relevantItineraries = itineraries.filter(it =>
      it.startDate >= startDate || (it.completedAt && it.completedAt >= startDate)
    );

    const utilization = vehicles.map(vehicle => {
      const vehicleItineraries = relevantItineraries.filter(it => it.vehicleId === vehicle._id);
      const completed = vehicleItineraries.filter(it => it.status === "completed");
      const inProgress = vehicleItineraries.filter(it => it.status === "in_progress");
      const scheduled = vehicleItineraries.filter(it => it.status === "scheduled");

      // Estimate trip days
      const tripDays = completed.reduce((sum, it) => sum + (it.estimatedDays || 1), 0);

      // Total distance
      const totalDistance = completed.reduce((sum, it) => sum + it.totalDistance, 0);

      return {
        vehicleId: vehicle._id,
        vehicleName: vehicle.name,
        vehicleType: vehicle.name, // Use name as type for now
        status: vehicle.status,
        totalTrips: vehicleItineraries.length,
        completed: completed.length,
        inProgress: inProgress.length,
        scheduled: scheduled.length,
        tripDays,
        totalDistance,
        utilizationRate: daysToAnalyze > 0 ? (tripDays / daysToAnalyze) * 100 : 0,
      };
    });

    // Sort by utilization rate
    utilization.sort((a, b) => b.utilizationRate - a.utilizationRate);

    const activeVehicles = vehicles.filter(v => v.status === "active").length;
    const totalTrips = relevantItineraries.length;
    const totalDistance = utilization.reduce((sum, v) => sum + v.totalDistance, 0);

    return {
      vehicles: utilization,
      summary: {
        totalVehicles: vehicles.length,
        activeVehicles,
        totalTrips,
        totalDistance,
        avgDistancePerTrip: totalTrips > 0 ? Math.round(totalDistance / totalTrips) : 0,
      },
    };
  },
});

// Get route analysis
export const getRouteAnalysis = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const quotations = await ctx.db
      .query("quotations")
      .withIndex("by_tenant", q => q.eq("tenantId", args.tenantId))
      .collect();

    // Group by origin-destination pairs
    const routeMap: Record<string, {
      origin: string;
      destination: string;
      count: number;
      approved: number;
      totalValue: number;
      avgDistance: number;
      distances: number[];
    }> = {};

    for (const q of quotations) {
      const key = `${q.origin}|${q.destination}`;
      if (!routeMap[key]) {
        routeMap[key] = {
          origin: q.origin,
          destination: q.destination,
          count: 0,
          approved: 0,
          totalValue: 0,
          avgDistance: 0,
          distances: [],
        };
      }
      routeMap[key].count++;
      routeMap[key].distances.push(q.totalDistance);
      if (q.status === "approved") {
        routeMap[key].approved++;
        routeMap[key].totalValue += q.salePriceHnl;
      }
    }

    // Calculate averages and sort
    const routes = Object.values(routeMap).map(route => ({
      ...route,
      avgDistance: route.distances.length > 0
        ? Math.round(route.distances.reduce((a, b) => a + b, 0) / route.distances.length)
        : 0,
      conversionRate: route.count > 0 ? (route.approved / route.count) * 100 : 0,
      distances: undefined, // Remove raw data
    }));

    // Sort by count descending
    routes.sort((a, b) => b.count - a.count);

    return {
      routes: routes.slice(0, 30), // Top 30 routes
      totalUniqueRoutes: routes.length,
      mostPopular: routes[0] || null,
      highestValue: routes.slice().sort((a, b) => b.totalValue - a.totalValue)[0] || null,
    };
  },
});
