<script lang="ts">
  import {
    Button,
    Card,
    Spinner,
    Alert,
    Progressbar,
    Select,
    A,
    Dropdown,
    DropdownItem
  } from "flowbite-svelte";
  import {
    FileLinesOutline,
    UsersOutline,
    TruckOutline,
    UserOutline,
    PlusOutline,
    ArrowRightOutline,
    ChartPieOutline,
    ChevronDownOutline,
    ChevronRightOutline,
    CalendarMonthOutline,
    CashOutline,
    ExclamationCircleOutline,
    ClockOutline,
    CheckCircleOutline,
    InfoCircleOutline,
    PlayOutline,
    EyeOutline,
    FilterOutline,
  } from "flowbite-svelte-icons";
  import { useQuery, useConvexClient } from "convex-svelte";
  import { api } from "$convex/_generated/api";
  import { tenantStore } from "$lib/stores";
  import { StatusBadge, ActionMenuCard } from "$lib/components/ui";
  import {
    createViewAction,
    filterActions,
    type ActionItem,
  } from "$lib/types/actions";
  import { t } from "$lib/i18n";
  import { Chart } from "@flowbite-svelte-plugins/chart";
  import type { ApexOptions } from "apexcharts";
  import type { Id } from "$convex/_generated/dataModel";
  import { goto } from "$app/navigation";

  let { data } = $props();
  const client = useConvexClient();

  // Use the dashboard queries
  const statsQuery = useQuery(api.dashboard.getStats, () =>
    tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : "skip"
  );
  const alertsQuery = useQuery(api.dashboard.getAlerts, () =>
    tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : "skip"
  );
  const activityQuery = useQuery(api.dashboard.getRecentActivity, () =>
    tenantStore.tenantId
      ? { tenantId: tenantStore.tenantId, limit: 10 }
      : "skip"
  );
  const upcomingQuery = useQuery(api.dashboard.getUpcomingItineraries, () =>
    tenantStore.tenantId ? { tenantId: tenantStore.tenantId, limit: 5 } : "skip"
  );

  // Chart data queries
  let revenueDays = $state(7);
  const revenueQuery = useQuery(api.dashboard.getRevenueHistory, () =>
    tenantStore.tenantId
      ? { tenantId: tenantStore.tenantId, days: revenueDays }
      : "skip"
  );
  const pipelineQuery = useQuery(api.dashboard.getPipelineStats, () =>
    tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : "skip"
  );
  const fleetQuery = useQuery(api.dashboard.getFleetUtilization, () =>
    tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : "skip"
  );

  const stats = $derived(statsQuery.data);
  const alerts = $derived(alertsQuery.data || []);
  const activities = $derived(activityQuery.data || []);
  const upcomingItineraries = $derived(upcomingQuery.data || []);
  const revenueData = $derived(revenueQuery.data || []);
  const pipelineData = $derived(pipelineQuery.data);
  const fleetData = $derived(fleetQuery.data);

  const isLoading = $derived(statsQuery.isLoading);

  // Danger alerts (license expired, overdue invoices)
  const dangerAlerts = $derived(alerts.filter((a) => a.type === "danger"));
  const warningAlerts = $derived(alerts.filter((a) => a.type === "warning"));
  const infoAlerts = $derived(alerts.filter((a) => a.type === "info"));

  // Chart text color - white for dark mode (default)
  const chartTextColor = "#e5e7eb"; // gray-200

  // Revenue Chart Options with profit line
  const revenueChartOptions = $derived<ApexOptions>({
    chart: {
      type: "area",
      height: 200,
      fontFamily: "Fira Sans ExtraCondensed, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
      dropShadow: { enabled: false },
      foreColor: chartTextColor,
    },
    series: [
      {
        name: $t("dashboard.revenue") || "Ventas",
        data: revenueData.map((d) => d.value),
        color: "#0ea5e9",
      },
      {
        name: $t("dashboard.profit") || "Ganancia",
        data: revenueData.map((d) => d.profit || 0),
        color: "#10b981",
      },
    ],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.55,
        opacityTo: 0.15,
        stops: [0, 100],
      },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      labels: {
        colors: chartTextColor,
      },
      markers: {
        size: 8,
      },
    },
    xaxis: {
      categories: revenueData.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString("es-HN", {
          month: "short",
          day: "numeric",
        });
      }),
      labels: {
        show: true,
        style: {
          colors: chartTextColor,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      show: true,
      labels: {
        formatter: (value: number) => formatCurrency(value),
        style: {
          colors: chartTextColor,
        },
      },
    },
    grid: {
      show: true,
      strokeDashArray: 4,
      padding: { left: 2, right: 2, top: 0 },
      borderColor: "#374151",
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      x: { show: false },
    },
    dataLabels: { enabled: false },
  });

  // Pipeline Donut Chart Options
  const pipelineChartOptions = $derived<ApexOptions>({
    chart: {
      type: "donut",
      height: 200,
      fontFamily: "Fira Sans ExtraCondensed, sans-serif",
      dropShadow: { enabled: false },
      foreColor: chartTextColor,
    },
    series: pipelineData
      ? [
          pipelineData.draft,
          pipelineData.sent,
          pipelineData.approved,
          pipelineData.rejected,
          pipelineData.expired,
        ]
      : [],
    colors: ["#9ca3af", "#3b82f6", "#10b981", "#ef4444", "#f59e0b"],
    labels: [
      $t("statuses.draft") || "Draft",
      $t("statuses.sent") || "Sent",
      $t("statuses.approved") || "Approved",
      $t("statuses.rejected") || "Rejected",
      $t("statuses.expired") || "Expired",
    ],
    legend: {
      position: "right",
      fontSize: "12px",
      labels: {
        colors: chartTextColor,
      },
    },
    tooltip: {
      theme: "dark",
    },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              color: chartTextColor,
            },
            value: {
              show: true,
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
            },
            total: {
              show: true,
              label: "Total",
              fontSize: "12px",
              color: chartTextColor,
            },
          },
        },
      },
    },
  });

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat("es-HN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return $t("dashboard.justNow") || "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  }

  const greeting = $derived(() => {
    const hour = new Date().getHours();
    if (hour < 12) return $t("dashboard.goodMorning") || "Good morning";
    if (hour < 18) return $t("dashboard.goodAfternoon") || "Good afternoon";
    return $t("dashboard.goodEvening") || "Good evening";
  });

  const userName = $derived(
    data.user?.firstName || data.user?.email?.split("@")[0] || "there"
  );

  // Activity type icons and colors
  const activityConfig: Record<
    string,
    { icon: typeof FileLinesOutline; color: string }
  > = {
    quotation: { icon: FileLinesOutline, color: "text-blue-500" },
    itinerary: { icon: CalendarMonthOutline, color: "text-cyan-500" },
    invoice: { icon: CashOutline, color: "text-emerald-500" },
    advance: { icon: CashOutline, color: "text-amber-500" },
  };

  // Start trip action
  async function startTrip(itineraryId: Id<"itineraries">) {
    try {
      await client.mutation(api.itineraries.updateStatus, {
        id: itineraryId,
        status: "in_progress",
      });
    } catch (error) {
      console.error("Failed to start trip:", error);
    }
  }

  // USD formatting helper
  function formatUsd(hnl: number): string {
    // Use default exchange rate - the values from backend already include USD conversions
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(hnl);
  }

  // Filter actions helper for creating status filter actions
  function createFilterAction(href: string, label: string): ActionItem {
    return {
      id: `filter-${label.toLowerCase().replace(/\s/g, "-")}`,
      label,
      icon: FilterOutline,
      href,
      color: "default",
    };
  }

  // Action menu builders for each entity card
  const getQuotationActions = $derived<ActionItem[]>(
    stats
      ? filterActions([
          createViewAction("/quotations", $t("common.view")),
          {
            id: "add",
            label: $t("common.add"),
            icon: PlusOutline,
            href: "/quotations/new",
            color: "default" as const,
          },
          {
            id: "div1",
            label: "",
            dividerBefore: true,
            show: true,
            onClick: () => {},
          },
          createFilterAction(
            "/quotations?status=draft",
            `${$t("statuses.draft")} (${stats.quotations.draft})`
          ),
          createFilterAction(
            "/quotations?status=sent",
            `${$t("statuses.sent")} (${stats.quotations.sent})`
          ),
          createFilterAction(
            "/quotations?status=approved",
            `${$t("statuses.approved")} (${stats.quotations.approved})`
          ),
          createFilterAction(
            "/quotations?status=rejected",
            `${$t("statuses.rejected")} (${stats.quotations.rejected})`
          ),
        ])
      : []
  );

  const getItineraryActions = $derived<ActionItem[]>(
    stats
      ? filterActions([
          createViewAction("/itineraries", $t("common.view")),
          {
            id: "add",
            label: $t("common.add"),
            icon: PlusOutline,
            href: "/quotations?status=approved",
            color: "default" as const,
          },
          {
            id: "div1",
            label: "",
            dividerBefore: true,
            show: true,
            onClick: () => {},
          },
          createFilterAction(
            "/itineraries?status=scheduled",
            `${$t("statuses.scheduled")} (${stats.itineraries.scheduled})`
          ),
          createFilterAction(
            "/itineraries?status=in_progress",
            `${$t("statuses.in_progress")} (${stats.itineraries.inProgress})`
          ),
          createFilterAction(
            "/itineraries?status=completed",
            `${$t("statuses.completed")} (${stats.itineraries.completed})`
          ),
        ])
      : []
  );

  const getInvoiceActions = $derived<ActionItem[]>(
    stats
      ? filterActions([
          createViewAction("/invoices", $t("common.view")),
          {
            id: "div1",
            label: "",
            dividerBefore: true,
            show: true,
            onClick: () => {},
          },
          createFilterAction(
            "/invoices?status=unpaid",
            `${$t("statuses.unpaid")} (${stats.invoices.unpaid})`
          ),
          createFilterAction(
            "/invoices?status=overdue",
            `${$t("statuses.overdue")} (${stats.invoices.overdue})`
          ),
          createFilterAction(
            "/invoices?status=paid",
            `${$t("statuses.paid")} (${stats.invoices.paid})`
          ),
        ])
      : []
  );

  const getExpenseActions = $derived<ActionItem[]>(
    stats
      ? filterActions([
          createViewAction("/expenses", $t("common.view")),
          {
            id: "div1",
            label: "",
            dividerBefore: true,
            show: true,
            onClick: () => {},
          },
          createFilterAction(
            "/expenses?status=pending",
            `${$t("statuses.pending")} (${stats.advances.pending})`
          ),
          createFilterAction(
            "/expenses?status=disbursed",
            `${$t("statuses.disbursed")} (${stats.advances.disbursed})`
          ),
          createFilterAction(
            "/expenses?status=settled",
            `${$t("statuses.settled")} (${stats.advances.settled})`
          ),
        ])
      : []
  );

  // Filter alerts by category for inline display
  const quotationAlerts = $derived(
    warningAlerts.filter((a) => a.category === "quotation")
  );
  const invoiceAlerts = $derived(
    warningAlerts.filter((a) => a.category === "invoice")
  );
  const itineraryAlerts = $derived(
    warningAlerts.filter((a) => a.category === "itinerary")
  );
  const advanceAlerts = $derived(
    warningAlerts.filter((a) => a.category === "advance")
  );
