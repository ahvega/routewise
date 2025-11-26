<script lang="ts">
	import {
		Button,
		Card,
		TableBodyCell,
		Modal,
		Label,
		Input,
		Select,
		Spinner,
		Toast
	} from 'flowbite-svelte';
	import {
		PlusOutline,
		PenOutline,
		TrashBinOutline,
		CheckCircleOutline,
		CloseCircleOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge, DataTable, UnitInput, type Column } from '$lib/components/ui';
	import type { Id } from '$convex/_generated/dataModel';
	import { t } from '$lib/i18n';

	const client = useConvexClient();

	// Query vehicles when tenant is available
	const vehiclesQuery = useQuery(
		api.vehicles.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Modal state
	let showModal = $state(false);
	let isEditing = $state(false);
	let editingId = $state<Id<'vehicles'> | null>(null);

	// Form state
	let formData = $state({
		name: '',
		make: '',
		model: '',
		year: new Date().getFullYear(),
		licensePlate: '',
		passengerCapacity: 15,
		fuelCapacity: 70,
		fuelEfficiency: 12,
		fuelEfficiencyUnit: 'kpl',
		costPerDistance: 2.5,
		costPerDay: 1200,
		distanceUnit: 'km',
		ownership: 'owned',
		status: 'active',
		baseLocation: ''
	});

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Loading state
	let isSaving = $state(false);

	// Table columns configuration (reactive for i18n)
	const columns = $derived<Column<any>[]>([
		{
			key: 'name',
			label: $t('vehicles.columns.vehicle'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('vehicles.filters.searchPlaceholder'),
			getValue: (v) => v.name
		},
		{
			key: 'passengerCapacity',
			label: $t('vehicles.columns.capacity'),
			sortable: true
		},
		{
			key: 'fuelEfficiency',
			label: $t('vehicles.columns.fuelEfficiency'),
			sortable: true
		},
		{
			key: 'costPerDay',
			label: $t('vehicles.columns.costPerDay'),
			sortable: true
		},
		{
			key: 'costPerDistance',
			label: $t('vehicles.columns.costPerKm'),
			sortable: true
		},
		{
			key: 'ownership',
			label: $t('vehicles.columns.ownership'),
			sortable: true,
			filterOptions: ['owned', 'rented'],
			filterPlaceholder: $t('vehicles.filters.ownershipPlaceholder')
		},
		{
			key: 'status',
			label: $t('vehicles.columns.status'),
			sortable: true,
			filterOptions: ['active', 'inactive', 'maintenance'],
			filterPlaceholder: $t('vehicles.filters.statusPlaceholder')
		},
		{
			key: 'actions',
			label: $t('common.actions'),
			sortable: false
		}
	]);

	function openCreateModal() {
		isEditing = false;
		editingId = null;
		formData = {
			name: '',
			make: '',
			model: '',
			year: new Date().getFullYear(),
			licensePlate: '',
			passengerCapacity: 15,
			fuelCapacity: 70,
			fuelEfficiency: 12,
			fuelEfficiencyUnit: 'kpl',
			costPerDistance: 2.5,
			costPerDay: 1200,
			distanceUnit: 'km',
			ownership: 'owned',
			status: 'active',
			baseLocation: ''
		};
		showModal = true;
	}

	function openEditModal(vehicle: any) {
		isEditing = true;
		editingId = vehicle._id;
		formData = {
			name: vehicle.name,
			make: vehicle.make || '',
			model: vehicle.model || '',
			year: vehicle.year || new Date().getFullYear(),
			licensePlate: vehicle.licensePlate || '',
			passengerCapacity: vehicle.passengerCapacity,
			fuelCapacity: vehicle.fuelCapacity,
			fuelEfficiency: vehicle.fuelEfficiency,
			fuelEfficiencyUnit: vehicle.fuelEfficiencyUnit,
			costPerDistance: vehicle.costPerDistance,
			costPerDay: vehicle.costPerDay,
			distanceUnit: vehicle.distanceUnit,
			ownership: vehicle.ownership,
			status: vehicle.status,
			baseLocation: vehicle.baseLocation || ''
		};
		showModal = true;
	}

	async function handleSubmit() {
		if (!tenantStore.tenantId) return;

		isSaving = true;
		try {
			if (isEditing && editingId) {
				await client.mutation(api.vehicles.update, {
					id: editingId,
					...formData,
					year: formData.year || undefined,
					make: formData.make || undefined,
					model: formData.model || undefined,
					licensePlate: formData.licensePlate || undefined,
					baseLocation: formData.baseLocation || undefined
				});
				showToastMessage($t('vehicles.updateSuccess'), 'success');
			} else {
				await client.mutation(api.vehicles.create, {
					tenantId: tenantStore.tenantId,
					...formData,
					year: formData.year || undefined,
					make: formData.make || undefined,
					model: formData.model || undefined,
					licensePlate: formData.licensePlate || undefined,
					baseLocation: formData.baseLocation || undefined
				});
				showToastMessage($t('vehicles.createSuccess'), 'success');
			}
			showModal = false;
		} catch (error) {
			console.error('Failed to save vehicle:', error);
			showToastMessage($t('vehicles.saveFailed'), 'error');
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(id: Id<'vehicles'>) {
		if (!confirm($t('vehicles.deleteConfirm'))) return;

		try {
			await client.mutation(api.vehicles.remove, { id });
			showToastMessage($t('vehicles.deleteSuccess'), 'success');
		} catch (error) {
			console.error('Failed to delete vehicle:', error);
			showToastMessage($t('vehicles.deleteFailed'), 'error');
		}
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 0
		}).format(value);
	}

	const vehicles = $derived(vehiclesQuery.data || []);
	const isLoading = $derived(vehiclesQuery.isLoading);
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('vehicles.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('vehicles.subtitle', { values: { count: vehicles.length } })}
			</p>
		</div>
		<Button onclick={openCreateModal}>
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('vehicles.addVehicle')}
		</Button>
	</div>

	<Card class="max-w-none !p-6">
		{#if isLoading}
			<div class="flex justify-center py-12">
				<Spinner size="8" />
			</div>
		{:else if vehicles.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					{$t('vehicles.noVehicles')}
				</p>
				<Button onclick={openCreateModal}>
					<PlusOutline class="w-4 h-4 mr-2" />
					{$t('vehicles.addVehicle')}
				</Button>
			</div>
		{:else}
			<DataTable data={vehicles} {columns}>
				{#snippet row(vehicle)}
					<TableBodyCell>
						<div class="font-medium text-gray-900 dark:text-white">
							{vehicle.name}
						</div>
						{#if vehicle.make || vehicle.model}
							<div class="text-sm text-gray-500 dark:text-gray-400">
								{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
							</div>
						{/if}
					</TableBodyCell>
					<TableBodyCell>
						{vehicle.passengerCapacity} {$t('vehicles.fields.passengers')}
					</TableBodyCell>
					<TableBodyCell>
						{vehicle.fuelEfficiency} {vehicle.fuelEfficiencyUnit === 'kpl' ? 'km/L' : vehicle.fuelEfficiencyUnit}
					</TableBodyCell>
					<TableBodyCell>
						{formatCurrency(vehicle.costPerDay)}
					</TableBodyCell>
					<TableBodyCell>
						{formatCurrency(vehicle.costPerDistance)}/{vehicle.distanceUnit}
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={vehicle.ownership} />
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={vehicle.status} />
					</TableBodyCell>
					<TableBodyCell>
						<div class="flex gap-2">
							<Button size="xs" color="light" onclick={() => openEditModal(vehicle)}>
								<PenOutline class="w-4 h-4" />
							</Button>
							<Button size="xs" color="red" outline onclick={() => handleDelete(vehicle._id)}>
								<TrashBinOutline class="w-4 h-4" />
							</Button>
						</div>
					</TableBodyCell>
				{/snippet}
			</DataTable>
		{/if}
	</Card>
</div>

<!-- Create/Edit Modal -->
<Modal bind:open={showModal} size="lg" title={isEditing ? $t('vehicles.editVehicle') : $t('vehicles.addVehicle')}>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="name">{$t('vehicles.fields.name')} *</Label>
				<Input id="name" bind:value={formData.name} required placeholder={$t('vehicles.fields.namePlaceholder')} />
			</div>
			<div>
				<Label for="licensePlate">{$t('vehicles.fields.licensePlate')}</Label>
				<Input id="licensePlate" bind:value={formData.licensePlate} placeholder={$t('vehicles.fields.licensePlatePlaceholder')} />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<Label for="make">{$t('vehicles.fields.make')}</Label>
				<Input id="make" bind:value={formData.make} placeholder={$t('vehicles.fields.makePlaceholder')} />
			</div>
			<div>
				<Label for="model">{$t('vehicles.fields.model')}</Label>
				<Input id="model" bind:value={formData.model} placeholder={$t('vehicles.fields.modelPlaceholder')} />
			</div>
			<div>
				<Label for="year">{$t('vehicles.fields.year')}</Label>
				<Input id="year" type="number" bind:value={formData.year} min={1990} max={2030} />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<Label for="passengerCapacity">{$t('vehicles.fields.passengerCapacity')} *</Label>
				<Input id="passengerCapacity" type="number" bind:value={formData.passengerCapacity} required min={1} />
			</div>
			<div>
				<Label for="fuelCapacity">{$t('vehicles.fields.fuelCapacity')} *</Label>
				<Input id="fuelCapacity" type="number" bind:value={formData.fuelCapacity} required min={1} />
			</div>
			<div>
				<Label>{$t('vehicles.fields.fuelEfficiency')} *</Label>
				<UnitInput
					bind:value={formData.fuelEfficiency}
					bind:unit={formData.fuelEfficiencyUnit}
					unitType="fuelEfficiency"
					required
					min={1}
					step={0.1}
				/>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="costPerDay">{$t('vehicles.fields.costPerDay')} *</Label>
				<Input id="costPerDay" type="number" bind:value={formData.costPerDay} required min={0} step="0.01" />
			</div>
			<div>
				<Label for="costPerDistance">{$t('vehicles.fields.costPerDistance')} *</Label>
				<Input id="costPerDistance" type="number" bind:value={formData.costPerDistance} required min={0} step="0.01" />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="ownership">{$t('vehicles.fields.ownership')}</Label>
				<Select id="ownership" bind:value={formData.ownership}>
					<option value="owned">{$t('vehicles.fields.owned')}</option>
					<option value="rented">{$t('vehicles.fields.rented')}</option>
				</Select>
			</div>
			<div>
				<Label for="status">{$t('common.status')}</Label>
				<Select id="status" bind:value={formData.status}>
					<option value="active">{$t('common.active')}</option>
					<option value="inactive">{$t('common.inactive')}</option>
					<option value="maintenance">{$t('common.maintenance')}</option>
				</Select>
			</div>
		</div>

		<div>
			<Label for="baseLocation">{$t('vehicles.fields.baseLocation')}</Label>
			<Input
				id="baseLocation"
				bind:value={formData.baseLocation}
				placeholder={$t('vehicles.fields.baseLocationPlaceholder')}
			/>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				{$t('vehicles.fields.baseLocationHelp')}
			</p>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showModal = false)}>{$t('common.cancel')}</Button>
			<Button onclick={handleSubmit} disabled={isSaving}>
				{#if isSaving}
					<Spinner size="4" class="mr-2" />
				{/if}
				{isEditing ? $t('common.update') : $t('common.create')} {$t('vehicles.title').toLowerCase().slice(0, -1)}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Toast notifications -->
{#if showToast}
	<Toast class="fixed bottom-4 right-4" color={toastType === 'success' ? 'green' : 'red'}>
		<svelte:fragment slot="icon">
			{#if toastType === 'success'}
				<CheckCircleOutline class="w-5 h-5" />
			{:else}
				<CloseCircleOutline class="w-5 h-5" />
			{/if}
		</svelte:fragment>
		{toastMessage}
	</Toast>
{/if}
