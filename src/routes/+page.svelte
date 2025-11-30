<script lang="ts">
	import { Button, Card, Spinner, Alert } from 'flowbite-svelte';
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
		InfoCircleOutline
	} from 'flowbite-svelte-icons';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';

	let { data } = $props();

	// Use the new dashboard queries
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

	const stats = $derived(statsQuery.data);
	const alerts = $derived(alertsQuery.data || []);
	const activities = $derived(activityQuery.data || []);
	const upcomingItineraries = $derived(upcomingQuery.data || []);

	const isLoading = $derived(statsQuery.isLoading);

	// Danger alerts (license expired, overdue invoices)
	const dangerAlerts = $derived(alerts.filter((a) => a.type === 'danger'));
	const warningAlerts = $derived(alerts.filter((a) => a.type === 'warning'));
	const infoAlerts = $derived(alerts.filter((a) => a.type === 'info'));

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
					<span class="font-medium">{alert.title}:</span>
					{alert.message}
				</Alert>
			{/each}
		</div>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else if stats}
		<!-- Main Stats Grid -->
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
				<div class="mt-auto pt-3">
					<Button href="/quotations" size="xs" color="light" class="w-full">
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
				<div class="mt-auto pt-3">
					<Button href="/itineraries" size="xs" color="light" class="w-full">
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
				<div class="mt-auto pt-3">
					<Button href="/invoices" size="xs" color="light" class="w-full">
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
				<div class="mt-auto pt-3">
					<Button href="/expenses" size="xs" color="light" class="w-full">
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

		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Column: Activity & Alerts -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Recent Activity -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
							{$t('dashboard.recentActivity') || 'Recent Activity'}
						</h3>
					</div>
					{#if activities.length > 0}
						<div class="space-y-3">
							{#each activities.slice(0, 8) as activity}
								{@const config = activityConfig[activity.type] || activityConfig.quotation}
								<div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
									<div class="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
										<svelte:component this={config.icon} class="w-4 h-4 {config.color}" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-medium text-gray-900 dark:text-white text-sm">{activity.title}</span>
											<StatusBadge status={activity.action} size="sm" />
										</div>
										<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{activity.description}</p>
									</div>
									<span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
										{formatRelativeTime(activity.timestamp)}
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-center text-gray-500 dark:text-gray-400 py-8">
							{$t('common.noData')}
						</p>
					{/if}
				</Card>

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
										<p class="font-medium text-amber-800 dark:text-amber-200 text-sm">{alert.title}</p>
										<p class="text-xs text-amber-600 dark:text-amber-400">{alert.message}</p>
									</div>
								</div>
							{/each}
							{#each infoAlerts.slice(0, 3) as alert}
								<div class="flex items-start gap-3 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
									<InfoCircleOutline class="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
									<div>
										<p class="font-medium text-sky-800 dark:text-sky-200 text-sm">{alert.title}</p>
										<p class="text-xs text-sky-600 dark:text-sky-400">{alert.message}</p>
									</div>
								</div>
							{/each}
						</div>
					</Card>
				{/if}
			</div>

			<!-- Right Column: Upcoming & Quick Actions -->
			<div class="space-y-6">
				<!-- Upcoming Itineraries -->
				<Card class="max-w-none !p-6">
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
								<a
									href="/itineraries/{itinerary._id}"
									class="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
								>
									<div class="flex items-center justify-between mb-1">
										<span class="font-medium text-gray-900 dark:text-white text-sm">{itinerary.itineraryNumber}</span>
										<span class="text-xs text-gray-500 dark:text-gray-400">
											{formatDate(itinerary.startDate)}
										</span>
									</div>
									<p class="text-xs text-gray-500 dark:text-gray-400 truncate">
										{itinerary.origin} → {itinerary.destination}
									</p>
									<div class="flex items-center gap-2 mt-2 text-xs">
										{#if itinerary.driverName}
											<span class="text-emerald-600 dark:text-emerald-400">
												<UserOutline class="w-3 h-3 inline" />
												{itinerary.driverName}
											</span>
										{:else}
											<span class="text-amber-600 dark:text-amber-400">{$t('itineraries.noDriverAssigned')}</span>
										{/if}
										{#if itinerary.vehicleName}
											<span class="text-purple-600 dark:text-purple-400">
												<TruckOutline class="w-3 h-3 inline" />
												{itinerary.vehicleName}
											</span>
										{:else}
											<span class="text-amber-600 dark:text-amber-400">{$t('itineraries.noVehicleAssigned')}</span>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					{:else}
						<p class="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
							{$t('dashboard.noUpcomingTrips') || 'No upcoming trips scheduled'}
						</p>
					{/if}
				</Card>

				<!-- Quick Actions -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center gap-2 mb-4">
						<ChartPieOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('dashboard.quickActions')}</h3>
					</div>
					<div class="space-y-2">
						<a
							href="/quotations/new"
							class="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
						>
							<div class="flex items-center gap-3">
								<FileLinesOutline class="w-5 h-5 text-primary-600 dark:text-primary-400" />
								<span class="font-medium text-gray-900 dark:text-white text-sm">{$t('dashboard.createNewQuotation')}</span>
							</div>
							<ArrowRightOutline class="w-4 h-4 text-gray-400" />
						</a>
						<a
							href="/clients?action=new"
							class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<div class="flex items-center gap-3">
								<UsersOutline class="w-5 h-5 text-green-600 dark:text-green-400" />
								<span class="font-medium text-gray-900 dark:text-white text-sm">{$t('clients.addClient')}</span>
							</div>
							<ArrowRightOutline class="w-4 h-4 text-gray-400" />
						</a>
						<a
							href="/vehicles?action=new"
							class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<div class="flex items-center gap-3">
								<TruckOutline class="w-5 h-5 text-purple-600 dark:text-purple-400" />
								<span class="font-medium text-gray-900 dark:text-white text-sm">{$t('vehicles.addVehicle')}</span>
							</div>
							<ArrowRightOutline class="w-4 h-4 text-gray-400" />
						</a>
						<a
							href="/invoices"
							class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<div class="flex items-center gap-3">
								<CashOutline class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
								<span class="font-medium text-gray-900 dark:text-white text-sm">{$t('invoices.title')}</span>
							</div>
							<ArrowRightOutline class="w-4 h-4 text-gray-400" />
						</a>
						<a
							href="/settings"
							class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<div class="flex items-center gap-3">
								<CalendarMonthOutline class="w-5 h-5 text-gray-600 dark:text-gray-400" />
								<span class="font-medium text-gray-900 dark:text-white text-sm">{$t('dashboard.systemParameters')}</span>
							</div>
							<ArrowRightOutline class="w-4 h-4 text-gray-400" />
						</a>
					</div>
				</Card>
			</div>
		</div>
	{/if}
</div>
