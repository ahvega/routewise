<script lang="ts">
	import { Button, Alert, Badge, Card } from 'flowbite-svelte';
	import {
		TruckOutline,
		PlusOutline,
		TrashBinOutline,
		ExclamationCircleOutline,
		CheckCircleOutline,
		LightbulbOutline
	} from 'flowbite-svelte-icons';
	import {
		validateCapacity,
		calculateTotalCapacity,
		canRemoveVehicle,
		type VehicleOption,
		type SelectedVehicle,
		type CapacityValidationResult
	} from '$lib/utils/vehicleCapacity';

	// Props
	let {
		vehicles = [],
		unavailableVehicleIds = [],
		groupSize = 1,
		selectedVehicles = $bindable<SelectedVehicle[]>([]),
		onValidationChange = (result: CapacityValidationResult) => {}
	}: {
		vehicles: any[];
		unavailableVehicleIds: string[];
		groupSize: number;
		selectedVehicles: SelectedVehicle[];
		onValidationChange?: (result: CapacityValidationResult) => void;
	} = $props();

	// Convert vehicles to VehicleOption format
	const vehicleOptions = $derived<VehicleOption[]>(
		vehicles.map((v) => ({
			id: v._id,
			name: v.name,
			capacity: v.passengerCapacity,
			type: v.type,
			isAvailable: !unavailableVehicleIds.includes(v._id),
			dailyCost: v.costPerDay,
			distanceCost: v.costPerDistance
		}))
	);

	// Filter to suitable vehicles (capacity >= 1 passenger)
	const suitableVehicles = $derived(
		vehicleOptions.filter((v) => v.capacity >= 1).sort((a, b) => b.capacity - a.capacity)
	);

	// Available vehicles (not yet selected and available)
	const availableVehicles = $derived(
		suitableVehicles.filter(
			(v) => v.isAvailable && !selectedVehicles.some((sv) => sv.vehicleId === v.id)
		)
	);

	// Validation result
	const validation = $derived(validateCapacity(selectedVehicles, groupSize, vehicleOptions));

	// Notify parent of validation changes
	$effect(() => {
		onValidationChange(validation);
	});

	// Total capacity
	const totalCapacity = $derived(calculateTotalCapacity(selectedVehicles));

	// Add vehicle handler
	function addVehicle(vehicleId: string) {
		const vehicle = vehicleOptions.find((v) => v.id === vehicleId);
		if (!vehicle) return;

		// Check if already selected
		const existing = selectedVehicles.find((v) => v.vehicleId === vehicleId);
		if (existing) {
			// Increment quantity
			selectedVehicles = selectedVehicles.map((v) =>
				v.vehicleId === vehicleId ? { ...v, quantity: v.quantity + 1 } : v
			);
		} else {
			// Add new
			selectedVehicles = [
				...selectedVehicles,
				{
					vehicleId: vehicle.id,
					vehicleName: vehicle.name,
					capacity: vehicle.capacity,
					quantity: 1
				}
			];
		}
	}

	// Remove vehicle handler
	function removeVehicle(vehicleId: string) {
		const existing = selectedVehicles.find((v) => v.vehicleId === vehicleId);
		if (!existing) return;

		if (existing.quantity > 1) {
			// Decrement quantity
			selectedVehicles = selectedVehicles.map((v) =>
				v.vehicleId === vehicleId ? { ...v, quantity: v.quantity - 1 } : v
			);
		} else {
			// Remove entirely
			selectedVehicles = selectedVehicles.filter((v) => v.vehicleId !== vehicleId);
		}
	}

	// Format currency
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}
</script>

