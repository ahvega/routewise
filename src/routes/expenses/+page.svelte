<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import {
		Card,
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Button,
		Select,
		Input,
		Spinner
	} from 'flowbite-svelte';
	import {
		PlusOutline,
		EyeOutline,
		SearchOutline,
		CashOutline,
		ClockOutline,
		CheckCircleOutline,
		ExclamationCircleOutline
	} from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import { tenantStore } from '$lib/stores';

	let statusFilter = $state('');
	let searchQuery = $state('');

	const advancesQuery = useQuery(
		api.expenseAdvances.list,
		() => (tenantStore.tenantId ? {
			tenantId: tenantStore.tenantId,
			status: statusFilter || undefined
		} : 'skip')
	);

	const statsQuery = useQuery(
		api.expenseAdvances.getStats,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Also fetch itineraries and drivers for display
	const itinerariesQuery = useQuery(
		api.itineraries.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const driversQuery = useQuery(
		api.drivers.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const advances = $derived(advancesQuery.data ?? []);
	const stats = $derived(statsQuery.data);
	const itineraries = $derived(itinerariesQuery.data ?? []);
	const drivers = $derived(driversQuery.data ?? []);

	// Create lookup maps
	const itineraryMap = $derived(
		new Map(itineraries.map((i) => [i._id, i]))
	);
	const driverMap = $derived(
		new Map(drivers.map((d) => [d._id, d]))
	);

	// Filter advances by search
	const filteredAdvances = $derived(
		advances.filter((advance) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			const itinerary = itineraryMap.get(advance.itineraryId);
			const driver = advance.driverId ? driverMap.get(advance.driverId) : null;
			return (
				advance.advanceNumber.toLowerCase().includes(query) ||
				advance.purpose.toLowerCase().includes(query) ||
				(itinerary && (
					itinerary.itineraryNumber.toLowerCase().includes(query) ||
					itinerary.origin.toLowerCase().includes(query) ||
					itinerary.destination.toLowerCase().includes(query)
				)) ||
				(driver && (
					driver.firstName.toLowerCase().includes(query) ||
					driver.lastName.toLowerCase().includes(query)
				))
			);
		})
	);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 2
		}).format(amount);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('es-HN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getDriverName(driverId: Id<'drivers'> | undefined): string {
		if (!driverId) return '-';
		const driver = driverMap.get(driverId);
		return driver ? `${driver.firstName} ${driver.lastName}` : '-';
	}

	function getItineraryInfo(itineraryId: Id<'itineraries'>): string {
		const itinerary = itineraryMap.get(itineraryId);
		if (!itinerary) return '-';
		return `${itinerary.origin} → ${itinerary.destination}`;
	}

	const statusOptions = [
		{ value: '', name: $t('common.all') },
		{ value: 'draft', name: $t('expenses.status.draft') },
		{ value: 'pending', name: $t('expenses.status.pending') },
		{ value: 'approved', name: $t('expenses.status.approved') },
		{ value: 'disbursed', name: $t('expenses.status.disbursed') },
		{ value: 'settled', name: $t('expenses.status.settled') },
		{ value: 'cancelled', name: $t('common.cancelled') }
	];
</script>

<svelte:head>
	<title>{$t('expenses.title')} | RouteWise</title>
</svelte:head>

