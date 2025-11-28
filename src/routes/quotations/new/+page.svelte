<script lang="ts">
	import {
		Card,
		Button,
		Label,
		Input,
		Toggle,
		Range,
		Spinner,
		Alert,
		Select,
		Toast,
		Modal
	} from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		TruckOutline,
		UsersGroupOutline,
		CheckCircleSolid,
		MapPinOutline,
		ExclamationCircleOutline,
		RefreshOutline,
		UserOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		MapPinAltOutline,
		CalendarWeekOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		routeCalculationService,
		formatDuration,
		formatDistance,
		type RouteResult
	} from '$lib/services';
	import { t } from '$lib/i18n';
	import type { Id } from '$convex/_generated/dataModel';

	let { data } = $props();

	const client = useConvexClient();

	// Query vehicles, clients, and parameters from Convex
	const vehiclesQuery = useQuery(
		api.vehicles.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const parametersQuery = useQuery(
		api.parameters.getActive,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const vehicles = $derived(vehiclesQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const activeVehicles = $derived(vehicles.filter((v) => v.status === 'active'));
	const activeClients = $derived(clients.filter((c) => c.status === 'active'));
	const isLoadingVehicles = $derived(vehiclesQuery.isLoading);
	const isLoadingClients = $derived(clientsQuery.isLoading);
	const parameters = $derived(parametersQuery.data);

	// Markup options
	const markupOptions = [10, 15, 20, 25, 30];

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Saving state
	let isSaving = $state(false);

	// Google Maps state
	let mapsLoaded = $state(false);
	let mapsError = $state<string | null>(null);

	// Form state
	let origin = $state('');
	let destination = $state('');
	let groupSize = $state(1);
	let estimatedDays = $state(1);
	let extraKm = $state(0); // Extra km for local movement at destination
	let selectedVehicleId = $state<string | null>(null);
	let selectedClientId = $state<string>('');
	let selectedMarkup = $state(20); // Default 20% markup
	let notes = $state('');

	// Departure date
	let departureDate = $state('');

	// Calculate date range for vehicle availability
	const departureDateMs = $derived(departureDate ? new Date(departureDate).getTime() : 0);
	const endDateMs = $derived(departureDateMs ? departureDateMs + (estimatedDays * 24 * 60 * 60 * 1000) : 0);

	// Query unavailable vehicles when departure date is set
	const unavailableVehiclesQuery = useQuery(
		api.itineraries.getUnavailableVehicles,
		() => (tenantStore.tenantId && departureDateMs && endDateMs ? {
			tenantId: tenantStore.tenantId,
			startDate: departureDateMs,
			endDate: endDateMs
		} : 'skip')
	);

	const unavailableVehicleIds = $derived(unavailableVehiclesQuery.data || []);

	// Cost options
	let includeFuel = $state(true);
	let includeMeals = $state(true);
	let includeTolls = $state(true);
	let includeDriverIncentive = $state(true);

	// Map modal state
	let showMapModal = $state(false);
	let mapContainer: HTMLDivElement | null = $state(null);
	let mapInstance: google.maps.Map | null = $state(null);
	let directionsRenderer: google.maps.DirectionsRenderer | null = $state(null);

	// Get client display name
	function getClientName(clientData: any): string {
		if (!clientData) return '';
		if (clientData.type === 'company') {
			return clientData.companyName || 'Unnamed Company';
		}
		return [clientData.firstName, clientData.lastName].filter(Boolean).join(' ') || 'Unnamed';
	}

	// Get selected client's discount
	const selectedClient = $derived(
		selectedClientId ? clients.find((c) => c._id === selectedClientId) : null
	);
	const clientDiscount = $derived(selectedClient?.discountPercentage || 0);

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

	// Filter vehicles by capacity (availability is shown in UI but not filtered out)
	const suitableVehicles = $derived(
		activeVehicles.filter((v) => v.passengerCapacity >= groupSize)
	);

	// Check if a vehicle is unavailable for the selected dates
	function isVehicleUnavailable(vehicleId: string): boolean {
		return unavailableVehicleIds.includes(vehicleId);
	}

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

	// Map modal functions
	async function showMap() {
		if (!routeResult || !origin || !destination) return;

		showMapModal = true;

		// Wait for modal to open and container to be available
		await new Promise(resolve => setTimeout(resolve, 100));

		if (mapContainer && window.google?.maps) {
			initializeMapInModal();
		}
	}

	function initializeMapInModal() {
		if (!mapContainer || !window.google?.maps) return;

		// Create map instance
		mapInstance = new google.maps.Map(mapContainer, {
			zoom: 8,
			center: { lat: 15.5, lng: -88.0 }, // Honduras center
			mapTypeControl: false,
			streetViewControl: false,
			fullscreenControl: true
		});

		// Create directions renderer
		directionsRenderer = new google.maps.DirectionsRenderer({
			map: mapInstance,
			suppressMarkers: false,
			polylineOptions: {
				strokeColor: '#0ea5e9',
				strokeWeight: 4
			}
		});

		// Get directions and display on map
		const directionsService = new google.maps.DirectionsService();
		directionsService.route({
			origin,
			destination,
			travelMode: google.maps.TravelMode.DRIVING
		}, (result, status) => {
			if (status === 'OK' && result && directionsRenderer) {
				directionsRenderer.setDirections(result);
			}
		});
	}

	function closeMapModal() {
		showMapModal = false;
		mapInstance = null;
		directionsRenderer = null;
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	// Round to nearest value (e.g., round to nearest 50)
	function roundToNearest(value: number, nearest: number): number {
		if (nearest <= 0) return Math.round(value);
		return Math.round(value / nearest) * nearest;
	}

	function selectVehicle(vehicleId: string) {
		selectedVehicleId = vehicleId;
		// Reset route when vehicle changes (base location might differ)
		routeResult = null;
	}

	// Calculate estimated costs based on route
	const estimatedCosts = $derived(() => {
		if (!routeResult || !selectedVehicle || !parameters) return null;

		// Include extra km in total distance calculation
		const distance = routeResult.totalDistance + extraKm;
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
		const incentiveCost = days * parameters.driverIncentivePerDay;

		// Vehicle costs
		const vehicleDistanceCost = distance * selectedVehicle.costPerDistance;
		const vehicleDailyCost = days * selectedVehicle.costPerDay;

		// Total base cost (all items calculated regardless of toggles)
		const baseCost =
			(includeFuel ? fuelCost : 0) +
			(includeMeals ? mealCost + lodgingCost : 0) +
			(includeDriverIncentive ? incentiveCost : 0) +
			vehicleDistanceCost +
			vehicleDailyCost;

		// Apply markup
		const markupMultiplier = 1 + (selectedMarkup / 100);
		const priceBeforeDiscount = baseCost * markupMultiplier;

		// Apply client discount
		const discountAmount = priceBeforeDiscount * (clientDiscount / 100);
		const priceAfterDiscount = priceBeforeDiscount - discountAmount;

		// Get rounding parameters (defaults: HNL=50, USD=5)
		const roundingHnl = parameters.roundingHnl || 50;
		const roundingUsd = parameters.roundingUsd || 5;

		// Calculate USD price
		const exchangeRate = parameters.exchangeRate || 24.5;
		const priceUsd = priceAfterDiscount / exchangeRate;

		// Apply rounding
		const finalPriceHnl = roundToNearest(priceAfterDiscount, roundingHnl);
		const finalPriceUsd = roundToNearest(priceUsd, roundingUsd);

		return {
			fuel: Math.round(fuelCost),
			meals: Math.round(mealCost),
			lodging: Math.round(lodgingCost),
			incentive: Math.round(incentiveCost),
			vehicleDistance: Math.round(vehicleDistanceCost),
			vehicleDaily: Math.round(vehicleDailyCost),
			baseCost: Math.round(baseCost),
			markup: selectedMarkup,
			priceBeforeDiscount: Math.round(priceBeforeDiscount),
			discount: clientDiscount,
			discountAmount: Math.round(discountAmount),
			finalPriceHnl,
			finalPriceUsd,
			exchangeRate,
			roundingHnl,
			roundingUsd,
			totalDistance: distance,
			extraKm
		};
	});

	// Generate all pricing options for display
	const pricingOptions = $derived(() => {
		if (!routeResult || !selectedVehicle || !parameters) return [];

		const costs = estimatedCosts();
		if (!costs) return [];

		return markupOptions.map(markup => {
			const markupMultiplier = 1 + (markup / 100);
			const priceBeforeDiscount = costs.baseCost * markupMultiplier;
			const discountAmount = priceBeforeDiscount * (clientDiscount / 100);
			const priceAfterDiscount = priceBeforeDiscount - discountAmount;
			const priceUsd = priceAfterDiscount / costs.exchangeRate;

			// Apply rounding
			const finalPriceHnl = roundToNearest(priceAfterDiscount, costs.roundingHnl);
			const finalPriceUsd = roundToNearest(priceUsd, costs.roundingUsd);

			return {
				markup,
				priceHnl: finalPriceHnl,
				priceUsd: finalPriceUsd,
				selected: markup === selectedMarkup
			};
		});
	});

	const canSaveQuotation = $derived(
		origin && destination && selectedVehicleId && routeResult && !isCalculatingRoute && !isSaving
	);

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	async function saveQuotation(asDraft: boolean = false) {
		if (!canSaveQuotation || !tenantStore.tenantId || !selectedVehicle || !parameters || !routeResult) return;

		const costs = estimatedCosts();
		if (!costs) return;

		isSaving = true;

		try {
			const quotationData = {
				tenantId: tenantStore.tenantId as Id<'tenants'>,
				clientId: selectedClientId ? (selectedClientId as Id<'clients'>) : undefined,
				vehicleId: selectedVehicleId as Id<'vehicles'>,
				origin,
				destination,
				baseLocation: vehicleBaseLocation || origin,
				groupSize,
				extraMileage: extraKm,
				estimatedDays,
				departureDate: departureDate ? new Date(departureDate).getTime() : undefined,
				totalDistance: routeResult.totalDistance + extraKm,
				totalTime: routeResult.totalTime,
				fuelCost: costs.fuel,
				refuelingCost: 0,
				driverMealsCost: costs.meals,
				driverLodgingCost: costs.lodging,
				driverIncentiveCost: costs.incentive,
				vehicleDistanceCost: costs.vehicleDistance,
				vehicleDailyCost: costs.vehicleDaily,
				tollCost: 0, // TODO: Implement toll calculation
				totalCost: costs.baseCost,
				selectedMarkupPercentage: selectedMarkup,
				salePriceHnl: costs.finalPriceHnl,
				salePriceUsd: costs.finalPriceUsd,
				exchangeRateUsed: costs.exchangeRate,
				includeFuel,
				includeMeals,
				includeTolls,
				includeDriverIncentive,
				status: asDraft ? 'draft' : 'draft',
				validUntil: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days validity
				notes: notes || undefined
			};

			const quotationId = await client.mutation(api.quotations.create, quotationData);
			showToastMessage($t('quotations.createSuccess'), 'success');

			// Navigate to quotation detail page
			setTimeout(() => {
				goto(`/quotations/${quotationId}`);
			}, 500);
		} catch (error) {
			console.error('Failed to save quotation:', error);
			showToastMessage($t('quotations.saveFailed'), 'error');
		} finally {
			isSaving = false;
		}
	}
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

					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<Label for="groupSize" class="mb-2">{$t('quotations.new.passengers')}: <span class="font-bold text-primary-600 dark:text-primary-400">{groupSize}</span></Label>
							<Range
								id="groupSize"
								bind:value={groupSize}
								min={1}
								max={60}
								step={1}
							/>
						</div>
						<div>
							<Label for="estimatedDays" class="mb-2">{$t('quotations.new.days')}: <span class="font-bold text-primary-600 dark:text-primary-400">{estimatedDays}</span></Label>
							<Range
								id="estimatedDays"
								bind:value={estimatedDays}
								min={1}
								max={30}
								step={1}
							/>
						</div>
						<div>
							<Label for="extraKm" class="mb-2">{$t('quotations.new.extraKm')}: <span class="font-bold text-primary-600 dark:text-primary-400">{extraKm}</span> km</Label>
							<Range
								id="extraKm"
								bind:value={extraKm}
								min={0}
								max={500}
								step={10}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{$t('quotations.new.extraKmHelp')}</p>
						</div>
						<div>
							<Label for="departureDate" class="mb-2 flex items-center gap-1">
								<CalendarWeekOutline class="w-4 h-4" />
								{$t('quotations.new.departureDate')}
							</Label>
							<Input
								id="departureDate"
								type="date"
								bind:value={departureDate}
								min={new Date().toISOString().split('T')[0]}
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

			<!-- Client Selection -->
			<Card class="max-w-none !p-6">
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('quotations.new.clientSelection')}</h5>

				{#if isLoadingClients}
					<div class="flex justify-center py-4">
						<Spinner size="6" />
					</div>
				{:else if activeClients.length === 0}
					<div class="text-center py-6">
						<UserOutline class="w-10 h-10 mx-auto text-gray-400 mb-2" />
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{$t('quotations.new.noClientsAvailable')}</p>
						<Button href="/clients" size="sm" color="alternative">
							{$t('dashboard.manageClients')}
						</Button>
					</div>
				{:else}
					<div class="space-y-3">
						<Select
							bind:value={selectedClientId}
							placeholder={$t('quotations.new.selectClientPlaceholder')}
							class="w-full"
						>
							<option value="">{$t('quotations.new.selectClientPlaceholder')}</option>
							{#each activeClients as clientItem}
								<option value={clientItem._id}>
									{getClientName(clientItem)}
									{#if clientItem.discountPercentage > 0}
										({clientItem.discountPercentage}% discount)
									{/if}
								</option>
							{/each}
						</Select>

						{#if selectedClient}
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<div class="flex items-center gap-2">
									<UserOutline class="w-4 h-4 text-gray-500" />
									<span class="font-medium text-gray-900 dark:text-white">{getClientName(selectedClient)}</span>
									{#if selectedClient.discountPercentage > 0}
										<StatusBadge status="{selectedClient.discountPercentage}% off" variant="pricing" />
									{/if}
								</div>
								{#if selectedClient.email || selectedClient.phone}
									<div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
										{selectedClient.email || ''} {selectedClient.email && selectedClient.phone ? '•' : ''} {selectedClient.phone || ''}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
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
						<UsersGroupOutline class="w-12 h-12 mx-auto text-amber-400 mb-3" />
						<p class="text-gray-500 dark:text-gray-400 mb-2">
							{$t('quotations.new.noVehiclesAvailable')} ({groupSize} {$t('quotations.new.passengers')})
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						{#each suitableVehicles as vehicle}
							{@const unavailable = isVehicleUnavailable(vehicle._id)}
							<button
								type="button"
								onclick={() => !unavailable && selectVehicle(vehicle._id)}
								disabled={unavailable}
								class="relative p-4 rounded-lg border-2 text-left transition-all
									{unavailable
									? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 opacity-60 cursor-not-allowed'
									: selectedVehicleId === vehicle._id
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}"
							>
								{#if selectedVehicleId === vehicle._id && !unavailable}
									<div class="absolute top-2 right-2">
										<CheckCircleSolid class="w-5 h-5 text-primary-500" />
									</div>
								{/if}
								{#if unavailable}
									<div class="absolute top-2 right-2">
										<span class="text-xs font-medium text-red-600 dark:text-red-400 px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded">{$t('quotations.new.vehicleUnavailable')}</span>
									</div>
								{/if}

								<div class="flex items-start gap-3">
									<div class="p-2 rounded-lg {unavailable ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}">
										<TruckOutline class="w-6 h-6 {unavailable ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="font-medium {unavailable ? 'text-red-800 dark:text-red-300' : 'text-gray-900 dark:text-white'} truncate">
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
						<div class="flex gap-2">
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
							{#if routeResult}
								<Button
									size="xs"
									color="blue"
									onclick={showMap}
								>
									<MapPinAltOutline class="w-3 h-3 mr-1" />
									{$t('quotations.new.viewMap')}
								</Button>
							{/if}
						</div>
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
									{formatDistance(routeResult.totalDistance + extraKm)}
								</p>
								{#if extraKm > 0}
									<p class="text-xs text-amber-600 dark:text-amber-400">+{formatDistance(extraKm)} extra</p>
								{/if}
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

							{#if extraKm > 0}
								<div class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
									<p class="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">{$t('quotations.new.extraKm')}</p>
									<div class="flex justify-between text-amber-700 dark:text-amber-300">
										<span>{$t('quotations.new.extraKmHelp')}</span>
										<span>{formatDistance(extraKm)}</span>
									</div>
								</div>
							{/if}
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

							<div class="flex justify-between font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
								<span class="text-gray-700 dark:text-gray-300">{$t('quotations.new.subtotal')}</span>
								<span class="text-gray-900 dark:text-white">{formatCurrency(costs.baseCost)}</span>
							</div>
						</div>

						<!-- Pricing Options -->
						<div class="pt-3 border-t border-gray-200 dark:border-gray-700">
							<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{$t('quotations.new.margin')}</p>
							<div class="grid grid-cols-5 gap-2">
								{#each pricingOptions() as option}
									<button
										type="button"
										onclick={() => selectedMarkup = option.markup}
										class="p-2 rounded-lg border-2 text-center transition-all
											{option.selected
											? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
											: 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}"
									>
										<p class="text-sm font-bold text-gray-900 dark:text-white">{option.markup}%</p>
										<p class="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(option.priceHnl)}</p>
									</button>
								{/each}
							</div>
						</div>

						<!-- Client discount -->
						{#if clientDiscount > 0}
							<div class="flex justify-between text-sm text-green-600 dark:text-green-400">
								<span>{$t('clients.fields.discount')} ({clientDiscount}%)</span>
								<span>-{formatCurrency(costs.discountAmount)}</span>
							</div>
						{/if}

						<!-- Final Price -->
						<div class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
							<div class="flex justify-between items-center">
								<div>
									<p class="text-sm text-gray-600 dark:text-gray-400">{$t('quotations.new.total')} ({selectedMarkup}% {$t('quotations.new.margin').toLowerCase()})</p>
									<p class="text-2xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(costs.finalPriceHnl)}</p>
								</div>
								<div class="text-right">
									<p class="text-xs text-gray-500 dark:text-gray-400">USD</p>
									<p class="text-lg font-semibold text-gray-900 dark:text-white">${costs.finalPriceUsd.toFixed(2)}</p>
								</div>
							</div>
						</div>
					</div>
				{:else if selectedVehicle && !routeResult}
					<p class="text-gray-500 dark:text-gray-400 mb-4">{$t('quotations.new.calculateRoute')}</p>
				{:else}
					<p class="text-gray-500 dark:text-gray-400 mb-4">{$t('quotations.new.selectVehicle')}</p>
				{/if}

				<div class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
					<Button
						class="w-full"
						onclick={() => saveQuotation(false)}
						disabled={!canSaveQuotation}
					>
						{#if isSaving}
							<Spinner size="4" class="mr-2" />
						{/if}
						{$t('quotations.new.generateQuotation')}
					</Button>
					<Button
						class="w-full"
						color="alternative"
						onclick={() => saveQuotation(true)}
						disabled={!canSaveQuotation}
					>
						{$t('quotations.new.saveDraft')}
					</Button>
					{#if !canSaveQuotation && !isSaving}
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

<!-- Map Modal -->
<Modal bind:open={showMapModal} size="xl" title={$t('quotations.new.routeMap')} on:close={closeMapModal}>
	<div class="space-y-4">
		<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
			<div class="flex items-center gap-1">
				<MapPinOutline class="w-4 h-4 text-green-500" />
				<span>{origin}</span>
			</div>
			<span class="text-gray-400">→</span>
			<div class="flex items-center gap-1">
				<MapPinOutline class="w-4 h-4 text-red-500" />
				<span>{destination}</span>
			</div>
		</div>
		<div
			bind:this={mapContainer}
			class="w-full h-96 rounded-lg border border-gray-200 dark:border-gray-700"
		></div>
		{#if routeResult}
			<div class="flex items-center justify-between text-sm">
				<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.totalDistance')}: <strong class="text-gray-900 dark:text-white">{formatDistance(routeResult.totalDistance + extraKm)}</strong></span>
				<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.estimatedTime')}: <strong class="text-gray-900 dark:text-white">{formatDuration(routeResult.totalTime)}</strong></span>
			</div>
		{/if}
	</div>
	<svelte:fragment slot="footer">
		<Button color="alternative" onclick={closeMapModal}>{$t('common.close')}</Button>
	</svelte:fragment>
</Modal>
