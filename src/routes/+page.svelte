<script lang="ts">
	import { Button, Card, Spinner, Alert, Progressbar, Select } from 'flowbite-svelte';
	import {
		FileLinesOutline,
		UsersOutline,
		TruckOutline,
		UserOutline,
		PlusOutline,
		ArrowRightOutline,
		ChartPieOutline,
		CalendarMonthOutline,
		CashOutline,
		ExclamationCircleOutline,
		ClockOutline,
		CheckCircleOutline,
		InfoCircleOutline,
		PlayOutline,
		EyeOutline,
		FilterOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import type { ApexOptions } from 'apexcharts';
	import type { Id } from '$convex/_generated/dataModel';
	import { goto } from '$app/navigation';

	let { data } = $props();
	const client = useConvexClient();

	// Use the dashboard queries
	const statsQuery = useQuery(
		api.dashboard.getStats,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const alertsQuery = useQuery(
		api.dashboard.getAlerts,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const activityQuery = useQuery(
		api.dashboard.getRecentActivity,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId, limit: 10 } : 'skip')
	);
	const upcomingQuery = useQuery(
		api.dashboard.getUpcomingItineraries,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId, limit: 5 } : 'skip')
	);

	// Chart data queries
	let revenueDays = $state(7);
	const revenueQuery = useQuery(
		api.dashboard.getRevenueHistory,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId, days: revenueDays } : 'skip')
	);
	const pipelineQuery = useQuery(
		api.dashboard.getPipelineStats,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const fleetQuery = useQuery(
		api.dashboard.getFleetUtilization,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
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
	const dangerAlerts = $derived(alerts.filter((a) => a.type === 'danger'));
	const warningAlerts = $derived(alerts.filter((a) => a.type === 'warning'));
	const infoAlerts = $derived(alerts.filter((a) => a.type === 'info'));

	// Revenue Chart Options
	const revenueChartOptions = $derived<ApexOptions>({
		chart: {
			type: 'area',
			height: 200,
			fontFamily: 'Inter, sans-serif',
			toolbar: { show: false },
			zoom: { enabled: false },
			sparkline: { enabled: false }
		},
		series: [{
			name: $t('dashboard.revenue') || 'Revenue',
			data: revenueData.map(d => d.value)
		}],
		colors: ['#0ea5e9'],
		fill: {
			type: 'gradient',
			gradient: {
				shadeIntensity: 1,
				opacityFrom: 0.45,
				opacityTo: 0.05,
				stops: [0, 100]
			}
		},
		stroke: {
			curve: 'smooth',
			width: 2
		},
		xaxis: {
			categories: revenueData.map(d => {
				const date = new Date(d.date);
				return date.toLocaleDateString('es-HN', { month: 'short', day: 'numeric' });
			}),
			labels: {
				show: true,
				style: { colors: '#f3f4f6', fontSize: '10px' }
			},
			axisBorder: { show: false },
			axisTicks: { show: false }
		},
		yaxis: {
			show: false
		},
		grid: {
			show: false,
			padding: { left: 0, right: 0 }
		},
		tooltip: {
			enabled: true,
			y: {
				formatter: (value: number) => formatCurrency(value)
			}
		},
		dataLabels: { enabled: false }
	});

	// Pipeline Donut Chart Options
	const pipelineChartOptions = $derived<ApexOptions>({
		chart: {
			type: 'donut',
			height: 200,
			fontFamily: 'Inter, sans-serif'
		},
		series: pipelineData ? [
			pipelineData.draft,
			pipelineData.sent,
			pipelineData.approved,
			pipelineData.rejected,
			pipelineData.expired
		] : [],
		colors: ['#9ca3af', '#3b82f6', '#10b981', '#ef4444', '#f59e0b'],
		labels: [
			$t('statuses.draft') || 'Draft',
			$t('statuses.sent') || 'Sent',
			$t('statuses.approved') || 'Approved',
			$t('statuses.rejected') || 'Rejected',
			$t('statuses.expired') || 'Expired'
		],
		legend: {
			position: 'right',
			fontSize: '12px',
			labels: { colors: '#f3f4f6' }
		},
		dataLabels: { enabled: false },
		plotOptions: {
			pie: {
				donut: {
					size: '70%',
					labels: {
						show: true,
						name: { show: true, colors: '#f3f4f6' },
						value: { show: true, fontSize: '16px', fontWeight: 600, color: '#ffffff' },
						total: {
							show: true,
							label: 'Total',
							fontSize: '12px',
							color: '#f3f4f6'
						}
					}
				}
			}
		}
	});

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('es-HN', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(timestamp));
	}

	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return $t('dashboard.justNow') || 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return formatDate(timestamp);
	}

	const greeting = $derived(() => {
		const hour = new Date().getHours();
		if (hour < 12) return $t('dashboard.goodMorning') || 'Good morning';
		if (hour < 18) return $t('dashboard.goodAfternoon') || 'Good afternoon';
		return $t('dashboard.goodEvening') || 'Good evening';
	});

	const userName = $derived(
		data.user?.firstName || data.user?.email?.split('@')[0] || 'there'
	);

	// Activity type icons and colors
	const activityConfig: Record<string, { icon: typeof FileLinesOutline; color: string }> = {
		quotation: { icon: FileLinesOutline, color: 'text-blue-500' },
		itinerary: { icon: CalendarMonthOutline, color: 'text-cyan-500' },
		invoice: { icon: CashOutline, color: 'text-emerald-500' },
		advance: { icon: CashOutline, color: 'text-amber-500' }
	};

	// Start trip action
	async function startTrip(itineraryId: Id<'itineraries'>) {
		try {
			await client.mutation(api.itineraries.updateStatus, {
				id: itineraryId,
				status: 'in_progress'
			});
		} catch (error) {
			console.error('Failed to start trip:', error);
		}
	}