</script>


<div class="space-y-6">
  <!-- Welcome Header -->
  <div
    class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
  >
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {greeting()}, {userName}!
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        {$t("dashboard.subtitle")}
      </p>
    </div>
    <Button href="/quotations/new">
      <PlusOutline class="w-4 h-4 mr-2" />
      {$t("dashboard.newQuotation")}
    </Button>
  </div>

  <!-- Critical Alerts -->
  {#if dangerAlerts.length > 0}
    <div class="space-y-2">
      {#each dangerAlerts.slice(0, 3) as alert}
        <Alert color="red" class="!bg-red-50 dark:!bg-red-900/20">
          {#snippet icon()}
            <ExclamationCircleOutline class="w-5 h-5" />
          {/snippet}
          {#if alert.messageKey && alert.messageParams}
            {$t(alert.messageKey, { values: alert.messageParams })}
          {:else}
            <span class="font-medium">{alert.title}:</span>
            {alert.message}
          {/if}
        </Alert>
      {/each}
    </div>
  {/if}

  {#if isLoading}
    <div class="flex justify-center py-12">
      <Spinner size="8" />
    </div>
  {:else if stats}
    <!-- Main Stats Grid with ActionMenu -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <!-- Quotations -->
      <Card class="max-w-none !p-4 relative">
        <ActionMenuCard
          triggerId="quotations-actions"
          actions={getQuotationActions}
          class="absolute top-2 right-2"
        />
        <div class="flex items-center gap-2 mb-3 pr-8">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileLinesOutline
              class="w-4 h-4 text-blue-600 dark:text-blue-400"
            />
          </div>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >{$t("dashboard.quotations")}</span
          >
        </div>
        <div class="text-center py-2">
          <p class="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.quotations.total}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {stats.quotations.conversionRate.toFixed(0)}% {$t(
              "dashboard.conversion"
            )}
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-2 text-xs">
          <span
            class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded"
          >
            {stats.quotations.draft}
            {$t("statuses.draft").toLowerCase()}
          </span>
          <span
            class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded"
          >
            {stats.quotations.approved}
            {$t("statuses.approved").toLowerCase()}
          </span>
        </div>
        {#if quotationAlerts.length > 0}
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div
              class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
            >
              <ExclamationCircleOutline class="w-3 h-3" />
              {$t("dashboard.alertsCount", {
                values: { count: quotationAlerts.length },
              })}
            </div>
          </div>
        {/if}
      </Card>

      <!-- Itineraries -->
      <Card class="max-w-none !p-4 relative">
        <ActionMenuCard
          triggerId="itineraries-actions"
          actions={getItineraryActions}
          class="absolute top-2 right-2"
        />
        <div class="flex items-center gap-2 mb-3 pr-8">
          <div class="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <CalendarMonthOutline
              class="w-4 h-4 text-cyan-600 dark:text-cyan-400"
            />
          </div>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >{$t("dashboard.itineraries")}</span
          >
        </div>
        <div class="text-center py-2">
          <p class="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.itineraries.total}
          </p>
          <p class="text-xs text-amber-600 dark:text-amber-400">
            {stats.itineraries.inProgress}
            {$t("dashboard.inProgress")}
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-2 text-xs">
          <span
            class="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded"
          >
            {stats.itineraries.scheduled}
            {$t("dashboard.scheduled")}
          </span>
          <span
            class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded"
          >
            {stats.itineraries.completed}
            {$t("statuses.completed").toLowerCase()}
          </span>
        </div>
        {#if itineraryAlerts.length > 0}
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div
              class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
            >
              <ExclamationCircleOutline class="w-3 h-3" />
              {$t("dashboard.alertsCount", {
                values: { count: itineraryAlerts.length },
              })}
            </div>
          </div>
        {/if}
      </Card>

      <!-- Invoices -->
      <Card class="max-w-none !p-4 relative">
        <ActionMenuCard
          triggerId="invoices-actions"
          actions={getInvoiceActions}
          class="absolute top-2 right-2"
        />
        <div class="flex items-center gap-2 mb-3 pr-8">
          <div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <CashOutline
              class="w-4 h-4 text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >{$t("invoices.title")}</span
          >
        </div>
        <div class="text-center py-2">
          <p class="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.invoices.total}
          </p>
          {#if stats.invoices.overdue > 0}
            <p class="text-xs text-red-600 dark:text-red-400">
              {stats.invoices.overdue}
              {$t("statuses.overdue").toLowerCase()}
            </p>
          {:else}
            <p class="text-xs text-gray-500 dark:text-gray-400">&nbsp;</p>
          {/if}
        </div>
        <div class="flex flex-wrap justify-center gap-2 text-xs">
          <span
            class="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded"
          >
            {stats.invoices.unpaid}
            {$t("statuses.unpaid").toLowerCase()}
          </span>
          <span
            class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded"
          >
            {stats.invoices.paid}
            {$t("statuses.paid").toLowerCase()}
          </span>
        </div>
        {#if invoiceAlerts.length > 0}
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div
              class="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <ExclamationCircleOutline class="w-3 h-3" />
              {$t("dashboard.alertsCount", {
                values: { count: invoiceAlerts.length },
              })}
            </div>
          </div>
        {/if}
      </Card>

      <!-- Expenses -->
      <Card class="max-w-none !p-4 relative">
        <ActionMenuCard
          triggerId="expenses-actions"
          actions={getExpenseActions}
          class="absolute top-2 right-2"
        />
        <div class="flex items-center gap-2 mb-3 pr-8">
          <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <CashOutline class="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >{$t("expenses.title")}</span
          >
        </div>
        <div class="text-center py-2">
          <p class="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.advances.total}
          </p>
          {#if stats.advances.pending > 0}
            <p class="text-xs text-amber-600 dark:text-amber-400">
              {stats.advances.pending}
              {$t("statuses.pending").toLowerCase()}
            </p>
          {:else}
            <p class="text-xs text-gray-500 dark:text-gray-400">&nbsp;</p>
          {/if}
        </div>
        <div class="flex flex-wrap justify-center gap-2 text-xs">
          <span
            class="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded"
          >
            {stats.advances.disbursed}
            {$t("statuses.disbursed").toLowerCase()}
          </span>
          <span
            class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded"
          >
            {stats.advances.settled}
            {$t("statuses.settled").toLowerCase()}
          </span>
        </div>
        {#if advanceAlerts.length > 0}
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div
              class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
            >
              <ExclamationCircleOutline class="w-3 h-3" />
              {$t("dashboard.alertsCount", {
                values: { count: advanceAlerts.length },
              })}
            </div>
          </div>
        {/if}
      </Card>
    </div>

    <!-- Financial Summary Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Total Quotations Value (NEW) -->
      <Card
        class="max-w-none !p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10"
      >
        <div class="flex flex-col items-center text-center">
          <div class="p-3 bg-blue-200 dark:bg-blue-800 rounded-full mb-2">
            <FileLinesOutline
              class="w-6 h-6 text-blue-700 dark:text-blue-300"
            />
          </div>
          <p class="text-sm text-blue-700 dark:text-blue-400">
            {$t("dashboard.totalQuotationsValue")}
          </p>
          <p class="text-2xl font-bold text-blue-800 dark:text-blue-200">
            {formatCurrency(stats.quotations.totalValue || 0)}
          </p>
          <p class="text-xs text-blue-600 dark:text-blue-400">
            ≈ {formatUsd(stats.quotations.totalValueUsd || 0)}
          </p>
        </div>
      </Card>

      <!-- Approved Revenue -->
      <Card
        class="max-w-none !p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10"
      >
        <div class="flex flex-col items-center text-center">
          <div class="p-3 bg-emerald-200 dark:bg-emerald-800 rounded-full mb-2">
            <CheckCircleOutline
              class="w-6 h-6 text-emerald-700 dark:text-emerald-300"
            />
          </div>
          <p class="text-sm text-emerald-700 dark:text-emerald-400">
            {$t("dashboard.approvedQuotationsValue")}
          </p>
          <p class="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            {formatCurrency(stats.quotations.approvedValue)}
          </p>
          <p class="text-xs text-emerald-600 dark:text-emerald-400">
            ≈ {formatUsd(stats.quotations.approvedValueUsd || 0)}
          </p>
        </div>
      </Card>

      <!-- Receivables -->
      <Card
        class="max-w-none !p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10"
      >
        <div class="flex flex-col items-center text-center">
          <div class="p-3 bg-amber-200 dark:bg-amber-800 rounded-full mb-2">
            <ClockOutline class="w-6 h-6 text-amber-700 dark:text-amber-300" />
          </div>
          <p class="text-sm text-amber-700 dark:text-amber-400">
            {$t("dashboard.totalReceivables") || "Total Receivables"}
          </p>
          <p class="text-2xl font-bold text-amber-800 dark:text-amber-200">
            {formatCurrency(stats.invoices.totalReceivables)}
          </p>
          <p class="text-xs text-amber-600 dark:text-amber-400">
            ≈ {formatUsd(stats.invoices.totalReceivablesUsd || 0)}
          </p>
        </div>
      </Card>

      <!-- Outstanding Advances -->
      <Card
        class="max-w-none !p-5 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-900/10"
      >
        <div class="flex flex-col items-center text-center">
          <div class="p-3 bg-sky-200 dark:bg-sky-800 rounded-full mb-2">
            <CashOutline class="w-6 h-6 text-sky-700 dark:text-sky-300" />
          </div>
          <p class="text-sm text-sky-700 dark:text-sky-400">
            {$t("dashboard.outstandingAdvances") || "Outstanding Advances"}
          </p>
          <p class="text-2xl font-bold text-sky-800 dark:text-sky-200">
            {formatCurrency(stats.advances.outstandingAmount)}
          </p>
          <p class="text-xs text-sky-600 dark:text-sky-400">
            ≈ {formatUsd(stats.advances.outstandingAmountUsd || 0)}
          </p>
        </div>
      </Card>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Revenue Trend Chart -->
      <Card class="max-w-none !p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {$t("dashboard.revenueOverview") || "Revenue Overview"}
          </h3>
          <Select bind:value={revenueDays} class="w-32" size="sm">
            <option value={7}
              >{$t("dashboard.last7Days") || "Last 7 Days"}</option
            >
            <option value={30}
              >{$t("dashboard.last30Days") || "Last 30 Days"}</option
            >
            <option value={90}
              >{$t("dashboard.last90Days") || "Last 90 Days"}</option
            >
          </Select>
        </div>
        {#if revenueData.length > 0}
          <Chart options={revenueChartOptions} />
        {:else}
          <div
            class="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400"
          >
            {$t("common.noData")}
          </div>
        {/if}
      </Card>

      <!-- Quotation Pipeline Donut -->
      <Card class="max-w-none !p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {$t("dashboard.quotationPipeline") || "Quotation Pipeline"}
          </h3>
          <Button href="/quotations" size="xs" color="light">
            {$t("common.view")}
            <ArrowRightOutline class="w-3 h-3 ml-1" />
          </Button>
        </div>
        {#if pipelineData && pipelineData.total > 0}
          <Chart options={pipelineChartOptions} />
        {:else}
          <div
            class="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400"
          >
            {$t("common.noData")}
          </div>
        {/if}
      </Card>
    </div>

    <!-- Fleet & Activity Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Fleet Utilization -->
      <Card class="max-w-none !p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {$t("dashboard.fleetStatus") || "Fleet Status"}
          </h3>
          <Button href="/vehicles" size="xs" color="light">
            {$t("dashboard.manageFleet") || "Manage"}
            <ArrowRightOutline class="w-3 h-3 ml-1" />
          </Button>
        </div>
        {#if fleetData}
          <div class="space-y-4">
            <!-- Vehicles -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <TruckOutline
                    class="w-4 h-4 text-purple-600 dark:text-purple-400"
                  />
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >{$t("vehicles.title")}</span
                  >
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {fleetData.vehicles.inUse} / {fleetData.vehicles.active}
                </span>
              </div>
              <Progressbar
                progress={fleetData.vehicles.utilization}
                color="purple"
                size="h-2"
              />
              <div
                class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
                <span
                  >{fleetData.vehicles.available}
                  {$t("dashboard.available") || "available"}</span
                >
                {#if fleetData.vehicles.maintenance > 0}
                  <span class="text-amber-600 dark:text-amber-400">
                    {fleetData.vehicles.maintenance}
                    {$t("statuses.maintenance").toLowerCase()}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Drivers -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <UserOutline
                    class="w-4 h-4 text-green-600 dark:text-green-400"
                  />
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >{$t("drivers.title")}</span
                  >
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {fleetData.drivers.inUse} / {fleetData.drivers.active}
                </span>
              </div>
              <Progressbar
                progress={fleetData.drivers.utilization}
                color="green"
                size="h-2"
              />
              <div
                class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
                <span
                  >{fleetData.drivers.available}
                  {$t("dashboard.available") || "available"}</span
                >
                {#if fleetData.drivers.onLeave > 0}
                  <span class="text-violet-600 dark:text-violet-400">
                    {fleetData.drivers.onLeave}
                    {$t("statuses.on_leave").toLowerCase()}
                  </span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Quick Fleet Actions -->
          <div
            class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <Button
              href="/vehicles?action=new"
              size="xs"
              color="light"
              class="flex-1"
            >
              <PlusOutline class="w-3 h-3 mr-1" />
              {$t("vehicles.addVehicle")}
            </Button>
            <Button
              href="/drivers?action=new"
              size="xs"
              color="light"
              class="flex-1"
            >
              <PlusOutline class="w-3 h-3 mr-1" />
              {$t("drivers.addDriver")}
            </Button>
          </div>
        {:else}
          <div
            class="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400"
          >
            <Spinner size="4" />
          </div>
        {/if}
      </Card>

      <!-- Recent Activity -->
      <Card class="max-w-none !p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {$t("dashboard.recentActivity") || "Recent Activity"}
          </h3>
        </div>
        {#if activities.length > 0}
          <div class="space-y-3">
            {#each activities.slice(0, 8) as activity}
              {@const config =
                activityConfig[activity.type] || activityConfig.quotation}
              {@const ActivityIcon = config.icon}
              {@const entityUrl =
                activity.type === "quotation"
                  ? `/quotations/${activity.entityId}`
                  : activity.type === "itinerary"
                    ? `/itineraries/${activity.entityId}`
                    : activity.type === "invoice"
                      ? `/invoices/${activity.entityId}`
                      : `/expenses`}
              <a
                href={entityUrl}
                class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div class="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                  <ActivityIcon class="w-4 h-4 {config.color}" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-medium text-gray-900 dark:text-white text-sm"
                      >{activity.title}</span
                    >
                    <StatusBadge status={activity.action} size="sm" />
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {#if activity.descriptionKey && activity.descriptionParams}
                      {$t(activity.descriptionKey, {
                        values: activity.descriptionParams,
                      })}
                    {:else if activity.descriptionKey}
                      {$t(activity.descriptionKey)}
                    {:else}
                      {activity.description}
                    {/if}
                  </p>
                </div>
                <span
                  class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap"
                >
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </a>
            {/each}
          </div>
        {:else}
          <p class="text-center text-gray-500 dark:text-gray-400 py-8">
            {$t("common.noData")}
          </p>
        {/if}
      </Card>
    </div>

    <!-- Upcoming Itineraries -->
    <div class="grid grid-cols-1 gap-6">
      <Card class="max-w-none !p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {$t("dashboard.upcomingTrips") || "Upcoming Trips"}
          </h3>
          <Button href="/itineraries" size="xs" color="light">
            {$t("common.view")}
            <ArrowRightOutline class="w-3 h-3 ml-1" />
          </Button>
        </div>
        {#if upcomingItineraries.length > 0}
          <div class="space-y-3">
            {#each upcomingItineraries as itinerary}
              <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span
                        class="font-medium text-gray-900 dark:text-white text-sm"
                        >{itinerary.itineraryNumber}</span
                      >
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(itinerary.startDate)}
                      </span>
                    </div>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-400 truncate mb-2"
                    >
                      {itinerary.origin} → {itinerary.destination}
                    </p>
                    <div class="flex items-center gap-3 text-xs flex-wrap">
                      {#if itinerary.driverName}
                        <span
                          class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                        >
                          <UserOutline class="w-3 h-3" />
                          {itinerary.driverName}
                        </span>
                      {:else}
                        <span class="text-amber-600 dark:text-amber-400"
                          >{$t("itineraries.noDriverAssigned")}</span
                        >
                      {/if}
                      {#if itinerary.vehicleName}
                        <span
                          class="text-purple-600 dark:text-purple-400 flex items-center gap-1"
                        >
                          <TruckOutline class="w-3 h-3" />
                          {itinerary.vehicleName}
                        </span>
                      {:else}
                        <span class="text-amber-600 dark:text-amber-400"
                          >{$t("itineraries.noVehicleAssigned")}</span
                        >
                      {/if}
                    </div>
                  </div>
                </div>
                <!-- Action Buttons -->
                <div
                  class="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                >
                  {#if itinerary.driverId && itinerary.vehicleId}
                    <Button
                      size="xs"
                      color="green"
                      onclick={() => startTrip(itinerary._id)}
                      class="flex-1"
                    >
                      <PlayOutline class="w-3 h-3 mr-1" />
                      {$t("itineraries.startTrip") || "Start Trip"}
                    </Button>
                  {:else}
                    <Button
                      href="/itineraries/{itinerary._id}"
                      size="xs"
                      color="amber"
                      class="flex-1"
                    >
                      <UserOutline class="w-3 h-3 mr-1" />
                      {$t("itineraries.assignResources") || "Assign"}
                    </Button>
                  {/if}
                  <Button
                    href="/itineraries/{itinerary._id}"
                    size="xs"
                    color="light"
                    class="flex-1"
                  >
                    <EyeOutline class="w-3 h-3 mr-1" />
                    {$t("common.viewDetails") || "View"}
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
            {$t("dashboard.noUpcomingTrips") || "No upcoming trips scheduled"}
          </p>
        {/if}
      </Card>
    </div>
  {/if}
</div>

<style>
  :global(.apexcharts-legend-text) {
    color: #e5e7eb !important;
    fill: #e5e7eb !important;
  }

  :global(.apexcharts-xaxis-label),
  :global(.apexcharts-yaxis-label),
  :global(.apexcharts-datalabel-label),
  :global(.apexcharts-datalabel-value),
  :global(.apexcharts-text) {
    fill: #e5e7eb !important;
  }
</style>