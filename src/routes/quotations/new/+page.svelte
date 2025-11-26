<script lang="ts">
	import {
		Card,
		Button,
		Label,
		Input,
		Toggle,
		Spinner,
		Alert,
		Helper
	} from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		TruckOutline,
		UserGroupOutline,
		CheckCircleSolid,
		MapPinOutline,
		ClockOutline,
		ExclamationCircleOutline,
		RefreshOutline
	} from 'flowbite-svelte-icons';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { onMount } from 'svelte';
	import {
		routeCalculationService,
		formatDuration,
		formatDistance,
		type RouteResult
	} from '$lib/services';
	import { t } from '$lib/i18n';

	let { data } = $props();

	// Query vehicles and parameters from Convex
	const vehiclesQuery = useQuery(
		api.vehicles.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const parametersQuery = useQuery(
		api.parameters.getActive,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const vehicles = $derived(vehiclesQuery.data || []);
	const activeVehicles = $derived(vehicles.filter((v) => v.status === 'active'));
	const isLoadingVehicles = $derived(vehiclesQuery.isLoading);
	const parameters = $derived(parametersQuery.data);

	// Google Maps state
	let mapsLoaded = $state(false);
	let mapsError = $state<string | null>(null);

	// Form state
	let origin = $state('');
	let destination = $state('');
	let groupSize = $state(1);
	let estimatedDays = $state(1);
	let selectedVehicleId = $state<string | null>(null);

	// Cost options
	let includeFuel = $state(true);
	let includeMeals = $state(true);
	let includeTolls = $state(true);
	let includeDriverIncentive = $state(true);

	// Route calculation state
	let routeResult = $state<RouteResult | null>(null);
	let isCalculatingRoute = $state(false);
	let routeError = $state<string | null>(null);

	// Derived: selected vehicle details
	const selectedVehicle = $derived(
		selectedVehicleId ? vehicles.find((v) => v._id === selectedVehicleId) : null
	);

	// Derived: vehicle base location (or default to origin if not set)
	const vehicleBaseLocation = $derived(
		selectedVehicle?.baseLocation || ''
	);

	// Derived: whether deadhead calculation is needed
	const needsDeadhead = $derived(
		vehicleBaseLocation && origin && vehicleBaseLocation.toLowerCase() !== origin.toLowerCase()
	);

	// Filter vehicles by capacity
	const suitableVehicles = $derived(
		activeVehicles.filter((v) => v.passengerCapacity >= groupSize)
	);

	// Initialize Google Maps on mount
	onMount(() => {
		// Check if Google Maps is already loaded
		if (window.google?.maps) {
			initializeMaps();
		} else {
			// Wait for Google Maps to load
			const checkMaps = setInterval(() => {
				if (window.google?.maps) {
					clearInterval(checkMaps);
					initializeMaps();
				}
			}, 100);

			// Timeout after 10 seconds
			setTimeout(() => {
				clearInterval(checkMaps);
				if (!mapsLoaded) {
					mapsError = 'Google Maps failed to load. Please refresh the page.';
				}
			}, 10000);
		}
	});

	function initializeMaps() {
		const success = routeCalculationService.initialize();
		if (success) {
			mapsLoaded = true;
		} else {
			mapsError = 'Failed to initialize route calculation service';
		}
	}

	async function calculateRoute() {
		if (!origin || !destination) {
			routeError = 'Please enter both origin and destination';
			return;
		}

		if (!mapsLoaded) {
			routeError = 'Google Maps is not loaded yet';
			return;
		}

		isCalculatingRoute = true;
		routeError = null;

		try {
			// Determine base location - use vehicle base or origin if not set
			const baseLocation = vehicleBaseLocation || origin;

			if (baseLocation === origin || !vehicleBaseLocation) {
				// Simple route: origin to destination round trip
				routeResult = await routeCalculationService.calculateSimpleRoute(origin, destination);
			} else {
				// Full route with deadhead: base -> origin -> destination -> base
				routeResult = await routeCalculationService.calculateRoute(origin, destination, baseLocation);
			}
		} catch (error) {
			console.error('Route calculation error:', error);
			routeError = error instanceof Error ? error.message : 'Failed to calculate route';
			routeResult = null;
		} finally {
			isCalculatingRoute = false;
		}
	}

	// Auto-recalculate when relevant fields change
	$effect(() => {
		// Track dependencies
		const _ = [origin, destination, vehicleBaseLocation];

		// Only auto-calculate if we have both origin and destination
		if (origin && destination && mapsLoaded && !isCalculatingRoute) {
			// Debounce the calculation
			const timeout = setTimeout(() => {
				calculateRoute();
			}, 500);
			return () => clearTimeout(timeout);
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

	function selectVehicle(vehicleId: string) {
		selectedVehicleId = vehicleId;
		// Reset route when vehicle changes (base location might differ)
		routeResult = null;
	}

	// Calculate estimated costs based on route
	const estimatedCosts = $derived(() => {
		if (!routeResult || !selectedVehicle || !parameters) return null;

		const distance = routeResult.totalDistance;
		const days = estimatedDays;

		// Fuel costs
		const fuelEfficiencyKpg = selectedVehicle.fuelEfficiencyUnit === 'kpl'
			? selectedVehicle.fuelEfficiency * 3.78541 // Convert km/L to km/gal
			: selectedVehicle.fuelEfficiency;
		const fuelConsumption = distance / fuelEfficiencyKpg;
		const fuelCost = fuelConsumption * parameters.fuelPrice;

		// Driver costs
		const mealCost = days * parameters.mealCostPerDay;
		const lodgingCost = days > 1 ? (days - 1) * parameters.hotelCostPerNight : 0;
		const incentiveCost = includeDriverIncentive ? days * parameters.driverIncentivePerDay : 0;

		// Vehicle costs
		const vehicleDistanceCost = distance * selectedVehicle.costPerDistance;
		const vehicleDailyCost = days * selectedVehicle.costPerDay;

		// Total cost
		const total =
			(includeFuel ? fuelCost : 0) +
			(includeMeals ? mealCost + lodgingCost : 0) +
			(includeDriverIncentive ? incentiveCost : 0) +
			vehicleDistanceCost +
			vehicleDailyCost;

		return {
			fuel: Math.round(fuelCost),
			meals: Math.round(mealCost),
			lodging: Math.round(lodgingCost),
			incentive: Math.round(incentiveCost),
			vehicleDistance: Math.round(vehicleDistanceCost),
			vehicleDaily: Math.round(vehicleDailyCost),
			total: Math.round(total)
		};
	});

	const canCalculateQuotation = $derived(
		origin && destination && selectedVehicleId && routeResult && !isCalculatingRoute
	);
</script>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<Button href="/quotations" color="alternative" size="sm">
			<ArrowLeftOutline class="w-4 h-4 mr-2" />
			{$t('common.cancel')}
		</Button>
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('quotations.new.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">{$t('quotations.new.subtitle')}</p>
		</div>
	</div>

	{#if mapsError}
		<Alert color="red">
			<ExclamationCircleOutline slot="icon" class="w-5 h-5" />
			{mapsError}
		</Alert>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Column: Form -->
		<div class="lg:col-span-2 space-y-6">
			<Card class="max-w-none !p-6">
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('quotations.new.tripDetails')}</h5>

				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label for="origin" class="mb-2">{$t('quotations.new.origin')} *</Label>
							<Input
								id="origin"
								bind:value={origin}
								placeholder={$t('quotations.new.originPlaceholder')}
								class="h-11"
							/>
						</div>

						<div>
							<Label for="destination" class="mb-2">{$t('quotations.new.destination')} *</Label>
							<Input
								id="destination"
								bind:value={destination}
								placeholder={$t('quotations.new.destinationPlaceholder')}
								class="h-11"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<Label for="groupSize" class="mb-2">{$t('quotations.new.passengers')}</Label>
							<Input
								id="groupSize"
								type="number"
								bind:value={groupSize}
								min="1"
								placeholder="1"
								class="h-11"
							/>
						</div>
						<div>
							<Label for="estimatedDays" class="mb-2">{$t('quotations.new.days')}</Label>
							<Input
								id="estimatedDays"
								type="number"
								bind:value={estimatedDays}
								min="1"
								placeholder="1"
								class="h-11"
							/>
						</div>
					</div>

					{#if needsDeadhead && selectedVehicle}
						<Alert color="blue" class="mt-4">
							<MapPinOutline slot="icon" class="w-5 h-5" />
							<span class="font-medium">{$t('quotations.new.repositioning')}:</span>
							{$t('quotations.new.deadheadAlert')}
						</Alert>
					{/if}
				</div>
			</Card>

			<Card class="max-w-none !p-6">
				<div class="flex items-center justify-between mb-4">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('quotations.new.vehicleSelection')}</h5>
					{#if groupSize > 1}
						<span class="text-sm text-gray-500 dark:text-gray-400">
							{groupSize}+ {$t('vehicles.fields.passengers')}
						</span>
					{/if}
				</div>

				{#if isLoadingVehicles}
					<div class="flex justify-center py-8">
						<Spinner size="6" />
					</div>
				{:else if activeVehicles.length === 0}
					<div class="text-center py-8">
						<TruckOutline class="w-12 h-12 mx-auto text-gray-400 mb-3" />
						<p class="text-gray-500 dark:text-gray-400 mb-2">{$t('quotations.new.noVehiclesAvailable')}</p>
						<Button href="/vehicles" size="sm" color="alternative">
							{$t('dashboard.viewFleet')}
						</Button>
					</div>
				{:else if suitableVehicles.length === 0}
					<div class="text-center py-8">
						<UserGroupOutline class="w-12 h-12 mx-auto text-amber-400 mb-3" />
						<p class="text-gray-500 dark:text-gray-400 mb-2">
							{$t('quotations.new.noVehiclesAvailable')} ({groupSize} {$t('quotations.new.passengers')})
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						{#each suitableVehicles as vehicle}
							<button
								type="button"
								onclick={() => selectVehicle(vehicle._id)}
								class="relative p-4 rounded-lg border-2 text-left transition-all
									{selectedVehicleId === vehicle._id
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}"
							>
								{#if selectedVehicleId === vehicle._id}
									<div class="absolute top-2 right-2">
										<CheckCircleSolid class="w-5 h-5 text-primary-500" />
									</div>
								{/if}

								<div class="flex items-start gap-3">
									<div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
										<TruckOutline class="w-6 h-6 text-gray-600 dark:text-gray-400" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="font-medium text-gray-900 dark:text-white truncate">
											{vehicle.name}
										</div>
										{#if vehicle.make || vehicle.model}
											<div class="text-sm text-gray-500 dark:text-gray-400 truncate">
												{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
											</div>
										{/if}
										<div class="flex items-center gap-2 mt-2 flex-wrap">
											<span class="text-xs text-gray-500 dark:text-gray-400">
												{vehicle.passengerCapacity} pax
											</span>
											<span class="text-gray-300 dark:text-gray-600">•</span>
											<span class="text-xs text-gray-500 dark:text-gray-400">
												{vehicle.fuelEfficiency} {vehicle.fuelEfficiencyUnit === 'kpl' ? 'km/L' : vehicle.fuelEfficiencyUnit}
											</span>
											{#if vehicle.baseLocation}
												<span class="text-gray-300 dark:text-gray-600">•</span>
												<span class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
													<MapPinOutline class="w-3 h-3" />
													{vehicle.baseLocation.split(',')[0]}
												</span>
											{/if}
										</div>
										<div class="flex items-center gap-2 mt-1">
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300">
												{formatCurrency(vehicle.costPerDay)}/day
											</span>
											<span class="text-gray-300 dark:text-gray-600">•</span>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300">
												{formatCurrency(vehicle.costPerDistance)}/{vehicle.distanceUnit}
											</span>
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</Card>

			<Card class="max-w-none !p-6">
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('quotations.new.pricingOptions')}</h5>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Toggle bind:checked={includeFuel}>{$t('quotations.new.fuelCost')}</Toggle>
					<Toggle bind:checked={includeMeals}>{$t('quotations.new.mealsCost')}</Toggle>
					<Toggle bind:checked={includeTolls}>{$t('quotations.new.tollCost')}</Toggle>
					<Toggle bind:checked={includeDriverIncentive}>{$t('quotations.new.driverCost')}</Toggle>
				</div>
			</Card>
		</div>

		<!-- Right Column: Map & Summary -->
		<div class="space-y-6">
			<Card class="max-w-none !p-6">
				<div class="flex items-center justify-between mb-4">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('quotations.new.routeInfo')}</h5>
					{#if origin && destination}
						<Button
							size="xs"
							color="light"
							onclick={calculateRoute}
							disabled={isCalculatingRoute}
						>
							{#if isCalculatingRoute}
								<Spinner size="3" class="mr-1" />
							{:else}
								<RefreshOutline class="w-3 h-3 mr-1" />
							{/if}
							{$t('quotations.new.calculateRoute')}
						</Button>
					{/if}
				</div>

				{#if isCalculatingRoute}
					<div class="flex flex-col items-center justify-center py-8">
						<Spinner size="6" class="mb-2" />
						<p class="text-sm text-gray-500 dark:text-gray-400">{$t('quotations.new.calculating')}</p>
					</div>
				{:else if routeError}
					<Alert color="red" class="mb-4">
						<ExclamationCircleOutline slot="icon" class="w-4 h-4" />
						{routeError}
					</Alert>
				{:else if routeResult}
					<div class="space-y-3">
						<!-- Route summary -->
						<div class="grid grid-cols-2 gap-3">
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-xs text-gray-500 dark:text-gray-400">{$t('quotations.new.totalDistance')}</p>
								<p class="text-lg font-bold text-gray-900 dark:text-white">
									{formatDistance(routeResult.totalDistance)}
								</p>
							</div>
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-xs text-gray-500 dark:text-gray-400">{$t('quotations.new.estimatedTime')}</p>
								<p class="text-lg font-bold text-gray-900 dark:text-white">
									{formatDuration(routeResult.totalTime)}
								</p>
							</div>
						</div>

						<!-- Route breakdown -->
						<div class="space-y-2 text-sm">
							{#if routeResult.deadheadDistance > 0}
								<div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
									<p class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{$t('quotations.new.repositioning')}</p>
									<div class="flex justify-between text-blue-700 dark:text-blue-300">
										<span>Base → {$t('quotations.new.origin')}</span>
										<span>{formatDistance(routeResult.baseToOrigin)}</span>
									</div>
									<div class="flex justify-between text-blue-700 dark:text-blue-300">
										<span>{$t('quotations.new.destination')} → Base</span>
										<span>{formatDistance(routeResult.destinationToBase)}</span>
									</div>
									<div class="flex justify-between font-medium text-blue-800 dark:text-blue-200 pt-1 border-t border-blue-200 dark:border-blue-700 mt-1">
										<span>{$t('quotations.new.subtotal')}</span>
										<span>{formatDistance(routeResult.deadheadDistance)}</span>
									</div>
								</div>
							{/if}

							<div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800">
								<p class="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">{$t('quotations.new.mainTrip')}</p>
								<div class="flex justify-between text-emerald-700 dark:text-emerald-300">
									<span>{$t('quotations.new.origin')} → {$t('quotations.new.destination')}</span>
									<span>{formatDistance(routeResult.originToDestination)}</span>
								</div>
								<div class="flex justify-between text-emerald-700 dark:text-emerald-300">
									<span>{$t('quotations.new.destination')} → {$t('quotations.new.origin')}</span>
									<span>{formatDistance(routeResult.originToDestination)}</span>
								</div>
								<div class="flex justify-between font-medium text-emerald-800 dark:text-emerald-200 pt-1 border-t border-emerald-200 dark:border-emerald-700 mt-1">
									<span>{$t('quotations.new.subtotal')}</span>
									<span>{formatDistance(routeResult.mainTripDistance)}</span>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<div class="text-center py-8">
						<MapPinOutline class="w-10 h-10 mx-auto text-gray-400 mb-2" />
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{$t('quotations.new.originPlaceholder')}
						</p>
					</div>
				{/if}
			</Card>

			<Card class="max-w-none !p-6">
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('quotations.new.costEstimate')}</h5>

				{#if selectedVehicle && routeResult && estimatedCosts()}
					{@const costs = estimatedCosts()}
					<div class="space-y-3 mb-4">
						<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{$t('quotations.new.selectVehicle')}</p>
							<p class="font-medium text-gray-900 dark:text-white">{selectedVehicle.name}</p>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-xs text-gray-500 dark:text-gray-400">{$t('quotations.new.days')}</p>
								<p class="font-medium text-gray-900 dark:text-white">{estimatedDays}</p>
							</div>
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-xs text-gray-500 dark:text-gray-400">{$t('quotations.new.passengers')}</p>
								<p class="font-medium text-gray-900 dark:text-white">{groupSize} pax</p>
							</div>
						</div>

						<!-- Cost breakdown -->
						<div class="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2 text-sm">
							{#if includeFuel}
								<div class="flex justify-between">
									<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.fuelCost')}</span>
									<span class="text-gray-900 dark:text-white">{formatCurrency(costs.fuel)}</span>
								</div>
							{/if}
							{#if includeMeals}
								<div class="flex justify-between">
									<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.mealsCost')}</span>
									<span class="text-gray-900 dark:text-white">{formatCurrency(costs.meals)}</span>
								</div>
								{#if costs.lodging > 0}
									<div class="flex justify-between">
										<span class="text-gray-600 dark:text-gray-400">{$t('settings.fields.hotelCost')}</span>
										<span class="text-gray-900 dark:text-white">{formatCurrency(costs.lodging)}</span>
									</div>
								{/if}
							{/if}
							{#if includeDriverIncentive && costs.incentive > 0}
								<div class="flex justify-between">
									<span class="text-gray-600 dark:text-gray-400">{$t('settings.fields.driverIncentive')}</span>
									<span class="text-gray-900 dark:text-white">{formatCurrency(costs.incentive)}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.vehicleCost')}</span>
								<span class="text-gray-900 dark:text-white">{formatCurrency(costs.vehicleDistance)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.vehicleCost')} ({$t('units.days')})</span>
								<span class="text-gray-900 dark:text-white">{formatCurrency(costs.vehicleDaily)}</span>
							</div>

							<div class="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
								<span class="text-gray-900 dark:text-white">{$t('quotations.new.total')}</span>
								<span class="text-primary-600 dark:text-primary-400">{formatCurrency(costs.total)}</span>
							</div>
						</div>
					</div>
				{:else if selectedVehicle && !routeResult}
					<p class="text-gray-500 dark:text-gray-400 mb-4">{$t('quotations.new.calculateRoute')}</p>
				{:else}
					<p class="text-gray-500 dark:text-gray-400 mb-4">{$t('quotations.new.selectVehicle')}</p>
				{/if}

				<div class="pt-4 border-t border-gray-200 dark:border-gray-700">
					<Button
						class="w-full"
						disabled={!canCalculateQuotation}
					>
						{$t('quotations.new.generateQuotation')}
					</Button>
					{#if !canCalculateQuotation}
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
							{#if !origin || !destination}
								{$t('quotations.new.origin')} / {$t('quotations.new.destination')}
							{:else if !selectedVehicleId}
								{$t('quotations.new.selectVehicle')}
							{:else if !routeResult}
								{$t('quotations.new.calculateRoute')}
							{/if}
						</p>
					{/if}
				</div>
			</Card>
		</div>
	</div>
</div>
