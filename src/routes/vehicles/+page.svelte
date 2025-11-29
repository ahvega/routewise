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
		Toast,
		Alert
	} from 'flowbite-svelte';
	import {
		PlusOutline,
		PenOutline,
		TrashBinOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		TruckOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge, DataTable, UnitInput, ComboboxInput, type Column } from '$lib/components/ui';
	import type { Id } from '$convex/_generated/dataModel';
	import { t } from '$lib/i18n';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';
	import { getMergedMakes, getMergedModels, type VehicleMakeModel } from '$lib/data/vehicleMakes';

	const client = useConvexClient();

	// Query vehicles when tenant is available
	const vehiclesQuery = useQuery(
		api.vehicles.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query tenant for plan limits
	const tenantQuery = useQuery(
		api.tenants.get,
		() => (tenantStore.tenantId ? { id: tenantStore.tenantId } : 'skip')
	);

	// Query parameters for local currency and exchange rate
	const parametersQuery = useQuery(
		api.parameters.getActive,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const tenant = $derived(tenantQuery.data);
	const parameters = $derived(parametersQuery.data);

	// Local currency from parameters or default to HNL
	const localCurrency = $derived(parameters?.localCurrency || 'HNL');
	const exchangeRate = $derived(parameters?.exchangeRate || 24.75);
	const preferredDistanceUnit = $derived(parameters?.preferredDistanceUnit || 'km');
	const distanceUnitLabel = $derived(preferredDistanceUnit === 'km' ? 'Km' : 'mi');

	// Vehicle makes/models - merge default list with tenant custom entries
	const customVehicleMakes = $derived(parameters?.customVehicleMakes as VehicleMakeModel[] | undefined);
	const availableMakes = $derived(getMergedMakes(customVehicleMakes));
	const availableModels = $derived(getMergedModels(formData.make, customVehicleMakes));

	// Check if can add more vehicles
	const canAddVehicle = $derived(() => {
		if (!tenant) return false;
		if (tenant.maxVehicles === -1) return true;
		return vehicles.length < (tenant.maxVehicles || 0);
	});

	// Modal state
	let showModal = $state(false);
	let isEditing = $state(false);
	let editingId = $state<Id<'vehicles'> | null>(null);

	// Form state - currencies and units will be set dynamically based on parameters
	let formData = $state({
		name: '',
		make: '',
		model: '',
		year: new Date().getFullYear(),
		licensePlate: '',
		passengerCapacity: 15,
		fuelCapacity: 70,
		fuelCapacityUnit: 'gallons',
		fuelEfficiency: 12,
		fuelEfficiencyUnit: 'kpl', // Will be set based on preferred distance unit
		costPerDistance: 2.5,
		costPerDistanceCurrency: 'HNL', // Will be set to localCurrency on modal open
		costPerDay: 1200,
		costPerDayCurrency: 'HNL', // Will be set to localCurrency on modal open
		distanceUnit: 'km', // Will be set to preferredDistanceUnit on modal open
		ownership: 'owned',
		status: 'active',
		baseLocation: ''
	});

	// Conversion constants
	const GALLONS_TO_LITERS = 3.78541;
	const LITERS_TO_GALLONS = 1 / GALLONS_TO_LITERS;

	// Handle fuel capacity unit change - convert the value
	function handleFuelCapacityUnitChange(event: Event) {
		const newUnit = (event.target as HTMLSelectElement).value;
		const oldUnit = formData.fuelCapacityUnit;

		if (newUnit !== oldUnit) {
			if (newUnit === 'liters' && oldUnit === 'gallons') {
				// Convert gallons to liters
				formData.fuelCapacity = Math.round(formData.fuelCapacity * GALLONS_TO_LITERS * 10) / 10;
			} else if (newUnit === 'gallons' && oldUnit === 'liters') {
				// Convert liters to gallons
				formData.fuelCapacity = Math.round(formData.fuelCapacity * LITERS_TO_GALLONS * 10) / 10;
			}
			formData.fuelCapacityUnit = newUnit;
		}
	}

	// Handle cost currency change - convert the value
	function handleCostPerDayCurrencyChange(event: Event) {
		const newCurrency = (event.target as HTMLSelectElement).value;
		const oldCurrency = formData.costPerDayCurrency;

		if (newCurrency !== oldCurrency) {
			if (newCurrency === 'USD' && oldCurrency !== 'USD') {
				// Convert local to USD
				formData.costPerDay = Math.round((formData.costPerDay / exchangeRate) * 100) / 100;
			} else if (newCurrency !== 'USD' && oldCurrency === 'USD') {
				// Convert USD to local
				formData.costPerDay = Math.round(formData.costPerDay * exchangeRate * 100) / 100;
			}
			formData.costPerDayCurrency = newCurrency;
		}
	}

	function handleCostPerDistanceCurrencyChange(event: Event) {
		const newCurrency = (event.target as HTMLSelectElement).value;
		const oldCurrency = formData.costPerDistanceCurrency;

		if (newCurrency !== oldCurrency) {
			if (newCurrency === 'USD' && oldCurrency !== 'USD') {
				// Convert local to USD
				formData.costPerDistance = Math.round((formData.costPerDistance / exchangeRate) * 100) / 100;
			} else if (newCurrency !== 'USD' && oldCurrency === 'USD') {
				// Convert USD to local
				formData.costPerDistance = Math.round(formData.costPerDistance * exchangeRate * 100) / 100;
			}
			formData.costPerDistanceCurrency = newCurrency;
		}
	}

	// Handle adding new vehicle make to tenant's custom list
	async function handleAddNewMake(make: string) {
		if (!parameters?._id) return;

		const currentCustomMakes = customVehicleMakes || [];
		// Check if make already exists in custom list
		if (currentCustomMakes.some((cm) => cm.make.toLowerCase() === make.toLowerCase())) {
			return;
		}

		// Add new make with empty models array
		const updatedMakes = [...currentCustomMakes, { make, models: [] }];

		try {
			await client.mutation(api.parameters.update, {
				id: parameters._id,
				customVehicleMakes: updatedMakes
			});
		} catch (error) {
			console.error('Failed to save custom make:', error);
		}
	}

	// Handle adding new model to an existing make
	async function handleAddNewModel(model: string) {
		if (!parameters?._id || !formData.make) return;

		const currentCustomMakes = customVehicleMakes || [];
		const makeIndex = currentCustomMakes.findIndex(
			(cm) => cm.make.toLowerCase() === formData.make.toLowerCase()
		);

		let updatedMakes: VehicleMakeModel[];

		if (makeIndex >= 0) {
			// Make exists in custom list - add model to it
			if (currentCustomMakes[makeIndex].models.some((m) => m.toLowerCase() === model.toLowerCase())) {
				return; // Model already exists
			}
			updatedMakes = currentCustomMakes.map((cm, idx) => {
				if (idx === makeIndex) {
					return { ...cm, models: [...cm.models, model] };
				}
				return cm;
			});
		} else {
			// Make doesn't exist in custom list - create new entry
			updatedMakes = [...currentCustomMakes, { make: formData.make, models: [model] }];
		}

		try {
			await client.mutation(api.parameters.update, {
				id: parameters._id,
				customVehicleMakes: updatedMakes
			});
		} catch (error) {
			console.error('Failed to save custom model:', error);
		}
	}

	// Handle make change - clear model if it's no longer valid
	function handleMakeChange(make: string) {
		formData.make = make;
		// Check if current model is still valid for the new make
		const newAvailableModels = getMergedModels(make, customVehicleMakes);
		if (formData.model && !newAvailableModels.some((m) => m.toLowerCase() === formData.model.toLowerCase())) {
			formData.model = ''; // Clear model if not valid for new make
		}
	}

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
		// Set default fuel efficiency unit based on preferred distance unit
		const defaultFuelEfficiencyUnit = preferredDistanceUnit === 'km' ? 'kpl' : 'mpg';
		formData = {
			name: '',
			make: '',
			model: '',
			year: new Date().getFullYear(),
			licensePlate: '',
			passengerCapacity: 15,
			fuelCapacity: 70,
			fuelCapacityUnit: 'gallons',
			fuelEfficiency: 12,
			fuelEfficiencyUnit: defaultFuelEfficiencyUnit, // Based on preferred distance unit
			costPerDistance: 2.5,
			costPerDistanceCurrency: localCurrency, // Use dynamic local currency
			costPerDay: 1200,
			costPerDayCurrency: localCurrency, // Use dynamic local currency
			distanceUnit: preferredDistanceUnit, // Use preferred distance unit from settings
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
			fuelCapacityUnit: vehicle.fuelCapacityUnit || 'gallons',
			fuelEfficiency: vehicle.fuelEfficiency,
			fuelEfficiencyUnit: vehicle.fuelEfficiencyUnit,
			costPerDistance: vehicle.costPerDistance,
			costPerDistanceCurrency: vehicle.costPerDistanceCurrency || localCurrency,
			costPerDay: vehicle.costPerDay,
			costPerDayCurrency: vehicle.costPerDayCurrency || localCurrency,
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
				{#if tenant && tenant.maxVehicles !== -1}
					<span class="text-sm">({vehicles.length} / {tenant.maxVehicles})</span>
				{/if}
			</p>
		</div>
		<Button onclick={openCreateModal} disabled={!canAddVehicle()}>
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('vehicles.addVehicle')}
		</Button>
	</div>

	{#if !canAddVehicle() && tenant}
		<Alert color="red" border class="bg-red-50 dark:bg-red-900/30">
			{#snippet icon()}
				<InfoCircleSolid class="w-5 h-5" />
			{/snippet}
			<span class="font-semibold">{$t('vehicles.limits.vehicleLimitReached')}</span>
			<span class="ml-1">{$t('vehicles.limits.upgradeToAddMore')}</span>
			<Button size="xs" color="red" class="ml-3" href="/settings/billing">
				{$t('settings.billing.upgrade')}
			</Button>
		</Alert>
	{/if}

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
				<ComboboxInput
					id="make"
					bind:value={formData.make}
					options={availableMakes}
					placeholder={$t('vehicles.fields.makePlaceholder')}
					addLabel={$t('common.add')}
					onchange={handleMakeChange}
					onAddNew={handleAddNewMake}
				/>
			</div>
			<div>
				<Label for="model">{$t('vehicles.fields.model')}</Label>
				<ComboboxInput
					id="model"
					bind:value={formData.model}
					options={availableModels}
					placeholder={$t('vehicles.fields.modelPlaceholder')}
					disabled={!formData.make}
					addLabel={$t('common.add')}
					onAddNew={handleAddNewModel}
				/>
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
				<div class="flex gap-2">
					<Input id="fuelCapacity" type="number" bind:value={formData.fuelCapacity} required min={1} step="0.1" class="flex-1" />
					<Select value={formData.fuelCapacityUnit} onchange={handleFuelCapacityUnitChange} class="w-24">
						<option value="gallons">{$t('units.gallons')}</option>
						<option value="liters">{$t('units.liters')}</option>
					</Select>
				</div>
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
				<div class="flex gap-2">
					<Input id="costPerDay" type="number" bind:value={formData.costPerDay} required min={0} step="0.01" class="flex-1" />
					<Select value={formData.costPerDayCurrency} onchange={handleCostPerDayCurrencyChange} class="w-24">
						<option value={localCurrency}>{localCurrency}</option>
						<option value="USD">USD</option>
					</Select>
				</div>
			</div>
			<div>
				<Label for="costPerDistance">{$t('vehicles.fields.costPerDistance')} ({distanceUnitLabel}) *</Label>
				<div class="flex gap-2">
					<Input id="costPerDistance" type="number" bind:value={formData.costPerDistance} required min={0} step="0.01" class="flex-1" />
					<Select value={formData.costPerDistanceCurrency} onchange={handleCostPerDistanceCurrencyChange} class="w-24">
						<option value={localCurrency}>{localCurrency}</option>
						<option value="USD">USD</option>
					</Select>
				</div>
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
