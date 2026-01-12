<script lang="ts">
	import { Button, Card, TableBodyCell, Spinner, Toast } from 'flowbite-svelte';
	import {
		PlusOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		TruckOutline,
		UserOutline,
		CalendarMonthOutline,
		PlayOutline,
		FilterOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import {
		StatusBadge,
		DataTable,
		ActionMenu,
		type Column,
		createViewAction,
		createCallAction,
		createEmailAction,
		createDeleteAction,
		filterActions,
		type ActionItem
	} from '$lib/components/ui';
	import type { Id } from '$convex/_generated/dataModel';
	import { t } from '$lib/i18n';

	const client = useConvexClient();

	// Query itineraries when tenant is available
	const itinerariesQuery = useQuery(
		api.itineraries.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query clients, drivers, and vehicles for display names
	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const driversQuery = useQuery(
		api.drivers.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const vehiclesQuery = useQuery(
		api.vehicles.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	const itineraries = $derived(itinerariesQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const drivers = $derived(driversQuery.data || []);
	const vehicles = $derived(vehiclesQuery.data || []);
	const isLoading = $derived(itinerariesQuery.isLoading);

	// Status filter state
	let statusFilter = $state('');

	// Table columns configuration (reactive for i18n)
	// Note: Actions column removed - kebab menu is now in first column
	const columns = $derived<Column<any>[]>([
		{
			key: 'itineraryNumber',
			label: $t('itineraries.columns.itinerary'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('itineraries.filters.searchPlaceholder')
		},
		{
			key: 'origin',
			label: $t('itineraries.columns.route'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('itineraries.filters.searchPlaceholder')
		},
		{
			key: 'startDate',
			label: $t('itineraries.columns.date'),
			sortable: true,
			sortFn: (a, b, dir) => dir === 'asc' ? a.startDate - b.startDate : b.startDate - a.startDate
		},
		{
			key: 'driverId',
			label: $t('itineraries.columns.driver'),
			sortable: true
		},
		{
			key: 'vehicleId',
			label: $t('itineraries.columns.vehicle'),
			sortable: true
		},
		{
			key: 'status',
			label: $t('itineraries.columns.status'),
			sortable: true,
			filterOptions: [
				{ label: $t('statuses.scheduled'), value: 'scheduled' },
				{ label: $t('statuses.in_progress'), value: 'in_progress' },
				{ label: $t('statuses.completed'), value: 'completed' },
				{ label: $t('statuses.cancelled'), value: 'cancelled' }
			],
			filterPlaceholder: $t('itineraries.filters.statusPlaceholder')
		}
	]);

	function getClientName(clientId: Id<'clients'> | undefined): string {
		if (!clientId) return 'Walk-in';
		const clientData = clients.find((c) => c._id === clientId);
		if (!clientData) return 'Unknown';
		if (clientData.type === 'company') {
			return clientData.companyName || 'Unnamed Company';
		}
		return [clientData.firstName, clientData.lastName].filter(Boolean).join(' ') || 'Unnamed';
	}

	function getDriverName(driverId: Id<'drivers'> | undefined): string {
		if (!driverId) return '-';
		const driver = drivers.find((d) => d._id === driverId);
		if (!driver) return 'Unknown';
		return `${driver.firstName} ${driver.lastName}`;
	}

	function getVehicleName(vehicleId: Id<'vehicles'> | undefined): string {
		if (!vehicleId) return '-';
		const vehicle = vehicles.find((v) => v._id === vehicleId);
		if (!vehicle) return 'Unknown';
		return vehicle.name;
	}

	// Get driver contact info for Call/Email actions
	function getDriverContact(driverId: Id<'drivers'> | undefined): { phone?: string; email?: string } {
		if (!driverId) return {};
		const driver = drivers.find((d) => d._id === driverId);
		if (!driver) return {};
		return {
			phone: driver.phone || undefined,
			email: driver.email || undefined
		};
	}

	// Build actions for an itinerary row
	function getItineraryActions(itinerary: typeof itineraries[0]): ActionItem[] {
		const driverContact = getDriverContact(itinerary.driverId);

		return filterActions([
			// View action
			createViewAction(`/itineraries/${itinerary._id}`, $t('itineraries.viewItinerary')),

			// Contact actions (with divider)
			itinerary.tripLeaderPhone ? {
				...createCallAction(itinerary.tripLeaderPhone, $t('itineraries.callTripLeader'))!,
				dividerBefore: true
			} : null,
			driverContact.phone ? createCallAction(driverContact.phone, $t('common.callDriver')) : null,
			itinerary.tripLeaderEmail ? createEmailAction(itinerary.tripLeaderEmail, $t('itineraries.emailTripLeader')) : null,

			// Status actions (with divider)
			itinerary.status === 'scheduled' ? {
				id: 'start',
				label: $t('itineraries.startTrip'),
				icon: PlayOutline,
				onClick: () => updateStatus(itinerary._id, 'in_progress'),
				color: 'success' as const,
				dividerBefore: true
			} : null,
			itinerary.status === 'in_progress' ? {
				id: 'complete',
				label: $t('itineraries.completeTrip'),
				icon: CheckCircleOutline,
				onClick: () => updateStatus(itinerary._id, 'completed'),
				color: 'success' as const,
				dividerBefore: true
			} : null,

			// Delete action (only for scheduled, with divider)
			itinerary.status === 'scheduled' ?
				createDeleteAction(() => handleDelete(itinerary._id), false, $t('common.delete'))
				: null
		]);
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 0
		}).format(value);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('es-HN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function updateStatus(id: Id<'itineraries'>, status: string) {
		try {
			await client.mutation(api.itineraries.updateStatus, { id, status });
			showToastMessage($t('itineraries.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to update status:', error);
			showToastMessage($t('itineraries.updateFailed'), 'error');
		}
	}

	async function handleDelete(id: Id<'itineraries'>) {
		if (!confirm($t('itineraries.deleteConfirm'))) return;

		try {
			await client.mutation(api.itineraries.remove, { id });
			showToastMessage($t('itineraries.deleteSuccess'), 'success');
		} catch (error) {
			console.error('Failed to delete itinerary:', error);
			showToastMessage($t('itineraries.deleteFailed'), 'error');
		}
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	// Stats
	const stats = $derived({
		total: itineraries.length,
		scheduled: itineraries.filter((i) => i.status === 'scheduled').length,
		inProgress: itineraries.filter((i) => i.status === 'in_progress').length,
		completed: itineraries.filter((i) => i.status === 'completed').length
	});

	// Filter by card click
	function filterByStatus(status: string) {
		statusFilter = status;
	}

	function clearFilters() {
		statusFilter = '';
	}

	// Active filter indicator
	const activeFilter = $derived(statusFilter);

	// Pre-filtered itineraries for DataTable
	const filteredItineraries = $derived(
		statusFilter
			? itineraries.filter((i) => i.status === statusFilter)
			: itineraries
	);
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('itineraries.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('itineraries.subtitle', { values: { count: stats.total } })}
			</p>
		</div>
		<Button href="/itineraries/new">
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('itineraries.newItinerary')}
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else}
		<!-- Stats Cards -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card class="max-w-none p-4! {activeFilter === '' ? 'ring-2 ring-primary-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('common.all')}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
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
			<Card class="max-w-none p-4! {activeFilter === 'scheduled' ? 'ring-2 ring-blue-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('itineraries.status.scheduled')}</p>
						<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.scheduled}</p>
					</div>
					<button
						onclick={() => filterByStatus('scheduled')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'scheduled' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4! {activeFilter === 'in_progress' ? 'ring-2 ring-amber-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('itineraries.status.in_progress')}</p>
						<p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgress}</p>
					</div>
					<button
						onclick={() => filterByStatus('in_progress')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'in_progress' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4! {activeFilter === 'completed' ? 'ring-2 ring-emerald-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('itineraries.status.completed')}</p>
						<p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
					</div>
					<button
						onclick={() => filterByStatus('completed')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
		</div>

		{#if itineraries.length === 0}
			<Card class="max-w-none !p-6">
				<div class="text-center py-12">
					<p class="text-gray-500 dark:text-gray-400 mb-4">
						{$t('itineraries.noItineraries')}
					</p>
					<Button href="/itineraries/new">
						<PlusOutline class="w-4 h-4 mr-2" />
						{$t('itineraries.newItinerary')}
					</Button>
				</div>
			</Card>
		{:else}
			<DataTable 
				data={filteredItineraries} 
				{columns}
				additionalSearchKeys={['itineraryDisplayName', 'destination', 'tripLeaderName']}
			>
				{#snippet row(itinerary)}
					<TableBodyCell>
						<div class="flex items-center justify-between gap-2">
							<div>
								<div class="font-mono font-medium text-gray-900 dark:text-white">
									{itinerary.itineraryDisplayName || itinerary.itineraryNumber}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{getClientName(itinerary.clientId)}
								</div>
							</div>
							<ActionMenu
								triggerId="actions-{itinerary._id}"
								actions={getItineraryActions(itinerary)}
							/>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="text-sm">
							<div class="text-gray-900 dark:text-white truncate max-w-[200px]">
								{itinerary.origin}
							</div>
							<div class="text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
								→ {itinerary.destination}
							</div>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="flex items-center gap-2">
							<CalendarMonthOutline class="w-4 h-4 text-gray-400" />
							<div>
								<div class="text-gray-900 dark:text-white">
									{formatDate(itinerary.startDate)}
								</div>
								{#if itinerary.estimatedDays > 1}
									<div class="text-xs text-gray-500 dark:text-gray-400">
										{itinerary.estimatedDays} {$t('common.days')}
									</div>
								{/if}
							</div>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="flex items-center gap-2">
							<UserOutline class="w-4 h-4 text-gray-400" />
							<span class="text-sm text-gray-700 dark:text-gray-300">
								{getDriverName(itinerary.driverId)}
							</span>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="flex items-center gap-2">
							<TruckOutline class="w-4 h-4 text-gray-400" />
							<span class="text-sm text-gray-700 dark:text-gray-300">
								{getVehicleName(itinerary.vehicleId)}
							</span>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={itinerary.status} variant="itinerary" />
					</TableBodyCell>
				{/snippet}
			</DataTable>
		{/if}
	{/if}
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
