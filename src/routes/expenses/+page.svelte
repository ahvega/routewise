<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
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
		Select,
		Input,
		Spinner,
		Toast
	} from 'flowbite-svelte';
	import {
		SearchOutline,
		CashOutline,
		ClockOutline,
		CheckCircleOutline,
		ExclamationCircleOutline,
		CloseCircleOutline,
		FilePdfOutline,
		PaperPlaneOutline,
		FilterOutline
	} from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';
	import {
		StatusBadge,
		ActionMenu,
		createViewAction,
		createCallAction,
		createDeleteAction,
		createApproveAction,
		createDisburseAction,
		createSettleAction,
		createCancelAction,
		filterActions,
		type ActionItem
	} from '$lib/components/ui';
	import { tenantStore } from '$lib/stores';

	const client = useConvexClient();

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

	// Filter by card click
	function filterByStatus(status: string) {
		statusFilter = status;
		searchQuery = '';
	}

	function clearFilters() {
		statusFilter = '';
		searchQuery = '';
	}

	// Active filter indicator
	const activeFilter = $derived(statusFilter);

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	// Get driver contact info
	function getDriverContact(driverId: Id<'drivers'> | undefined): { phone?: string } {
		if (!driverId) return {};
		const driver = driverMap.get(driverId);
		if (!driver) return {};
		return { phone: driver.phone || undefined };
	}

	// Status update functions
	async function updateStatus(id: Id<'expenseAdvances'>, status: string) {
		try {
			await client.mutation(api.expenseAdvances.updateStatus, { id, status });
			showToastMessage($t('expenses.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to update status:', error);
			showToastMessage($t('expenses.updateFailed'), 'error');
		}
	}

	async function handleDelete(id: Id<'expenseAdvances'>) {
		if (!confirm($t('expenses.deleteConfirm'))) return;

		try {
			await client.mutation(api.expenseAdvances.remove, { id });
			showToastMessage($t('expenses.deleteSuccess'), 'success');
		} catch (error) {
			console.error('Failed to delete advance:', error);
			showToastMessage($t('expenses.deleteFailed'), 'error');
		}
	}

	// Build actions for an expense advance row
	function getAdvanceActions(advance: typeof advances[0]): ActionItem[] {
		const driverContact = getDriverContact(advance.driverId);

		return filterActions([
			// View action
			createViewAction(`/expenses/${advance._id}`, $t('expenses.viewAdvance')),

			// Contact actions (with divider)
			driverContact.phone
				? { ...createCallAction(driverContact.phone, $t('common.callDriver'))!, dividerBefore: true }
				: null,

			// PDF action (only for approved/disbursed/settled)
			['approved', 'disbursed', 'settled'].includes(advance.status) ? {
				id: 'pdf',
				label: $t('common.downloadPdf'),
				icon: FilePdfOutline as any,
				href: `/expenses/${advance._id}?pdf=true`,
				dividerBefore: true
			} : null,

			// Status actions (with divider)
			advance.status === 'draft' ? {
				id: 'submit',
				label: $t('expenses.submit'),
				icon: PaperPlaneOutline as any,
				onClick: () => updateStatus(advance._id, 'pending'),
				dividerBefore: true
			} : null,

			advance.status === 'pending'
				? { ...createApproveAction(() => updateStatus(advance._id, 'approved')), dividerBefore: true }
				: null,

			advance.status === 'approved'
				? createDisburseAction(() => updateStatus(advance._id, 'disbursed'))
				: null,

			advance.status === 'disbursed'
				? createSettleAction(() => updateStatus(advance._id, 'settled'))
				: null,

			['pending', 'approved'].includes(advance.status)
				? createCancelAction(() => updateStatus(advance._id, 'cancelled'))
				: null,

			// Delete action (only for draft or cancelled)
			['draft', 'cancelled'].includes(advance.status)
				? createDeleteAction(() => handleDelete(advance._id), false, $t('common.delete'))
				: null
		]);
	}
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
			<Card class="p-4! {activeFilter === 'pending' ? 'ring-2 ring-amber-500' : ''}">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
							<ClockOutline class="w-5 h-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.pending')}</p>
							<p class="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingCount}</p>
						</div>
					</div>
					<button
						onclick={() => filterByStatus('pending')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>

			<Card class="p-4! {activeFilter === 'disbursed' ? 'ring-2 ring-sky-500' : ''}">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-sky-100 dark:bg-sky-900/40 rounded-lg">
							<CashOutline class="w-5 h-5 text-sky-600 dark:text-sky-400" />
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.disbursed')}</p>
							<p class="text-xl font-bold text-sky-600 dark:text-sky-400">{stats.disbursedCount}</p>
						</div>
					</div>
					<button
						onclick={() => filterByStatus('disbursed')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'disbursed' ? 'bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>

			<Card class="p-4! {activeFilter === 'settled' ? 'ring-2 ring-emerald-500' : ''}">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
							<CheckCircleOutline class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.settled')}</p>
							<p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.settledCount}</p>
						</div>
					</div>
					<button
						onclick={() => filterByStatus('settled')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'settled' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>

			<Card class="p-4! {activeFilter === '' ? 'ring-2 ring-primary-500' : ''}">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg">
							<ExclamationCircleOutline class="w-5 h-5 text-rose-600 dark:text-rose-400" />
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.stats.outstanding')}</p>
							<p class="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(stats.totalOutstanding)}</p>
						</div>
					</div>
					<button
						onclick={() => clearFilters()}
						class="p-1.5 rounded-lg transition-colors {activeFilter === '' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.clearFilters')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
		</div>
	{/if}

	<!-- Filters -->
	<Card class="max-w-none p-4!">
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
	<Card class="max-w-none p-0! overflow-hidden">
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
				</TableHead>
				<TableBody>
					{#each filteredAdvances as advance}
						<TableBodyRow>
							<TableBodyCell>
								<div class="flex items-center justify-between gap-2">
									<span class="font-medium text-gray-900 dark:text-white">
										{advance.advanceNumber}
									</span>
									<ActionMenu
										triggerId="actions-{advance._id}"
										actions={getAdvanceActions(advance)}
									/>
								</div>
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
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</Card>
</div>

<!-- Toast notifications -->
{#if showToast}
	<Toast class="fixed bottom-4 right-4" color={toastType === 'success' ? 'green' : 'red'}>
		{#snippet icon()}
			{#if toastType === 'success'}
				<CheckCircleOutline class="w-5 h-5" />
			{:else}
				<CloseCircleOutline class="w-5 h-5" />
			{/if}
		{/snippet}
		{toastMessage}
	</Toast>
{/if}
