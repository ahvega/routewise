<script lang="ts">
	import {
		Button,
		Card,
		TableBodyCell,
		Dropdown,
		DropdownItem,
		Spinner,
		Toast
	} from 'flowbite-svelte';
	import {
		PlusOutline,
		DotsHorizontalOutline,
		EyeOutline,
		TrashBinOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		TruckOutline,
		UserOutline,
		CalendarMonthOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge, DataTable, type Column } from '$lib/components/ui';
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

	// Table columns configuration (reactive for i18n)
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
			filterOptions: ['scheduled', 'in_progress', 'completed', 'cancelled'],
			filterPlaceholder: $t('itineraries.filters.statusPlaceholder')
		},
		{
			key: 'actions',
			label: $t('common.actions'),
			sortable: false
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
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('itineraries.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{stats.total} total, {stats.scheduled} {$t('itineraries.status.scheduled')}, {stats.inProgress} {$t('itineraries.status.in_progress')}
			</p>
		</div>
		<Button href="/itineraries/new">
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('itineraries.newItinerary')}
		</Button>
	</div>

	<Card class="max-w-none !p-6">
		{#if isLoading}
			<div class="flex justify-center py-12">
				<Spinner size="8" />
			</div>
		{:else if itineraries.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					{$t('itineraries.noItineraries')}
				</p>
				<Button href="/itineraries/new">
					<PlusOutline class="w-4 h-4 mr-2" />
					{$t('itineraries.newItinerary')}
				</Button>
			</div>
		{:else}
			<DataTable data={itineraries} {columns}>
				{#snippet row(itinerary)}
					<TableBodyCell>
						<div class="font-mono font-medium text-gray-900 dark:text-white">
							{itinerary.itineraryNumber}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{getClientName(itinerary.clientId)}
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="text-sm">
							<div class="text-gray-900 dark:text-white truncate max-w-[200px]">
								{itinerary.origin}
							</div>
							<div class="text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
								{itinerary.destination}
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
					<TableBodyCell>
						<Button size="xs" color="light" id="actions-{itinerary._id}">
							<DotsHorizontalOutline class="w-4 h-4" />
						</Button>
						<Dropdown triggeredBy="#actions-{itinerary._id}">
							<DropdownItem href="/itineraries/{itinerary._id}">
								<EyeOutline class="w-4 h-4 mr-2 inline" />
								{$t('itineraries.viewItinerary')}
							</DropdownItem>
							{#if itinerary.status === 'scheduled'}
								<DropdownItem onclick={() => updateStatus(itinerary._id, 'in_progress')}>
									<CheckCircleOutline class="w-4 h-4 mr-2 inline" />
									{$t('itineraries.startTrip')}
								</DropdownItem>
							{/if}
							{#if itinerary.status === 'in_progress'}
								<DropdownItem onclick={() => updateStatus(itinerary._id, 'completed')}>
									<CheckCircleOutline class="w-4 h-4 mr-2 inline" />
									{$t('itineraries.completeTrip')}
								</DropdownItem>
							{/if}
							{#if itinerary.status === 'scheduled'}
								<DropdownItem class="text-red-600 dark:text-red-400" onclick={() => handleDelete(itinerary._id)}>
									<TrashBinOutline class="w-4 h-4 mr-2 inline" />
									{$t('common.delete')}
								</DropdownItem>
							{/if}
						</Dropdown>
					</TableBodyCell>
				{/snippet}
			</DataTable>
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