<div class="p-4 md:p-6 space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$t('expenses.title')}</h1>
			<p class="text-gray-500 dark:text-gray-400">{$t('expenses.subtitle')}</p>
		</div>
	</div>

	<!-- Stats Cards -->
	{#if stats}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card class="!p-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
						<ClockOutline class="w-5 h-5 text-amber-600 dark:text-amber-400" />
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.pending')}</p>
						<p class="text-xl font-bold text-gray-900 dark:text-white">{stats.pendingCount}</p>
					</div>
				</div>
			</Card>

			<Card class="!p-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-sky-100 dark:bg-sky-900/40 rounded-lg">
						<CashOutline class="w-5 h-5 text-sky-600 dark:text-sky-400" />
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.disbursed')}</p>
						<p class="text-xl font-bold text-gray-900 dark:text-white">{stats.disbursedCount}</p>
					</div>
				</div>
			</Card>

			<Card class="!p-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
						<CheckCircleOutline class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.settled')}</p>
						<p class="text-xl font-bold text-gray-900 dark:text-white">{stats.settledCount}</p>
					</div>
				</div>
			</Card>

			<Card class="!p-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg">
						<ExclamationCircleOutline class="w-5 h-5 text-rose-600 dark:text-rose-400" />
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.outstanding')}</p>
						<p class="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalOutstanding)}</p>
					</div>
				</div>
			</Card>
		</div>
	{/if}

	<!-- Filters -->
	<Card class="!p-4">
		<div class="flex flex-col md:flex-row gap-4">
			<div class="flex-1">
				<Input
					type="text"
					placeholder={$t('common.search')}
					bind:value={searchQuery}
					class="ps-10"
				>
					{#snippet left()}
						<SearchOutline class="w-5 h-5 text-gray-500" />
					{/snippet}
				</Input>
			</div>
			<div class="w-full md:w-48">
				<Select items={statusOptions} bind:value={statusFilter} placeholder={$t('expenses.filterByStatus')} />
			</div>
		</div>
	</Card>

	<!-- Advances Table -->
	<Card class="!p-0 overflow-hidden">
		{#if advancesQuery.isLoading}
			<div class="flex items-center justify-center p-8">
				<Spinner size="8" />
			</div>
		{:else if filteredAdvances.length === 0}
			<div class="flex flex-col items-center justify-center p-8 text-center">
				<CashOutline class="w-12 h-12 text-gray-400 mb-4" />
				<p class="text-gray-500 dark:text-gray-400">{$t('expenses.noAdvances')}</p>
				<p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{$t('expenses.noAdvancesHint')}</p>
			</div>
		{:else}
			<Table striped>
				<TableHead class="bg-gray-50 dark:bg-gray-800">
					<TableHeadCell>{$t('expenses.columns.number')}</TableHeadCell>
					<TableHeadCell>{$t('expenses.columns.itinerary')}</TableHeadCell>
					<TableHeadCell>{$t('expenses.columns.driver')}</TableHeadCell>
					<TableHeadCell class="text-right">{$t('expenses.columns.amount')}</TableHeadCell>
					<TableHeadCell>{$t('expenses.columns.status')}</TableHeadCell>
					<TableHeadCell>{$t('expenses.columns.date')}</TableHeadCell>
					<TableHeadCell class="text-center">{$t('common.actions')}</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each filteredAdvances as advance}
						<TableBodyRow>
							<TableBodyCell class="font-medium text-gray-900 dark:text-white">
								{advance.advanceNumber}
							</TableBodyCell>
							<TableBodyCell>
								<div class="max-w-[200px]">
									<p class="text-sm text-gray-900 dark:text-white truncate">
										{getItineraryInfo(advance.itineraryId)}
									</p>
								</div>
							</TableBodyCell>
							<TableBodyCell>
								{getDriverName(advance.driverId)}
							</TableBodyCell>
							<TableBodyCell class="text-right font-medium">
								{formatCurrency(advance.amountHnl)}
							</TableBodyCell>
							<TableBodyCell>
								<StatusBadge status={advance.status} variant="advance" size="sm" showIcon />
							</TableBodyCell>
							<TableBodyCell class="text-gray-500 dark:text-gray-400">
								{formatDate(advance.createdAt)}
							</TableBodyCell>
							<TableBodyCell class="text-center">
								<Button
									href="/expenses/{advance._id}"
									size="xs"
									color="light"
									class="!p-2"
								>
									<EyeOutline class="w-4 h-4" />
								</Button>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</Card>
</div>
