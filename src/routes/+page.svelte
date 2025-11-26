<script lang="ts">
	import { Button, Card, Spinner } from 'flowbite-svelte';
	import {
		FileLinesOutline,
		UsersOutline,
		TruckOutline,
		UserOutline,
		PlusOutline,
		ArrowRightOutline,
		ChartPieOutline,
		CalendarMonthOutline,
		DollarOutline
	} from 'flowbite-svelte-icons';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';

	let { data } = $props();

	// Query all stats when tenant is available
	const vehiclesQuery = useQuery(
		api.vehicles.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const driversQuery = useQuery(
		api.drivers.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const quotationsQuery = useQuery(
		api.quotations.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const itinerariesQuery = useQuery(
		api.itineraries.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const vehicles = $derived(vehiclesQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const drivers = $derived(driversQuery.data || []);
	const quotations = $derived(quotationsQuery.data || []);
	const itineraries = $derived(itinerariesQuery.data || []);

	const isLoading = $derived(
		vehiclesQuery.isLoading || clientsQuery.isLoading || driversQuery.isLoading || quotationsQuery.isLoading || itinerariesQuery.isLoading
	);

	// Computed stats
	const activeVehicles = $derived(vehicles.filter((v) => v.status === 'active').length);
	const activeDrivers = $derived(drivers.filter((d) => d.status === 'active').length);
	const recentQuotations = $derived(
		quotations
			.filter((q) => q.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000)
			.length
	);
	const pendingQuotations = $derived(quotations.filter((q) => q.status === 'draft').length);
	const approvedQuotations = $derived(quotations.filter((q) => q.status === 'approved').length);
	const scheduledItineraries = $derived(itineraries.filter((i) => i.status === 'scheduled').length);
	const inProgressItineraries = $derived(itineraries.filter((i) => i.status === 'in_progress').length);

	// Calculate total revenue from approved quotations
	const totalRevenue = $derived(
		quotations
			.filter((q) => q.status === 'approved')
			.reduce((sum, q) => sum + q.salePriceHnl, 0)
	);

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
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
</script>

<div class="space-y-8">
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

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
			<!-- Quotations Card -->
			<Card class="max-w-none !p-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('dashboard.quotations')}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">{quotations.length}</p>
					</div>
					<div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
						<FileLinesOutline class="w-6 h-6 text-blue-600 dark:text-blue-400" />
					</div>
				</div>
				<div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					{pendingQuotations} {$t('dashboard.pending')}, {approvedQuotations} {$t('dashboard.approved')}
				</div>
				<Button href="/quotations" size="xs" color="light" class="w-full mt-3">
					{$t('common.view')}
					<ArrowRightOutline class="w-3 h-3 ml-1" />
				</Button>
			</Card>

			<!-- Itineraries Card -->
			<Card class="max-w-none !p-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('dashboard.itineraries')}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">{itineraries.length}</p>
					</div>
					<div class="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-full">
						<CalendarMonthOutline class="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
					</div>
				</div>
				<div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					{scheduledItineraries} {$t('dashboard.scheduled')}, {inProgressItineraries} {$t('dashboard.inProgress')}
				</div>
				<Button href="/itineraries" size="xs" color="light" class="w-full mt-3">
					{$t('common.view')}
					<ArrowRightOutline class="w-3 h-3 ml-1" />
				</Button>
			</Card>

			<!-- Clients Card -->
			<Card class="max-w-none !p-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('dashboard.clients')}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</p>
					</div>
					<div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
						<UsersOutline class="w-6 h-6 text-green-600 dark:text-green-400" />
					</div>
				</div>
				<div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					{clients.filter((c) => c.status === 'active').length} {$t('dashboard.activeClients')}
				</div>
				<Button href="/clients" size="xs" color="light" class="w-full mt-3">
					{$t('common.view')}
					<ArrowRightOutline class="w-3 h-3 ml-1" />
				</Button>
			</Card>

			<!-- Vehicles Card -->
			<Card class="max-w-none !p-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('dashboard.vehicles')}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">{vehicles.length}</p>
					</div>
					<div class="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
						<TruckOutline class="w-6 h-6 text-purple-600 dark:text-purple-400" />
					</div>
				</div>
				<div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					{activeVehicles} {$t('dashboard.available')}
				</div>
				<Button href="/vehicles" size="xs" color="light" class="w-full mt-3">
					{$t('common.view')}
					<ArrowRightOutline class="w-3 h-3 ml-1" />
				</Button>
			</Card>

			<!-- Drivers Card -->
			<Card class="max-w-none !p-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('dashboard.drivers')}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">{drivers.length}</p>
					</div>
					<div class="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
						<UserOutline class="w-6 h-6 text-orange-600 dark:text-orange-400" />
					</div>
				</div>
				<div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					{activeDrivers} {$t('dashboard.active')}
				</div>
				<Button href="/drivers" size="xs" color="light" class="w-full mt-3">
					{$t('common.view')}
					<ArrowRightOutline class="w-3 h-3 ml-1" />
				</Button>
			</Card>
		</div>

		<!-- Revenue & Activity Section -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Revenue Overview -->
			<Card class="max-w-none !p-6">
				<div class="flex items-center gap-2 mb-4">
					<DollarOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('dashboard.revenueOverview')}</h3>
				</div>
				<div class="space-y-4">
					<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<p class="text-sm text-gray-500 dark:text-gray-400">{$t('dashboard.approvedQuotationsValue')}</p>
						<p class="text-3xl font-bold text-green-600 dark:text-green-400">
							{formatCurrency(totalRevenue)}
						</p>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('dashboard.last30Days')}</p>
							<p class="text-xl font-semibold text-gray-900 dark:text-white">{recentQuotations} {$t('dashboard.quotes')}</p>
						</div>
						<div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('common.pending')}</p>
							<p class="text-xl font-semibold text-gray-900 dark:text-white">{pendingQuotations} {$t('dashboard.drafts')}</p>
						</div>
					</div>
				</div>
			</Card>

			<!-- Quick Actions -->
			<Card class="max-w-none !p-6">
				<div class="flex items-center gap-2 mb-4">
					<ChartPieOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('dashboard.quickActions')}</h3>
				</div>
				<div class="space-y-3">
					<a
						href="/quotations/new"
						class="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
					>
						<div class="flex items-center gap-3">
							<FileLinesOutline class="w-5 h-5 text-primary-600 dark:text-primary-400" />
							<span class="font-medium text-gray-900 dark:text-white">{$t('dashboard.createNewQuotation')}</span>
						</div>
						<ArrowRightOutline class="w-4 h-4 text-gray-400" />
					</a>
					<a
						href="/clients"
						class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					>
						<div class="flex items-center gap-3">
							<UsersOutline class="w-5 h-5 text-gray-600 dark:text-gray-400" />
							<span class="font-medium text-gray-900 dark:text-white">{$t('dashboard.manageClients')}</span>
						</div>
						<ArrowRightOutline class="w-4 h-4 text-gray-400" />
					</a>
					<a
						href="/vehicles"
						class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					>
						<div class="flex items-center gap-3">
							<TruckOutline class="w-5 h-5 text-gray-600 dark:text-gray-400" />
							<span class="font-medium text-gray-900 dark:text-white">{$t('dashboard.viewFleet')}</span>
						</div>
						<ArrowRightOutline class="w-4 h-4 text-gray-400" />
					</a>
					<a
						href="/settings"
						class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					>
						<div class="flex items-center gap-3">
							<CalendarMonthOutline class="w-5 h-5 text-gray-600 dark:text-gray-400" />
							<span class="font-medium text-gray-900 dark:text-white">{$t('dashboard.systemParameters')}</span>
						</div>
						<ArrowRightOutline class="w-4 h-4 text-gray-400" />
					</a>
				</div>
			</Card>
		</div>

		<!-- Recent Quotations -->
		{#if quotations.length > 0}
			<Card class="max-w-none !p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('dashboard.recentQuotations')}</h3>
					<Button href="/quotations" size="xs" color="light">
						{$t('dashboard.viewAll')}
						<ArrowRightOutline class="w-3 h-3 ml-1" />
					</Button>
				</div>
				<div class="space-y-3">
					{#each quotations.slice(0, 5) as quote}
						<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div>
								<p class="font-medium text-gray-900 dark:text-white">{quote.quotationNumber}</p>
								<p class="text-sm text-gray-500 dark:text-gray-400">
									{quote.origin} → {quote.destination}
								</p>
							</div>
							<div class="text-right">
								<p class="font-semibold text-gray-900 dark:text-white">
									{formatCurrency(quote.salePriceHnl)}
								</p>
								<StatusBadge status={quote.status} variant="quotation" />
							</div>
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	{/if}
</div>
