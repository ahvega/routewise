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
		Modal,
		AccordionItem,
		Accordion
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

	// Props
	let { quotation = null } = $props();

	// Type definitions for query data
	interface VehicleData {
		_id: string;
		name: string;
		passengerCapacity: number;
		baseLocation?: string;
		status?: string;
        fuelEfficiency: number;
        fuelEfficiencyUnit: string;
        costPerDay: number;
        costPerDistance: number;
        distanceUnit: string;
        fuelCapacity?: number;
        fuelCapacityUnit?: string;
	}
	interface ClientData {
		_id: string;
		discountPercentage?: number;
		firstName?: string;
		lastName?: string;
		companyName?: string;
        status?: string;
        email?: string;
        phone?: string;
	}

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

	// Query sales agents for assignment
	const salesAgentsQuery = useQuery(
		api.tenants.getSalesAgents,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query default sales agent
	const defaultAgentQuery = useQuery(
		api.tenants.getDefaultSalesAgent,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const vehicles = $derived(vehiclesQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const activeVehicles = $derived(vehicles.filter((v: any) => v.status === 'active'));
	const activeClients = $derived(clients.filter((c: any) => c.status === 'active'));
	const isLoadingVehicles = $derived(vehiclesQuery.isLoading);
	const isLoadingClients = $derived(clientsQuery.isLoading);
	const parameters = $derived(parametersQuery.data);
	const salesAgents = $derived(salesAgentsQuery.data || []);
	const defaultSalesAgent = $derived(defaultAgentQuery.data);

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
	let origin = $state(quotation?.origin || '');
	let destination = $state(quotation?.destination || '');
	let groupSize = $state(quotation?.groupSize || 1);
	let estimatedDays = $state(quotation?.estimatedDays || 1);
	let extraKm = $state(quotation?.extraMileage || 0);
	let selectedVehicleId = $state<string | null>(quotation?.vehicleId || null);
	let selectedClientId = $state<string>(quotation?.clientId || '');
	let selectedMarkup = $state(quotation?.selectedMarkupPercentage || 20);
	let notes = $state(quotation?.notes || '');

	// New quotation standardization fields
	let groupLeaderName = $state(quotation?.groupLeaderName || '');
	let assignedToId = $state<string>(quotation?.assignedTo || '');
	let paymentConditions = $state(quotation?.paymentConditions || 'contado');

	// Payment condition options
	const paymentConditionOptions = [
		{ value: 'contado', label: 'Contado' },
		{ value: 'credito_15', label: 'Crédito 15 días' },
		{ value: 'credito_30', label: 'Crédito 30 días' },
		{ value: 'credito_45', label: 'Crédito 45 días' },
		{ value: 'credito_60', label: 'Crédito 60 días' }
	];

	// Set default sales agent when query loads (only if creating new)
	$effect(() => {
		if (!quotation && defaultSalesAgent && !assignedToId) {
			assignedToId = defaultSalesAgent.userId;
		}
	});

	// Departure date
	let departureDate = $state(quotation?.departureDate ? new Date(quotation.departureDate).toISOString().split('T')[0] : '');

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

	// Trip type
	let isRoundTrip = $state(quotation?.isRoundTrip ?? true);

	// Cost options
	let includeFuel = $state(quotation?.includeFuel ?? true);
	let includeMeals = $state(quotation?.includeMeals ?? true);
	let includeTolls = $state(quotation?.includeTolls ?? true);
	let includeDriverIncentive = $state(quotation?.includeDriverIncentive ?? true);

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
		selectedClientId ? clients.find((c: ClientData) => c._id === selectedClientId) : null
	);
	const clientDiscount = $derived(selectedClient?.discountPercentage || 0);

	// Route calculation state
	let routeResult = $state<RouteResult | null>(null);
	let isCalculatingRoute = $state(false);
	let routeError = $state<string | null>(null);

	// Derived: selected vehicle details
	const selectedVehicle = $derived(
		selectedVehicleId ? vehicles.find((v: VehicleData) => v._id === selectedVehicleId) : null
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
		activeVehicles.filter((v: VehicleData) => v.passengerCapacity >= groupSize)
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
            // Auto-calculate route if editing an existing quotation
            if (quotation && origin && destination) {
                calculateRoute();
            }
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
				// Simple route: base = origin
				routeResult = await routeCalculationService.calculateSimpleRoute(origin, destination, isRoundTrip);
			} else {
				// Full route with deadhead: base -> origin -> destination -> base
				routeResult = await routeCalculationService.calculateRoute(origin, destination, baseLocation, isRoundTrip);
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

	// Format currency with 2 decimal places for precise rates (cost per km, cost per day)
	function formatCurrencyPrecise(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	}

	function formatUsd(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
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
		// Only reset if we are not initial loading or if the base location actually changed logic
        // But for simplicity, we let the user re-calculate or auto-recalc.
        if (!isCalculatingRoute) { 
		    routeResult = null;
        }
	}

	// Calculate estimated costs based on route
	const estimatedCosts = $derived(() => {
		if (!routeResult || !selectedVehicle || !parameters) return null;

		// Include extra km in total distance calculation
		const distance = routeResult.totalDistance + extraKm;
		const days = estimatedDays;
		const exchangeRate = parameters.exchangeRate || 24.5;

		// ============ FUEL CALCULATION WITH TANK AUTONOMY ============
		const fuelEfficiencyKpg = selectedVehicle.fuelEfficiencyUnit === 'kpl'
			? selectedVehicle.fuelEfficiency * 3.78541 // Convert km/L to km/gal
			: selectedVehicle.fuelEfficiency;
		const fuelConsumption = distance / fuelEfficiencyKpg; // Total gallons needed
		const fuelCost = fuelConsumption * parameters.fuelPrice;

		// Tank autonomy calculation (for expense advance reference)
		let tankCapacityGallons = selectedVehicle.fuelCapacity || 0;
		if (selectedVehicle.fuelCapacityUnit === 'liters') {
			tankCapacityGallons = selectedVehicle.fuelCapacity / 3.78541;
		}
		const tankRange = tankCapacityGallons * fuelEfficiencyKpg; // Full tank range in km
		const safetyThreshold = 0.85;
		const safeRange = tankRange * safetyThreshold; // Safe range (85% of tank)
		const extraFuelNeeded = distance > safeRange ? (distance - safeRange) / fuelEfficiencyKpg : 0;
		const fuelAdvanceCost = extraFuelNeeded * parameters.fuelPrice;

		// ============ VIÁTICOS (MEALS + LODGING) ============
		const mealCostPerDay = parameters.mealCostPerDay;
		const mealCost = days * mealCostPerDay;
		const lodgingNights = days > 1 ? days - 1 : 0;
		const hotelCostPerNight = parameters.hotelCostPerNight;
		const lodgingCost = lodgingNights * hotelCostPerNight;
		const viaticosTotalCost = mealCost + lodgingCost;

		// ============ DRIVER INCENTIVE (FREELANCER COMPENSATION) ============
		const incentivePerDay = parameters.driverIncentivePerDay;
		const incentiveCost = days * incentivePerDay;

		// ============ VEHICLE COSTS ============
		const costPerKm = selectedVehicle.costPerDistance;
		const costPerDay = selectedVehicle.costPerDay;
		const vehicleDistanceCost = distance * costPerKm;
		const vehicleDailyCost = days * costPerDay;
		const vehicleTotalCost = vehicleDistanceCost + vehicleDailyCost;

		// ============ TOTALS ============
		// Total base cost (all items calculated regardless of toggles)
		const baseCost =
			(includeFuel ? fuelCost : 0) +
			(includeMeals ? viaticosTotalCost : 0) +
			(includeDriverIncentive ? incentiveCost : 0) +
			vehicleTotalCost;

		// Apply markup
		const markupMultiplier = 1 + (selectedMarkup / 100);
		const priceBeforeDiscount = baseCost * markupMultiplier;

		// Apply client discount
		const discountAmount = priceBeforeDiscount * (clientDiscount / 100);
		const priceAfterDiscount = priceBeforeDiscount - discountAmount;

		// Get rounding parameters (defaults: HNL=50, USD=5)
		const roundingHnl = parameters.roundingLocal || 50;
		const roundingUsd = parameters.roundingUsd || 5;

		// Calculate USD price
		const priceUsd = priceAfterDiscount / exchangeRate;

		// Apply rounding
		const finalPriceHnl = roundToNearest(priceAfterDiscount, roundingHnl);
		const finalPriceUsd = roundToNearest(priceUsd, roundingUsd);

		return {
			// Fuel details
			fuel: Math.round(fuelCost),
			fuelUsd: Math.round(fuelCost / exchangeRate),
			fuelConsumption: Math.round(fuelConsumption * 100) / 100, // gallons
			fuelPrice: parameters.fuelPrice,
			fuelEfficiency: fuelEfficiencyKpg,
			tankCapacity: tankCapacityGallons,
			tankRange: Math.round(tankRange),
			safeRange: Math.round(safeRange),
			extraFuelNeeded: Math.round(extraFuelNeeded * 100) / 100,
			fuelAdvanceCost: Math.round(fuelAdvanceCost),
			fuelAdvanceNeeded: extraFuelNeeded > 0,

			// Viáticos details
			meals: Math.round(mealCost),
			mealsUsd: Math.round(mealCost / exchangeRate),
			mealCostPerDay,
			lodging: Math.round(lodgingCost),
			lodgingUsd: Math.round(lodgingCost / exchangeRate),
			lodgingNights,
			hotelCostPerNight,
			viaticosTotal: Math.round(viaticosTotalCost),
			viaticosUsd: Math.round(viaticosTotalCost / exchangeRate),

			// Driver incentive details
			incentive: Math.round(incentiveCost),
			incentiveUsd: Math.round(incentiveCost / exchangeRate),
			incentivePerDay,

			// Vehicle cost details
			vehicleDistance: Math.round(vehicleDistanceCost),
			vehicleDistanceUsd: Math.round(vehicleDistanceCost / exchangeRate),
			costPerKm,
			vehicleDaily: Math.round(vehicleDailyCost),
			vehicleDailyUsd: Math.round(vehicleDailyCost / exchangeRate),
			costPerDay,
			vehicleTotal: Math.round(vehicleTotalCost),
			vehicleTotalUsd: Math.round(vehicleTotalCost / exchangeRate),

			// Totals
			baseCost: Math.round(baseCost),
			baseCostUsd: Math.round(baseCost / exchangeRate),
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
			extraKm,
			days
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

	// Live name preview
	const namePreview = $derived(() => {
		if (!quotation) return '';
		const clientCode = selectedClient?.clientCode || '';
		const leaderDisplay = groupLeaderName.trim() || 'Grupo';
		const parts = [quotation.quotationNumber];
		if (clientCode) parts.push(clientCode);
		const groupSizePadded = String(groupSize).padStart(2, '0');
		parts.push(`${leaderDisplay} x ${groupSizePadded}`);
		return parts.join('-');
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
				clientId: selectedClientId ? (selectedClientId as Id<'clients'>) : undefined,
				vehicleId: selectedVehicleId as Id<'vehicles'>,
				// New quotation standardization fields
				assignedTo: assignedToId ? (assignedToId as Id<'users'>) : undefined,
				groupLeaderName: groupLeaderName.trim() || undefined,
				paymentConditions: paymentConditions || undefined,
				origin,
				destination,
				baseLocation: vehicleBaseLocation || origin,
				groupSize,
				extraMileage: extraKm,
				estimatedDays,
				isRoundTrip, // Round trip or one-way
				departureDate: departureDate ? new Date(departureDate).getTime() : undefined,
				totalDistance: routeResult.totalDistance + extraKm,
				totalTime: routeResult.totalTime,
				// Store route breakdown for proper cost attribution
				deadheadDistance: routeResult.deadheadDistance,
				mainTripDistance: routeResult.mainTripDistance,
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

            if (quotation) {
                // UPDATE existing
                await client.mutation(api.quotations.update, {
                    id: quotation._id,
                    ...quotationData
                });
                showToastMessage($t('quotations.updateSuccess'), 'success');
                // Navigate back to detail page
                setTimeout(() => {
                    goto(`/quotations/${quotation._id}`);
                }, 500);
            } else {
                // CREATE new
                const payload = {
                    ...quotationData,
                    tenantId: tenantStore.tenantId as Id<'tenants'>,
                };
                const quotationId = await client.mutation(api.quotations.create, payload);
                showToastMessage($t('quotations.createSuccess'), 'success');
                // Navigate to quotation detail page
                setTimeout(() => {
                    goto(`/quotations/${quotationId}`);
                }, 500);
            }
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
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                {quotation ? $t('quotations.editQuotation') : $t('quotations.new.title')}
            </h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
                {quotation ? namePreview() : $t('quotations.new.subtitle')}
            </p>
		</div>
	</div>

	{#if mapsError}
		<Alert color="red">
			{#snippet icon()}
				<ExclamationCircleOutline class="w-5 h-5" />
			{/snippet}
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
								oninput={() => routeResult = null}
							/>
						</div>

						<div>
							<Label for="destination" class="mb-2">{$t('quotations.new.destination')} *</Label>
							<Input
								id="destination"
								bind:value={destination}
								placeholder={$t('quotations.new.destinationPlaceholder')}
								class="h-11"
								oninput={() => routeResult = null}
							/>
						</div>
					</div>

					<!-- Trip Type Toggle -->
					<div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<Toggle bind:checked={isRoundTrip} onchange={() => routeResult = null} class="!mb-0">
							<span class="font-medium">{isRoundTrip ? $t('quotations.new.roundTrip') : $t('quotations.new.oneWay')}</span>
						</Toggle>
						<span class="text-sm text-gray-500 dark:text-gray-400">
							{isRoundTrip ? $t('quotations.new.roundTripDesc') : $t('quotations.new.oneWayDesc')}
						</span>
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
							{#snippet icon()}
								<MapPinOutline class="w-5 h-5" />
							{/snippet}
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

			<!-- Quotation Details - Group Leader, Sales Agent, Payment -->
			<Card class="max-w-none !p-6">
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalles de Cotización</h5>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Group Leader Name -->
					<div>
						<Label for="groupLeader" class="mb-2">Líder del Grupo / Contacto</Label>
						<Input
							id="groupLeader"
							bind:value={groupLeaderName}
							placeholder="Nombre del coordinador o líder"
						/>
						<p class="text-xs text-gray-500 mt-1">Nombre que aparecerá en el número de cotización</p>
					</div>

					<!-- Payment Conditions -->
					<div>
						<Label for="paymentConditions" class="mb-2">Condiciones de Pago</Label>
						<Select id="paymentConditions" bind:value={paymentConditions}>
							{#each paymentConditionOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</Select>
					</div>

					<!-- Sales Agent -->
					{#if salesAgents.length > 0}
						<div class="md:col-span-2">
							<Label for="salesAgent" class="mb-2">Agente de Ventas</Label>
							<Select id="salesAgent" bind:value={assignedToId}>
								<option value="">Sin asignar</option>
								{#each salesAgents as agent}
									<option value={agent.userId}>
										{agent.name} ({agent.initials})
										{#if agent.isDefault} - Predeterminado{/if}
									</option>
								{/each}
							</Select>
							<p class="text-xs text-gray-500 mt-1">Las iniciales del agente aparecerán en documentos PDF</p>
						</div>
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
												{formatCurrencyPrecise(vehicle.costPerDay)}/{$t('units.day')}
											</span>
											<span class="text-gray-300 dark:text-gray-600">•</span>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300">
												{formatCurrencyPrecise(vehicle.costPerDistance)}/{vehicle.distanceUnit}
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
									<Spinner size="4" class="mr-1" />
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
						{#snippet icon()}
							<ExclamationCircleOutline class="w-4 h-4" />
						{/snippet}
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
									<p class="text-xs text-amber-600 dark:text-amber-400">Incluye {formatDistance(extraKm)} extra</p>
								{/if}
							</div>
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-xs text-gray-500 dark:text-gray-400">{$t('quotations.new.estimatedTime')}</p>
								<p class="text-lg font-bold text-gray-900 dark:text-white">
									{formatDuration(routeResult.totalTime)}
								</p>
							</div>
						</div>

						<!-- Route breakdown with per-leg duration -->
						<div class="space-y-2 text-sm">
							{#if routeResult.deadheadDistance > 0}
								<div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
									<p class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{$t('quotations.new.repositioning')}</p>
									{#if routeResult.baseToOrigin > 0}
										{@const baseToOriginSegment = routeResult.segments[0]}
										<div class="flex justify-between text-blue-700 dark:text-blue-300">
											<span>Base → {$t('quotations.new.origin')}</span>
											<span class="flex items-center gap-2">
												<span class="text-blue-500 text-xs">{formatDuration(baseToOriginSegment.duration)}</span>
												<span>{formatDistance(routeResult.baseToOrigin)}</span>
											</span>
										</div>
									{/if}
									{#if isRoundTrip && routeResult.originToBase > 0}
										{@const returnSegment = routeResult.segments[routeResult.segments.length - 1]}
										<div class="flex justify-between text-blue-700 dark:text-blue-300">
											<span>{$t('quotations.new.origin')} → Base</span>
											<span class="flex items-center gap-2">
												<span class="text-blue-500 text-xs">{formatDuration(returnSegment.duration)}</span>
												<span>{formatDistance(routeResult.originToBase)}</span>
											</span>
										</div>
									{:else if !isRoundTrip && routeResult.destinationToBase > 0}
										{@const returnSegment = routeResult.segments[routeResult.segments.length - 1]}
										<div class="flex justify-between text-blue-700 dark:text-blue-300">
											<span>{$t('quotations.new.destination')} → Base</span>
											<span class="flex items-center gap-2">
												<span class="text-blue-500 text-xs">{formatDuration(returnSegment.duration)}</span>
												<span>{formatDistance(routeResult.destinationToBase)}</span>
											</span>
										</div>
									{/if}
									<div class="flex justify-between font-medium text-blue-800 dark:text-blue-200 pt-1 border-t border-blue-200 dark:border-blue-700 mt-1">
										<span>{$t('quotations.new.subtotal')}</span>
										<span>{formatDistance(routeResult.deadheadDistance)}</span>
									</div>
								</div>
							{/if}

							<div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800">
								<p class="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
									{isRoundTrip ? $t('quotations.new.roundTrip') : $t('quotations.new.oneWay')}
								</p>
								<!-- Origin to Destination segment -->
								{#if routeResult.segments}
									{@const mainSegmentIndex = routeResult.baseToOrigin > 0 ? 1 : 0}
									{@const mainSegment = routeResult.segments[mainSegmentIndex]}
									<div class="flex justify-between text-emerald-700 dark:text-emerald-300">
										<span>{origin.split(',')[0]} → {destination.split(',')[0]}</span>
										<span class="flex items-center gap-2">
											{#if mainSegment}
												<span class="text-emerald-500 text-xs">{formatDuration(mainSegment.duration)}</span>
											{/if}
											<span>{formatDistance(routeResult.originToDestination)}</span>
										</span>
									</div>
								{/if}
								{#if isRoundTrip && routeResult.segments}
									<!-- Destination to Origin return segment -->
									{@const returnSegmentIndex = routeResult.baseToOrigin > 0 ? 2 : 1}
									{@const returnSegment = routeResult.segments[returnSegmentIndex]}
									<div class="flex justify-between text-emerald-700 dark:text-emerald-300">
										<span>{destination.split(',')[0]} → {origin.split(',')[0]}</span>
										<span class="flex items-center gap-2">
											{#if returnSegment}
												<span class="text-emerald-500 text-xs">{formatDuration(returnSegment.duration)}</span>
											{/if}
											<span>{formatDistance(routeResult.destinationToOrigin)}</span>
										</span>
									</div>
								{/if}
								<div class="flex justify-between font-medium text-emerald-800 dark:text-emerald-200 pt-1 border-t border-emerald-200 dark:border-emerald-700 mt-1">
									<span>{$t('quotations.new.subtotal')}</span>
									<span>{formatDistance(routeResult.mainTripDistance)}</span>
								</div>
							</div>

							{#if extraKm > 0}
								<div class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
									<p class="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">{$t('quotations.new.extraKm')}</p>
									<div class="flex justify-between text-amber-700 dark:text-amber-300">
										<span>{$t('quotations.new.extraKmIncludes')}</span>
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
					{@const costs = estimatedCosts()!}
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

						<!-- Cost breakdown with detailed accordions -->
						<div class="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1 text-sm">
							<Accordion flush class="divide-y-0">
								<!-- FUEL COST -->
								{#if includeFuel}
									<AccordionItem class="!py-1">
										{#snippet header()}
											<div class="flex justify-between w-full pr-2">
												<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.new.fuelCost')}</span>
												<span class="text-gray-900 dark:text-white font-medium">{formatCurrency(costs.fuel)} <span class="text-gray-500 text-xs">/ {formatUsd(costs.fuelUsd)}</span></span>
											</div>
										{/snippet}
										<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
											<div class="flex justify-between">
												<span>{$t('quotations.costDetails.totalDistance')}:</span>
												<span>{costs.totalDistance.toLocaleString()} km</span>
											</div>
											<div class="flex justify-between">
												<span>{$t('quotations.costDetails.fuelEfficiency')}:</span>
												<span>{costs.fuelEfficiency.toFixed(1)} km/gal</span>
											</div>
											<div class="flex justify-between">
												<span>{$t('quotations.costDetails.fuelConsumption')}:</span>
												<span>{costs.fuelConsumption} gal</span>
											</div>
											<div class="flex justify-between">
												<span>{$t('quotations.costDetails.fuelPrice')}:</span>
												<span>{formatCurrency(costs.fuelPrice)}/gal</span>
											</div>
											<div class="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
												<div class="flex justify-between">
													<span>{$t('quotations.costDetails.tankCapacity')}:</span>
													<span>{costs.tankCapacity.toFixed(0)} gal</span>
												</div>
												<div class="flex justify-between">
													<span>{$t('quotations.costDetails.tankRange')}:</span>
													<span>{costs.tankRange.toLocaleString()} km</span>
												</div>
												<div class="flex justify-between">
													<span>{$t('quotations.costDetails.safeRange')} (85%):</span>
													<span>{costs.safeRange.toLocaleString()} km</span>
												</div>
												{#if costs.fuelAdvanceNeeded}
													<div class="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
														<span>{$t('quotations.costDetails.fuelAdvance')}:</span>
														<span>{formatCurrency(costs.fuelAdvanceCost)} ({costs.extraFuelNeeded} gal)</span>
													</div>
												{:else}
													<div class="text-green-600 dark:text-green-400 text-xs mt-1">
														{$t('quotations.costDetails.noFuelAdvance')}
													</div>
												{/if}
											</div>
										</div>
									</AccordionItem>
								{/if}

								<!-- VIÁTICOS (MEALS + LODGING) -->
								{#if includeMeals}
									<AccordionItem class="!py-1">
										{#snippet header()}
											<div class="flex justify-between w-full pr-2">
												<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.costDetails.viaticos')}</span>
												<span class="text-gray-900 dark:text-white font-medium">{formatCurrency(costs.viaticosTotal)} <span class="text-gray-500 text-xs">/ {formatUsd(costs.viaticosUsd)}</span></span>
											</div>
										{/snippet}
										<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
											<div class="font-medium text-gray-600 dark:text-gray-300">{$t('quotations.costDetails.meals')}:</div>
											<div class="flex justify-between pl-2">
												<span>{costs.days} {$t('units.days')} × {formatCurrency(costs.mealCostPerDay)}/{$t('units.day')}</span>
												<span>{formatCurrency(costs.meals)}</span>
											</div>
											{#if costs.lodgingNights > 0}
												<div class="font-medium text-gray-600 dark:text-gray-300 mt-1">{$t('quotations.costDetails.lodging')}:</div>
												<div class="flex justify-between pl-2">
													<span>{costs.lodgingNights} {$t('units.nights')} × {formatCurrency(costs.hotelCostPerNight)}/{$t('units.night')}</span>
													<span>{formatCurrency(costs.lodging)}</span>
												</div>
											{/if}
										</div>
									</AccordionItem>
								{/if}

								<!-- DRIVER INCENTIVE (FREELANCER) -->
								{#if includeDriverIncentive && costs.incentive > 0}
									<AccordionItem class="!py-1">
										{#snippet header()}
											<div class="flex justify-between w-full pr-2">
												<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.costDetails.driverIncentive')}</span>
												<span class="text-gray-900 dark:text-white font-medium">{formatCurrency(costs.incentive)} <span class="text-gray-500 text-xs">/ {formatUsd(costs.incentiveUsd)}</span></span>
											</div>
										{/snippet}
										<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
											<div class="flex justify-between">
												<span>{costs.days} {$t('units.days')} × {formatCurrency(costs.incentivePerDay)}/{$t('units.day')}</span>
												<span>{formatCurrency(costs.incentive)}</span>
											</div>
											<p class="text-xs text-gray-400 dark:text-gray-500 italic mt-1">
												{$t('quotations.costDetails.driverIncentiveHint')}
											</p>
										</div>
									</AccordionItem>
								{/if}

								<!-- VEHICLE COSTS -->
								<AccordionItem class="!py-1">
									{#snippet header()}
										<div class="flex justify-between w-full pr-2">
											<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.new.vehicleCost')}</span>
											<span class="text-gray-900 dark:text-white font-medium">{formatCurrency(costs.vehicleTotal)} <span class="text-gray-500 text-xs">/ {formatUsd(costs.vehicleTotalUsd)}</span></span>
										</div>
									{/snippet}
									<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
										<div class="font-medium text-gray-600 dark:text-gray-300">{$t('quotations.costDetails.perDistance')}:</div>
										<div class="flex justify-between pl-2">
											<span>{costs.totalDistance.toLocaleString()} km × {formatCurrencyPrecise(costs.costPerKm)}/km</span>
											<span>{formatCurrency(costs.vehicleDistance)}</span>
										</div>
										<div class="font-medium text-gray-600 dark:text-gray-300 mt-1">{$t('quotations.costDetails.perDay')}:</div>
										<div class="flex justify-between pl-2">
											<span>{costs.days} {$t('units.days')} × {formatCurrencyPrecise(costs.costPerDay)}/{$t('units.day')}</span>
											<span>{formatCurrency(costs.vehicleDaily)}</span>
										</div>
									</div>
								</AccordionItem>
							</Accordion>

							<!-- SUBTOTAL -->
							<div class="flex justify-between font-semibold pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
								<span class="text-gray-700 dark:text-gray-300">{$t('quotations.new.subtotal')}</span>
								<span class="text-gray-900 dark:text-white">{formatCurrency(costs.baseCost)} <span class="text-gray-500 text-xs font-normal">/ {formatUsd(costs.baseCostUsd)}</span></span>
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

						<!-- Total line (matching final price) -->
						<div class="flex justify-between font-bold text-lg pt-3 mt-2 border-t-2 border-gray-300 dark:border-gray-600">
							<span class="text-gray-900 dark:text-white">{$t('quotations.costDetails.total')}</span>
							<span class="text-primary-600 dark:text-primary-400">{formatCurrency(costs.finalPriceHnl)} <span class="text-gray-500 text-sm font-normal">/ {formatUsd(costs.finalPriceUsd)}</span></span>
						</div>

						<!-- Final Price Card -->
						<div class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800 mt-4">
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
						{quotation ? $t('common.save') : $t('quotations.new.generateQuotation')}
					</Button>
					{#if !quotation}
						<Button
							class="w-full"
							color="alternative"
							onclick={() => saveQuotation(true)}
							disabled={!canSaveQuotation}
						>
							{$t('quotations.new.saveDraft')}
						</Button>
					{/if}
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

<!-- Map Modal -->
<Modal bind:open={showMapModal} size="xl" title={$t('quotations.new.routeMap')} onclose={closeMapModal}>
	<div class="space-y-4">
		<div class="relative">
			<div
				bind:this={mapContainer}
				class="w-full h-[500px] rounded-lg border border-gray-200 dark:border-gray-700"
			></div>
			<!-- Trip Info Box Overlay -->
			{#if routeResult}
				<div class="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700">
					<div class="space-y-2 text-sm">
						<div>
							<span class="text-gray-500 dark:text-gray-400">Desde (A): </span>
							<span class="font-medium text-gray-900 dark:text-white">{origin}</span>
						</div>
						<div>
							<span class="text-gray-500 dark:text-gray-400">Hacia (B): </span>
							<span class="font-medium text-gray-900 dark:text-white">{destination}</span>
						</div>
						<div>
							<span class="text-gray-500 dark:text-gray-400">Distancia: </span>
							<span class="font-semibold text-gray-900 dark:text-white">{routeResult.originToDestination} Kms</span>
						</div>
						<div>
							<span class="text-gray-500 dark:text-gray-400">Duración: </span>
							<span class="font-semibold text-gray-900 dark:text-white">{formatDuration(routeResult.segments[routeResult.baseToOrigin > 0 ? 1 : 0]?.duration || 0)}</span>
						</div>
						{#if isRoundTrip}
							<div class="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
								<span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{$t('quotations.new.roundTrip')}</span>
							</div>
						{/if}
						{#if extraKm > 0}
							<div class="text-xs text-amber-600 dark:text-amber-400">
								Incluye {formatDistance(extraKm)} extra
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
		{#if routeResult}
			<div class="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
				<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.totalDistance')}: <strong class="text-gray-900 dark:text-white">{formatDistance(routeResult.totalDistance + extraKm)}</strong></span>
				<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.estimatedTime')}: <strong class="text-gray-900 dark:text-white">{formatDuration(routeResult.totalTime)}</strong></span>
			</div>
		{/if}
	</div>
	{#snippet footer()}
		<Button color="alternative" onclick={closeMapModal}>{$t('common.close')}</Button>
	{/snippet}
</Modal>