<div class="space-y-4">
	<!-- Capacity Status Banner -->
	{#if selectedVehicles.length > 0}
		<Alert
			color={validation.isValid ? 'green' : 'yellow'}
			class="flex items-center justify-between"
		>
			<div class="flex items-center gap-2">
				{#if validation.isValid}
					<CheckCircleOutline class="w-5 h-5" />
				{:else}
					<ExclamationCircleOutline class="w-5 h-5" />
				{/if}
				<span>
					<strong>Capacidad:</strong>
					{totalCapacity} pasajeros
					{#if groupSize > 0}
						<span class="text-gray-600 dark:text-gray-400">
							({groupSize} requeridos)
						</span>
					{/if}
				</span>
			</div>
			{#if !validation.isValid}
				<Badge color="yellow">Faltan {validation.shortfall} lugares</Badge>
			{/if}
		</Alert>
	{/if}

	<!-- Selected Vehicles -->
	{#if selectedVehicles.length > 0}
		<div class="space-y-2">
			<h6 class="text-sm font-medium text-gray-700 dark:text-gray-300">
				Vehículos Seleccionados ({selectedVehicles.length})
			</h6>
			<div class="space-y-2">
				{#each selectedVehicles as sv}
					{@const vehicle = vehicleOptions.find((v) => v.id === sv.vehicleId)}
					<div
						class="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg"
					>
						<div class="flex items-center gap-3">
							<div class="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
								<TruckOutline class="w-5 h-5 text-primary-600 dark:text-primary-400" />
							</div>
							<div>
								<div class="font-medium text-gray-900 dark:text-white">
									{sv.quantity > 1 ? `${sv.quantity}x ` : ''}{sv.vehicleName}
								</div>
								<div class="text-sm text-gray-500 dark:text-gray-400">
									{sv.capacity * sv.quantity} pasajeros
									{#if vehicle?.dailyCost}
										· {formatCurrency(vehicle.dailyCost * sv.quantity)}/día
									{/if}
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if sv.quantity > 1}
								<Badge color="blue">{sv.quantity}x</Badge>
							{/if}
							<Button
								color="red"
								size="xs"
								outline
								onclick={() => removeVehicle(sv.vehicleId)}
								title="Remover vehículo"
							>
								<TrashBinOutline class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Suggestions when capacity is insufficient -->
	{#if !validation.isValid && validation.suggestions.length > 0}
		<div class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
			<div class="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
				<LightbulbOutline class="w-5 h-5" />
				<span class="font-medium">Sugerencias</span>
			</div>
			<ul class="text-sm text-amber-600 dark:text-amber-300 space-y-1">
				{#each validation.suggestions as suggestion}
					<li>• {suggestion.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Available Vehicles to Add -->
	<div>
		<h6 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
			{selectedVehicles.length > 0 ? 'Agregar más vehículos' : 'Seleccionar vehículo'}
		</h6>

		{#if availableVehicles.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
				No hay vehículos adicionales disponibles
			</p>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
				{#each availableVehicles as vehicle}
					{@const capacityFits = vehicle.capacity >= validation.shortfall}
					<button
						type="button"
						onclick={() => addVehicle(vehicle.id)}
						class="p-3 text-left border rounded-lg transition-all hover:border-primary-300 dark:hover:border-primary-700
							{capacityFits && !validation.isValid
							? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
							: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}"
					>
						<div class="flex items-center gap-2">
							<TruckOutline class="w-4 h-4 text-gray-500" />
							<span class="font-medium text-gray-900 dark:text-white truncate">
								{vehicle.name}
							</span>
							<Badge color={capacityFits && !validation.isValid ? 'green' : 'gray'} class="ml-auto">
								{vehicle.capacity} pax
							</Badge>
						</div>
						{#if vehicle.dailyCost}
							<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								{formatCurrency(vehicle.dailyCost)}/día
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Add more of same type -->
	{#if selectedVehicles.length > 0}
		<div class="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
			{#each selectedVehicles as sv}
				{@const vehicle = vehicleOptions.find((v) => v.id === sv.vehicleId)}
				{#if vehicle?.isAvailable}
					<Button size="xs" color="light" onclick={() => addVehicle(sv.vehicleId)}>
						<PlusOutline class="w-3 h-3 me-1" />
						Agregar otro {sv.vehicleName}
					</Button>
				{/if}
			{/each}
		</div>
	{/if}
</div>