</script>

<div class="space-y-6">
	<!-- Welcome Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
				{greeting()}, {userName}!
			</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('dashboard.subtitle')}
			</p>
		</div>
		<Button href="/quotations/new">
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('dashboard.newQuotation')}
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
		<!-- Main Stats Grid with Dual Actions -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
			<!-- Quotations -->
			<Card class="max-w-none !p-4 flex flex-col h-full">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
							<FileLinesOutline class="w-4 h-4 text-blue-600 dark:text-blue-400" />
						</div>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('dashboard.quotations')}</span>
					</div>
					<span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
						{stats.quotations.conversionRate.toFixed(0)}%
					</span>
				</div>
				<p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.quotations.total}</p>
				<div class="mt-2 flex gap-2 text-xs flex-wrap">
					<span class="text-amber-600 dark:text-amber-400">{stats.quotations.draft} {$t('statuses.draft').toLowerCase()}</span>
					<span class="text-emerald-600 dark:text-emerald-400">{stats.quotations.approved} {$t('statuses.approved').toLowerCase()}</span>
				</div>
				<div class="mt-auto pt-3 flex gap-2">
					<Button href="/quotations/new" size="xs" color="primary" class="flex-1">
						<PlusOutline class="w-3 h-3 mr-1" />
						{$t('common.new')}
					</Button>
					<Button href="/quotations" size="xs" color="light" class="flex-1">
						{$t('common.view')}
						<ArrowRightOutline class="w-3 h-3 ml-1" />
					</Button>
				</div>
			</Card>

			<!-- Itineraries -->
			<Card class="max-w-none !p-4 flex flex-col h-full">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<div class="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
							<CalendarMonthOutline class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
						</div>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('dashboard.itineraries')}</span>
					</div>
					<span class="text-xs text-amber-600 dark:text-amber-400 font-medium">
						{stats.itineraries.inProgress} {$t('dashboard.inProgress')}
					</span>
				</div>
				<p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.itineraries.total}</p>
				<div class="mt-2 flex gap-2 text-xs flex-wrap">
					<span class="text-sky-600 dark:text-sky-400">{stats.itineraries.scheduled} {$t('dashboard.scheduled')}</span>
					<span class="text-emerald-600 dark:text-emerald-400">{stats.itineraries.completed} {$t('statuses.completed').toLowerCase()}</span>
				</div>
				<div class="mt-auto pt-3 flex gap-2">
					<Button href="/quotations?status=approved" size="xs" color="primary" class="flex-1">
						<PlusOutline class="w-3 h-3 mr-1" />
						{$t('common.new')}
					</Button>
					<Button href="/itineraries" size="xs" color="light" class="flex-1">
						{$t('common.view')}
						<ArrowRightOutline class="w-3 h-3 ml-1" />
					</Button>
				</div>
			</Card>

			<!-- Invoices -->
			<Card class="max-w-none !p-4 flex flex-col h-full">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
							<CashOutline class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						</div>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('invoices.title')}</span>
					</div>
					{#if stats.invoices.overdue > 0}
						<span class="text-xs text-red-600 dark:text-red-400 font-medium">
							{stats.invoices.overdue} {$t('statuses.overdue').toLowerCase()}
						</span>
					{/if}
				</div>
				<p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.invoices.total}</p>
				<div class="mt-2 flex gap-2 text-xs flex-wrap">
					<span class="text-rose-600 dark:text-rose-400">{stats.invoices.unpaid} {$t('statuses.unpaid').toLowerCase()}</span>
					<span class="text-emerald-600 dark:text-emerald-400">{stats.invoices.paid} {$t('statuses.paid').toLowerCase()}</span>
				</div>
				<div class="mt-auto pt-3 flex gap-2">
					<Button href="/invoices?status=unpaid" size="xs" color="primary" class="flex-1">
						<FilterOutline class="w-3 h-3 mr-1" />
						{$t('statuses.unpaid')}
					</Button>
					<Button href="/invoices" size="xs" color="light" class="flex-1">
						{$t('common.view')}
						<ArrowRightOutline class="w-3 h-3 ml-1" />
					</Button>
				</div>
			</Card>

			<!-- Expenses -->
			<Card class="max-w-none !p-4 flex flex-col h-full">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
							<CashOutline class="w-4 h-4 text-amber-600 dark:text-amber-400" />
						</div>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('expenses.title')}</span>
					</div>
					{#if stats.advances.pending > 0}
						<span class="text-xs text-amber-600 dark:text-amber-400 font-medium">
							{stats.advances.pending} {$t('statuses.pending').toLowerCase()}
						</span>
					{/if}
				</div>
				<p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.advances.total}</p>
				<div class="mt-2 flex gap-2 text-xs flex-wrap">
					<span class="text-sky-600 dark:text-sky-400">{stats.advances.disbursed} {$t('statuses.disbursed').toLowerCase()}</span>
					<span class="text-emerald-600 dark:text-emerald-400">{stats.advances.settled} {$t('statuses.settled').toLowerCase()}</span>
				</div>
				<div class="mt-auto pt-3 flex gap-2">
					<Button href="/expenses?status=pending" size="xs" color="primary" class="flex-1">
						<FilterOutline class="w-3 h-3 mr-1" />
						{$t('statuses.pending')}
					</Button>
					<Button href="/expenses" size="xs" color="light" class="flex-1">
						{$t('common.view')}
						<ArrowRightOutline class="w-3 h-3 ml-1" />
					</Button>
				</div>
			</Card>

		</div>

		<!-- Financial Summary Row -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Approved Revenue -->
			<Card class="max-w-none !p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10">
				<div class="flex items-center gap-3">
					<div class="p-3 bg-emerald-200 dark:bg-emerald-800 rounded-full">
						<CheckCircleOutline class="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
					</div>
					<div>
						<p class="text-sm text-emerald-700 dark:text-emerald-400">{$t('dashboard.approvedQuotationsValue')}</p>
						<p class="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
							{formatCurrency(stats.quotations.approvedValue)}
						</p>
					</div>
				</div>
			</Card>

			<!-- Receivables -->
			<Card class="max-w-none !p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10">
				<div class="flex items-center gap-3">
					<div class="p-3 bg-amber-200 dark:bg-amber-800 rounded-full">
						<ClockOutline class="w-6 h-6 text-amber-700 dark:text-amber-300" />
					</div>
					<div>
						<p class="text-sm text-amber-700 dark:text-amber-400">{$t('dashboard.totalReceivables') || 'Total Receivables'}</p>
						<p class="text-2xl font-bold text-amber-800 dark:text-amber-200">
							{formatCurrency(stats.invoices.totalReceivables)}
						</p>
					</div>
				</div>
			</Card>

			<!-- Outstanding Advances -->
			<Card class="max-w-none !p-5 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-900/10">
				<div class="flex items-center gap-3">
					<div class="p-3 bg-sky-200 dark:bg-sky-800 rounded-full">
						<CashOutline class="w-6 h-6 text-sky-700 dark:text-sky-300" />
					</div>
					<div>
						<p class="text-sm text-sky-700 dark:text-sky-400">{$t('dashboard.outstandingAdvances') || 'Outstanding Advances'}</p>
						<p class="text-2xl font-bold text-sky-800 dark:text-sky-200">
							{formatCurrency(stats.advances.outstandingAmount)}
						</p>
					</div>
				</div>
			</Card>
		</div>

		<!-- Charts Row -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Revenue Trend Chart -->
			<Card class="max-w-none !p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{$t('dashboard.revenueOverview') || 'Revenue Overview'}
					</h3>
					<Select bind:value={revenueDays} class="w-32" size="sm">
						<option value={7}>{$t('dashboard.last7Days') || 'Last 7 Days'}</option>
						<option value={30}>{$t('dashboard.last30Days') || 'Last 30 Days'}</option>
						<option value={90}>{$t('dashboard.last90Days') || 'Last 90 Days'}</option>
					</Select>
				</div>
				{#if revenueData.length > 0}
					<Chart options={revenueChartOptions} />
				{:else}
					<div class="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
						{$t('common.noData')}
					</div>
				{/if}
			</Card>

			<!-- Quotation Pipeline Donut -->
			<Card class="max-w-none !p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{$t('dashboard.quotationPipeline') || 'Quotation Pipeline'}
					</h3>
					<Button href="/quotations" size="xs" color="light">
						{$t('common.view')}
						<ArrowRightOutline class="w-3 h-3 ml-1" />
					</Button>
				</div>
				{#if pipelineData && pipelineData.total > 0}
					<Chart options={pipelineChartOptions} />
				{:else}
					<div class="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
						{$t('common.noData')}
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
						{$t('dashboard.fleetStatus') || 'Fleet Status'}
					</h3>
					<Button href="/vehicles" size="xs" color="light">
						{$t('dashboard.manageFleet') || 'Manage'}
						<ArrowRightOutline class="w-3 h-3 ml-1" />
					</Button>
				</div>
				{#if fleetData}
					<div class="space-y-4">
						<!-- Vehicles -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-2">
									<TruckOutline class="w-4 h-4 text-purple-600 dark:text-purple-400" />
									<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('vehicles.title')}</span>
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
							<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
								<span>{fleetData.vehicles.available} {$t('dashboard.available') || 'available'}</span>
								{#if fleetData.vehicles.maintenance > 0}
									<span class="text-amber-600 dark:text-amber-400">
										{fleetData.vehicles.maintenance} {$t('statuses.maintenance').toLowerCase()}
									</span>
								{/if}
							</div>
						</div>

						<!-- Drivers -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-2">
									<UserOutline class="w-4 h-4 text-green-600 dark:text-green-400" />
									<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('drivers.title')}</span>
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
							<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
								<span>{fleetData.drivers.available} {$t('dashboard.available') || 'available'}</span>
								{#if fleetData.drivers.onLeave > 0}
									<span class="text-violet-600 dark:text-violet-400">
										{fleetData.drivers.onLeave} {$t('statuses.on_leave').toLowerCase()}
									</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Quick Fleet Actions -->
					<div class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
						<Button href="/vehicles?action=new" size="xs" color="light" class="flex-1">
							<PlusOutline class="w-3 h-3 mr-1" />
							{$t('vehicles.addVehicle')}
						</Button>
						<Button href="/drivers?action=new" size="xs" color="light" class="flex-1">
							<PlusOutline class="w-3 h-3 mr-1" />
							{$t('drivers.addDriver')}
						</Button>
					</div>
				{:else}
					<div class="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
						<Spinner size="4" />
					</div>
				{/if}
			</Card>

			<!-- Recent Activity -->
			<Card class="max-w-none !p-6 lg:col-span-2">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{$t('dashboard.recentActivity') || 'Recent Activity'}
					</h3>
				</div>
				{#if activities.length > 0}
					<div class="space-y-3">
						{#each activities.slice(0, 8) as activity}
							{@const config = activityConfig[activity.type] || activityConfig.quotation}
							{@const entityUrl = activity.type === 'quotation' ? `/quotations/${activity.entityId}`
								: activity.type === 'itinerary' ? `/itineraries/${activity.entityId}`
								: activity.type === 'invoice' ? `/invoices/${activity.entityId}`
								: `/expenses`}
							<a
								href={entityUrl}
								class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
									<svelte:component this={config.icon} class="w-4 h-4 {config.color}" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-medium text-gray-900 dark:text-white text-sm">{activity.title}</span>
										<StatusBadge status={activity.action} size="sm" />
									</div>
									<p class="text-xs text-gray-500 dark:text-gray-400 truncate">
										{#if activity.descriptionKey && activity.descriptionParams}
											{$t(activity.descriptionKey, { values: activity.descriptionParams })}
										{:else if activity.descriptionKey}
											{$t(activity.descriptionKey)}
										{:else}
											{activity.description}
										{/if}
									</p>
								</div>
								<span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
									{formatRelativeTime(activity.timestamp)}
								</span>
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-center text-gray-500 dark:text-gray-400 py-8">
						{$t('common.noData')}
					</p>
				{/if}
			</Card>
		</div>

		<!-- Upcoming & Quick Actions Row -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Upcoming Itineraries with Actions -->
			<Card class="max-w-none !p-6 lg:col-span-2">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{$t('dashboard.upcomingTrips') || 'Upcoming Trips'}
					</h3>
					<Button href="/itineraries" size="xs" color="light">
						{$t('common.view')}
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
											<span class="font-medium text-gray-900 dark:text-white text-sm">{itinerary.itineraryNumber}</span>
											<span class="text-xs text-gray-500 dark:text-gray-400">
												{formatDate(itinerary.startDate)}
											</span>
										</div>
										<p class="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
											{itinerary.origin} → {itinerary.destination}
										</p>
										<div class="flex items-center gap-3 text-xs flex-wrap">
											{#if itinerary.driverName}
												<span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
													<UserOutline class="w-3 h-3" />
													{itinerary.driverName}
												</span>
											{:else}
												<span class="text-amber-600 dark:text-amber-400">{$t('itineraries.noDriverAssigned')}</span>
											{/if}
											{#if itinerary.vehicleName}
												<span class="text-purple-600 dark:text-purple-400 flex items-center gap-1">
													<TruckOutline class="w-3 h-3" />
													{itinerary.vehicleName}
												</span>
											{:else}
												<span class="text-amber-600 dark:text-amber-400">{$t('itineraries.noVehicleAssigned')}</span>
											{/if}
										</div>
									</div>
								</div>
								<!-- Action Buttons -->
								<div class="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
									{#if itinerary.driverId && itinerary.vehicleId}
										<Button
											size="xs"
											color="green"
											onclick={() => startTrip(itinerary._id)}
											class="flex-1"
										>
											<PlayOutline class="w-3 h-3 mr-1" />
											{$t('itineraries.startTrip') || 'Start Trip'}
										</Button>
									{:else}
										<Button
											href="/itineraries/{itinerary._id}"
											size="xs"
											color="amber"
											class="flex-1"
										>
											<UserOutline class="w-3 h-3 mr-1" />
											{$t('itineraries.assignResources') || 'Assign'}
										</Button>
									{/if}
									<Button
										href="/itineraries/{itinerary._id}"
										size="xs"
										color="light"
										class="flex-1"
									>
										<EyeOutline class="w-3 h-3 mr-1" />
										{$t('common.viewDetails') || 'View'}
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
						{$t('dashboard.noUpcomingTrips') || 'No upcoming trips scheduled'}
					</p>
				{/if}
			</Card>

			<!-- Quick Actions (Organized by Category) -->
			<Card class="max-w-none !p-6">
				<div class="flex items-center gap-2 mb-4">
					<ChartPieOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('dashboard.quickActions')}</h3>
				</div>
				<div class="space-y-4">
					<!-- Quotations Section -->
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
							{$t('dashboard.quotations')}
						</p>
						<div class="space-y-1">
							<a
								href="/quotations/new"
								class="flex items-center justify-between p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
							>
								<div class="flex items-center gap-2">
									<PlusOutline class="w-4 h-4 text-primary-600 dark:text-primary-400" />
									<span class="text-sm text-gray-900 dark:text-white">{$t('dashboard.createNewQuotation')}</span>
								</div>
							</a>
							<a
								href="/quotations?status=sent"
								class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="flex items-center gap-2">
									<FilterOutline class="w-4 h-4 text-blue-600 dark:text-blue-400" />
									<span class="text-sm text-gray-900 dark:text-white">{$t('dashboard.viewPending') || 'View Pending'}</span>
								</div>
							</a>
						</div>
					</div>

					<!-- Itineraries Section -->
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
							{$t('dashboard.itineraries')}
						</p>
						<div class="space-y-1">
							<a
								href="/itineraries?filter=today"
								class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="flex items-center gap-2">
									<CalendarMonthOutline class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
									<span class="text-sm text-gray-900 dark:text-white">{$t('dashboard.todaysTrips') || "Today's Trips"}</span>
								</div>
							</a>
							<a
								href="/itineraries?filter=unassigned"
								class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="flex items-center gap-2">
									<ExclamationCircleOutline class="w-4 h-4 text-amber-600 dark:text-amber-400" />
									<span class="text-sm text-gray-900 dark:text-white">{$t('dashboard.unassigned') || 'Unassigned'}</span>
								</div>
							</a>
						</div>
					</div>

					<!-- Invoices Section -->
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
							{$t('invoices.title')}
						</p>
						<div class="space-y-1">
							<a
								href="/invoices?status=unpaid"
								class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="flex items-center gap-2">
									<CashOutline class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									<span class="text-sm text-gray-900 dark:text-white">{$t('statuses.unpaid')}</span>
								</div>
							</a>
							<a
								href="/invoices?status=overdue"
								class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="flex items-center gap-2">
									<ExclamationCircleOutline class="w-4 h-4 text-red-600 dark:text-red-400" />
									<span class="text-sm text-gray-900 dark:text-white">{$t('statuses.overdue')}</span>
								</div>
							</a>
						</div>
					</div>

					<!-- Clients Section -->
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
							{$t('clients.title')}
						</p>
						<div class="space-y-1">
							<a
								href="/clients?action=new"
								class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="flex items-center gap-2">
									<UsersOutline class="w-4 h-4 text-green-600 dark:text-green-400" />
									<span class="text-sm text-gray-900 dark:text-white">{$t('clients.addClient')}</span>
								</div>
							</a>
						</div>
					</div>

					<!-- Settings -->
					<div class="pt-2 border-t border-gray-200 dark:border-gray-700">
						<a
							href="/settings"
							class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<div class="flex items-center gap-2">
								<ChartPieOutline class="w-4 h-4 text-gray-600 dark:text-gray-400" />
								<span class="text-sm text-gray-900 dark:text-white">{$t('dashboard.systemParameters')}</span>
							</div>
						</a>
					</div>
				</div>
			</Card>
		</div>

		<!-- Warnings & Info Alerts -->
		{#if warningAlerts.length > 0 || infoAlerts.length > 0}
			<Card class="max-w-none !p-6">
				<div class="flex items-center gap-2 mb-4">
					<ExclamationCircleOutline class="w-5 h-5 text-amber-500" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{$t('dashboard.alerts') || 'Alerts'}
					</h3>
				</div>
				<div class="space-y-2">
					{#each warningAlerts.slice(0, 5) as alert}
						<div class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
							<ExclamationCircleOutline class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
							<div>
								{#if alert.messageKey && alert.messageParams}
									<p class="font-medium text-amber-800 dark:text-amber-200 text-sm">
										{$t(alert.messageKey, { values: alert.messageParams })}
									</p>
								{:else if alert.titleKey && alert.messageKey}
									<p class="font-medium text-amber-800 dark:text-amber-200 text-sm">{$t(alert.titleKey)}</p>
									<p class="text-xs text-amber-600 dark:text-amber-400">{$t(alert.messageKey)}</p>
								{:else}
									<p class="font-medium text-amber-800 dark:text-amber-200 text-sm">{alert.title}</p>
									<p class="text-xs text-amber-600 dark:text-amber-400">{alert.message}</p>
								{/if}
							</div>
						</div>
					{/each}
					{#each infoAlerts.slice(0, 3) as alert}
						<div class="flex items-start gap-3 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
							<InfoCircleOutline class="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
							<div>
								{#if alert.messageKey && alert.messageParams}
									<p class="font-medium text-sky-800 dark:text-sky-200 text-sm">
										{$t(alert.messageKey, { values: alert.messageParams })}
									</p>
								{:else if alert.titleKey && alert.messageKey}
									<p class="font-medium text-sky-800 dark:text-sky-200 text-sm">{$t(alert.titleKey)}</p>
									<p class="text-xs text-sky-600 dark:text-sky-400">{$t(alert.messageKey)}</p>
								{:else}
									<p class="font-medium text-sky-800 dark:text-sky-200 text-sm">{alert.title}</p>
									<p class="text-xs text-sky-600 dark:text-sky-400">{alert.message}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	{/if}
</div>
