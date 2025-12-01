<script lang="ts">
	import {
		Card,
		Button,
		Spinner,
		Alert,
		Badge,
		Toast,
		Select,
		Modal,
		Label,
		Input,
		Textarea
	} from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		TrashBinOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		MapPinOutline,
		TruckOutline,
		UserOutline,
		CalendarMonthOutline,
		ClockOutline,
		LinkOutline,
		FileLinesOutline,
		CashOutline,
		PhoneOutline,
		EnvelopeOutline,
		PenOutline
	} from 'flowbite-svelte-icons';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';
	import type { Id } from '$convex/_generated/dataModel';

	const client = useConvexClient();

	// Get itinerary ID from URL
	const itineraryId = $derived($page.params.id as Id<'itineraries'>);

	// Query itinerary
	const itineraryQuery = useQuery(
		api.itineraries.get,
		() => itineraryId ? { id: itineraryId } : 'skip'
	);

	// Query related data
	const vehiclesQuery = useQuery(
		api.vehicles.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const driversQuery = useQuery(
		api.drivers.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query existing invoice for this itinerary
	const existingInvoiceQuery = useQuery(
		api.invoices.getByItinerary,
		() => itineraryId ? { itineraryId } : 'skip'
	);

	// Query existing expense advance for this itinerary
	const existingAdvanceQuery = useQuery(
		api.expenseAdvances.getByItinerary,
		() => itineraryId ? { itineraryId } : 'skip'
	);

	// Query suggested advance amounts
	const suggestedAdvanceQuery = useQuery(
		api.expenseAdvances.calculateSuggestedAdvance,
		() => itineraryId ? { itineraryId } : 'skip'
	);

	const itinerary = $derived(itineraryQuery.data);
	const existingInvoice = $derived(existingInvoiceQuery.data);
	const existingAdvance = $derived(existingAdvanceQuery.data);
	const suggestedAdvance = $derived(suggestedAdvanceQuery.data);
	const vehicles = $derived(vehiclesQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const drivers = $derived(driversQuery.data || []);
	const isLoading = $derived(itineraryQuery.isLoading);

	// Get related entities
	const vehicle = $derived(
		itinerary?.vehicleId ? vehicles.find(v => v._id === itinerary.vehicleId) : null
	);
	const clientData = $derived(
		itinerary?.clientId ? clients.find(c => c._id === itinerary.clientId) : null
	);
	const driver = $derived(
		itinerary?.driverId ? drivers.find(d => d._id === itinerary.driverId) : null
	);

	// Assignment modal state
	let showAssignDriverModal = $state(false);
	let showAssignVehicleModal = $state(false);
	let selectedDriverId = $state('');
	let selectedVehicleId = $state('');

	// Address edit modal state
	let showAddressModal = $state(false);
	let editPickupAddress = $state('');
	let editDropoffAddress = $state('');
	let editPickupNotes = $state('');
	let editDropoffNotes = $state('');
	let isSavingAddresses = $state(false);

	// Trip leader edit modal state
	let showTripLeaderModal = $state(false);
	let editTripLeaderName = $state('');
	let editTripLeaderPhone = $state('');
	let editTripLeaderEmail = $state('');
	let isSavingTripLeader = $state(false);

	// Invoice generation modal state
	let showInvoiceModal = $state(false);
	let invoiceTaxPercentage = $state(15);
	let invoicePaymentTerms = $state(30);

	// Expense advance modal state
	let showAdvanceModal = $state(false);
	let advanceFuel = $state(0);
	let advanceMeals = $state(0);
	let advanceLodging = $state(0);
	let advanceTolls = $state(0);
	let advanceOther = $state(0);
	let advancePurpose = $state('');

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Initialize selected values when itinerary loads
	$effect(() => {
		if (itinerary) {
			selectedDriverId = itinerary.driverId || '';
			selectedVehicleId = itinerary.vehicleId || '';
		}
	});

	// Initialize advance values when suggested advance loads
	$effect(() => {
		if (suggestedAdvance) {
			advanceFuel = suggestedAdvance.estimatedFuel;
			advanceMeals = suggestedAdvance.estimatedMeals;
			advanceLodging = suggestedAdvance.estimatedLodging;
			advanceTolls = suggestedAdvance.estimatedTolls;
			advanceOther = suggestedAdvance.estimatedOther;
		}
	});

	// Initialize purpose when itinerary loads
	$effect(() => {
		if (itinerary && !advancePurpose) {
			advancePurpose = `Gastos de viaje: ${itinerary.origin} → ${itinerary.destination}`;
		}
	});

	function getClientName(client: any): string {
		if (!client) return 'Walk-in';
		if (client.type === 'company') {
			return client.companyName || 'Unnamed Company';
		}
		return [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Unnamed';
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
			month: 'long',
			day: 'numeric'
		});
	}

	function formatDateTime(timestamp: number): string {
		return new Date(timestamp).toLocaleString('es-HN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDistance(km: number): string {
		return `${km.toFixed(1)} km`;
	}

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		if (hours === 0) return `${mins} min`;
		return `${hours}h ${mins}m`;
	}

	function formatPhoneForLink(phone: string): string {
		return phone.replace(/[^+\d]/g, '');
	}

	function formatPhoneForWhatsApp(phone: string): string {
		let cleaned = phone.replace(/[^+\d]/g, '');
		if (cleaned.startsWith('+')) {
			cleaned = cleaned.substring(1);
		}
		return cleaned;
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	async function updateStatus(status: string) {
		if (!itinerary) return;

		try {
			await client.mutation(api.itineraries.updateStatus, {
				id: itinerary._id,
				status
			});
			showToastMessage($t('itineraries.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to update status:', error);
			showToastMessage($t('itineraries.updateFailed'), 'error');
		}
	}

	async function assignDriver() {
		if (!itinerary || !selectedDriverId) return;

		try {
			await client.mutation(api.itineraries.assignDriver, {
				id: itinerary._id,
				driverId: selectedDriverId as Id<'drivers'>
			});
			showAssignDriverModal = false;
			showToastMessage($t('itineraries.driverAssigned'), 'success');
		} catch (error) {
			console.error('Failed to assign driver:', error);
			showToastMessage($t('itineraries.updateFailed'), 'error');
		}
	}

	async function assignVehicle() {
		if (!itinerary || !selectedVehicleId) return;

		try {
			await client.mutation(api.itineraries.assignVehicle, {
				id: itinerary._id,
				vehicleId: selectedVehicleId as Id<'vehicles'>
			});
			showAssignVehicleModal = false;
			showToastMessage($t('itineraries.vehicleAssigned'), 'success');
		} catch (error) {
			console.error('Failed to assign vehicle:', error);
			showToastMessage($t('itineraries.updateFailed'), 'error');
		}
	}

	function openAddressModal() {
		if (!itinerary) return;
		editPickupAddress = itinerary.pickupExactAddress || itinerary.pickupLocation || '';
		editDropoffAddress = itinerary.dropoffExactAddress || itinerary.dropoffLocation || '';
		editPickupNotes = itinerary.pickupNotes || '';
		editDropoffNotes = itinerary.dropoffNotes || '';
		showAddressModal = true;
	}

	async function saveAddresses() {
		if (!itinerary) return;

		isSavingAddresses = true;
		try {
			await client.mutation(api.itineraries.updateTripDetailsStaff, {
				itineraryId: itinerary._id,
				pickupExactAddress: editPickupAddress || undefined,
				dropoffExactAddress: editDropoffAddress || undefined,
				pickupNotes: editPickupNotes || undefined,
				dropoffNotes: editDropoffNotes || undefined
			});
			showAddressModal = false;
			showToastMessage($t('itineraries.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to save addresses:', error);
			showToastMessage($t('itineraries.updateFailed'), 'error');
		} finally {
			isSavingAddresses = false;
		}
	}

	function openTripLeaderModal() {
		if (!itinerary) return;
		editTripLeaderName = itinerary.tripLeaderName || '';
		editTripLeaderPhone = itinerary.tripLeaderPhone || '';
		editTripLeaderEmail = itinerary.tripLeaderEmail || '';
		showTripLeaderModal = true;
	}

	async function saveTripLeader() {
		if (!itinerary) return;

		isSavingTripLeader = true;
		try {
			await client.mutation(api.itineraries.updateTripDetailsStaff, {
				itineraryId: itinerary._id,
				tripLeaderName: editTripLeaderName || undefined,
				tripLeaderPhone: editTripLeaderPhone || undefined,
				tripLeaderEmail: editTripLeaderEmail || undefined
			});
			showTripLeaderModal = false;
			showToastMessage($t('itineraries.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to save trip leader:', error);
			showToastMessage($t('itineraries.updateFailed'), 'error');
		} finally {
			isSavingTripLeader = false;
		}
	}

	async function handleDelete() {
		if (!itinerary) return;
		if (!confirm($t('itineraries.deleteConfirm'))) return;

		try {
			await client.mutation(api.itineraries.remove, { id: itinerary._id });
			showToastMessage($t('itineraries.deleteSuccess'), 'success');
			setTimeout(() => goto('/itineraries'), 500);
		} catch (error) {
			console.error('Failed to delete itinerary:', error);
			showToastMessage($t('itineraries.deleteFailed'), 'error');
		}
	}

	async function generateInvoice() {
		if (!itinerary) return;

		try {
			const invoiceId = await client.mutation(api.invoices.createFromItinerary, {
				itineraryId: itinerary._id,
				taxPercentage: invoiceTaxPercentage,
				paymentTermsDays: invoicePaymentTerms
			});
			showInvoiceModal = false;
			showToastMessage($t('invoices.created'), 'success');
			setTimeout(() => goto(`/invoices/${invoiceId}`), 500);
		} catch (error) {
			console.error('Failed to create invoice:', error);
			showToastMessage($t('invoices.createFailed'), 'error');
		}
	}

	// Get active drivers and vehicles for selection
	const activeDrivers = $derived(drivers.filter(d => d.status === 'active'));

	// Filter vehicles by passenger capacity (must fit group size)
	const suitableVehicles = $derived(
		vehicles.filter(v =>
			v.status === 'active' &&
			v.passengerCapacity >= (itinerary?.groupSize || 0)
		).sort((a, b) => a.passengerCapacity - b.passengerCapacity)
	);

	// Calculated total advance amount
	const totalAdvanceAmount = $derived(advanceFuel + advanceMeals + advanceLodging + advanceTolls + advanceOther);

	async function createAdvance() {
		if (!itinerary) return;

		try {
			const advanceId = await client.mutation(api.expenseAdvances.createFromItinerary, {
				itineraryId: itinerary._id,
				amountHnl: totalAdvanceAmount,
				estimatedFuel: advanceFuel,
				estimatedMeals: advanceMeals,
				estimatedLodging: advanceLodging,
				estimatedTolls: advanceTolls,
				estimatedOther: advanceOther,
				purpose: advancePurpose
			});
			showAdvanceModal = false;
			showToastMessage($t('expenses.advanceCreated'), 'success');
			setTimeout(() => goto(`/expenses/${advanceId}`), 500);
		} catch (error) {
			console.error('Failed to create expense advance:', error);
			showToastMessage($t('expenses.createFailed'), 'error');
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div class="flex items-center gap-4">
			<Button href="/itineraries" color="alternative" size="sm">
				<ArrowLeftOutline class="w-4 h-4 mr-2" />
				{$t('itineraries.title')}
			</Button>
			{#if itinerary}
				<div>
					<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{itinerary.itineraryNumber}</h1>
					<p class="text-gray-600 dark:text-gray-400">{formatDate(itinerary.startDate)}</p>
				</div>
			{/if}
		</div>
		{#if itinerary}
			<div class="flex items-center gap-2">
				<StatusBadge status={itinerary.status} variant="itinerary" showIcon />
				{#if itinerary.status === 'scheduled'}
					<Button size="sm" color="green" onclick={() => updateStatus('in_progress')}>
						<CheckCircleOutline class="w-4 h-4 mr-2" />
						{$t('itineraries.startTrip')}
					</Button>
					<Button size="sm" color="red" outline onclick={handleDelete}>
						<TrashBinOutline class="w-4 h-4 mr-2" />
						{$t('common.delete')}
					</Button>
				{/if}
				{#if itinerary.status === 'in_progress'}
					<Button size="sm" color="green" onclick={() => updateStatus('completed')}>
						<CheckCircleOutline class="w-4 h-4 mr-2" />
						{$t('itineraries.completeTrip')}
					</Button>
					<Button size="sm" color="red" outline onclick={() => updateStatus('cancelled')}>
						<CloseCircleOutline class="w-4 h-4 mr-2" />
						{$t('common.cancel')}
					</Button>
				{/if}
				{#if itinerary.status === 'completed'}
					{#if existingInvoice}
						<Button size="sm" color="light" href="/invoices/{existingInvoice._id}">
							<FileLinesOutline class="w-4 h-4 mr-2" />
							{$t('invoices.viewInvoice')}
						</Button>
					{:else}
						<Button size="sm" color="blue" onclick={() => (showInvoiceModal = true)}>
							<CashOutline class="w-4 h-4 mr-2" />
							{$t('invoices.generateInvoice')}
						</Button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else if !itinerary}
		<Alert color="red">
			{$t('errors.notFound')}
		</Alert>
	{:else}
		<!-- Main Content - Two Column Layout -->
		<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
			<!-- Left Column: Main Details -->
			<div class="xl:col-span-2 space-y-6">
				<!-- Price + Client + Vehicle Row -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Price Card -->
					<Card class="max-w-none !p-5 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
						<p class="text-xs text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-1">{$t('itineraries.details.agreedPrice')}</p>
						<p class="text-2xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(itinerary.agreedPriceHnl)}</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">${itinerary.agreedPriceUsd.toFixed(2)} USD</p>
					</Card>

					<!-- Client Card -->
					<Card class="max-w-none !p-5">
						<div class="flex items-center justify-between mb-2">
							<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{$t('clients.client')}</p>
						</div>
						{#if clientData}
							<p class="font-medium text-gray-900 dark:text-white truncate">{getClientName(clientData)}</p>
							<div class="flex items-center gap-2 mt-2">
								{#if clientData.phone}
									<a
										href="tel:{formatPhoneForLink(clientData.phone)}"
										class="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
										title="Llamar"
									>
										<PhoneOutline class="w-4 h-4" />
									</a>
									<a
										href="https://wa.me/{formatPhoneForWhatsApp(clientData.phone)}"
										target="_blank"
										rel="noopener noreferrer"
										class="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
										title="WhatsApp"
									>
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
									</a>
								{/if}
								{#if clientData.email}
									<a
										href="mailto:{clientData.email}"
										class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
										title="Email"
									>
										<EnvelopeOutline class="w-4 h-4" />
									</a>
								{/if}
							</div>
						{:else}
							<p class="text-gray-500 dark:text-gray-400">Walk-in</p>
						{/if}
					</Card>

					<!-- Vehicle Card -->
					<Card class="max-w-none !p-5">
						<div class="flex items-center justify-between mb-2">
							<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{$t('vehicles.vehicle')}</p>
							{#if itinerary.status === 'scheduled'}
								<button
									onclick={() => (showAssignVehicleModal = true)}
									class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
								>
									{vehicle ? $t('common.change') : $t('itineraries.assignVehicle')}
								</button>
							{/if}
						</div>
						{#if vehicle}
							<p class="font-medium text-gray-900 dark:text-white truncate">{vehicle.name}</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{vehicle.passengerCapacity} {$t('vehicles.fields.passengers')}
								{#if vehicle.make || vehicle.model}
									· {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
								{/if}
							</p>
						{:else}
							<p class="text-gray-500 dark:text-gray-400 italic">{$t('itineraries.noVehicleAssigned')}</p>
						{/if}
					</Card>
				</div>

				<!-- Route Information -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center gap-2 mb-4">
						<MapPinOutline class="w-5 h-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('quotations.new.routeInfo')}</h3>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{$t('quotations.new.origin')}</p>
							<p class="font-medium text-gray-900 dark:text-white">{itinerary.origin}</p>
						</div>
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{$t('quotations.new.destination')}</p>
							<p class="font-medium text-gray-900 dark:text-white">{itinerary.destination}</p>
						</div>
					</div>

					<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
						<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
							<p class="text-xs text-blue-600 dark:text-blue-400">{$t('quotations.new.totalDistance')}</p>
							<p class="text-lg font-bold text-blue-700 dark:text-blue-300">{formatDistance(itinerary.totalDistance)}</p>
						</div>
						<div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
							<p class="text-xs text-purple-600 dark:text-purple-400">{$t('quotations.new.estimatedTime')}</p>
							<p class="text-lg font-bold text-purple-700 dark:text-purple-300">{formatDuration(itinerary.totalTime)}</p>
						</div>
						<div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
							<p class="text-xs text-green-600 dark:text-green-400">{$t('quotations.new.days')}</p>
							<p class="text-lg font-bold text-green-700 dark:text-green-300">{itinerary.estimatedDays}</p>
						</div>
						<div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
							<p class="text-xs text-orange-600 dark:text-orange-400">{$t('quotations.new.passengers')}</p>
							<p class="text-lg font-bold text-orange-700 dark:text-orange-300">{itinerary.groupSize}</p>
						</div>
					</div>
				</Card>

				<!-- Exact Addresses -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<MapPinOutline class="w-5 h-5 text-gray-500" />
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('itineraries.details.exactAddresses')}</h3>
						</div>
						<Button size="xs" color="light" onclick={openAddressModal}>
							<PenOutline class="w-3 h-3 mr-1" />
							{$t('common.edit')}
						</Button>
					</div>
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
						{$t('itineraries.details.exactAddressesHint')}
					</p>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<!-- Pickup -->
						<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
							<p class="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">{$t('itineraries.details.pickup')}</p>
							<p class="font-medium text-gray-900 dark:text-white">
								{itinerary.pickupExactAddress || itinerary.pickupLocation || itinerary.origin}
							</p>
							{#if itinerary.pickupTime}
								<p class="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
									<ClockOutline class="w-4 h-4" />
									{itinerary.pickupTime}
								</p>
							{/if}
							{#if itinerary.pickupNotes}
								<p class="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">{itinerary.pickupNotes}</p>
							{/if}
						</div>

						<!-- Dropoff -->
						<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
							<p class="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">{$t('itineraries.details.dropoff')}</p>
							<p class="font-medium text-gray-900 dark:text-white">
								{itinerary.dropoffExactAddress || itinerary.dropoffLocation || itinerary.destination}
							</p>
							{#if itinerary.dropoffTime}
								<p class="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
									<ClockOutline class="w-4 h-4" />
									{itinerary.dropoffTime}
								</p>
							{/if}
							{#if itinerary.dropoffNotes}
								<p class="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">{itinerary.dropoffNotes}</p>
							{/if}
						</div>
					</div>
				</Card>

				<!-- Driver + Trip Leader Row -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Driver -->
					<Card class="max-w-none !p-5">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<UserOutline class="w-5 h-5 text-gray-500" />
								<h3 class="font-semibold text-gray-900 dark:text-white">{$t('itineraries.columns.driver')}</h3>
							</div>
							{#if itinerary.status === 'scheduled'}
								<button
									onclick={() => (showAssignDriverModal = true)}
									class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
								>
									{driver ? $t('common.change') : $t('itineraries.assignDriver')}
								</button>
							{/if}
						</div>
						{#if driver}
							<p class="font-medium text-gray-900 dark:text-white">{driver.firstName} {driver.lastName}</p>
							<div class="flex items-center gap-2 mt-2">
								{#if driver.phone}
									<a
										href="tel:{formatPhoneForLink(driver.phone)}"
										class="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
									>
										<PhoneOutline class="w-4 h-4" />
										{driver.phone}
									</a>
								{/if}
							</div>
							<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
								{$t('drivers.fields.licenseNumber')}: {driver.licenseNumber}
							</p>
						{:else}
							<p class="text-gray-500 dark:text-gray-400 italic">{$t('itineraries.noDriverAssigned')}</p>
						{/if}
					</Card>

					<!-- Trip Leader -->
					<Card class="max-w-none !p-5">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<UserOutline class="w-5 h-5 text-gray-500" />
								<h3 class="font-semibold text-gray-900 dark:text-white">{$t('itineraries.details.tripLeader')}</h3>
							</div>
							<button
								onclick={openTripLeaderModal}
								class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
							>
								{itinerary.tripLeaderName ? $t('common.change') : $t('common.add')}
							</button>
						</div>
						{#if itinerary.tripLeaderName}
							<p class="font-medium text-gray-900 dark:text-white">{itinerary.tripLeaderName}</p>
							<div class="flex items-center flex-wrap gap-2 mt-2">
								{#if itinerary.tripLeaderPhone}
									<a
										href="tel:{formatPhoneForLink(itinerary.tripLeaderPhone)}"
										class="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
										title="Llamar"
									>
										<PhoneOutline class="w-4 h-4" />
									</a>
									<a
										href="https://wa.me/{formatPhoneForWhatsApp(itinerary.tripLeaderPhone)}"
										target="_blank"
										rel="noopener noreferrer"
										class="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
										title="WhatsApp"
									>
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
									</a>
									<span class="text-sm text-gray-600 dark:text-gray-400">{itinerary.tripLeaderPhone}</span>
								{/if}
								{#if itinerary.tripLeaderEmail}
									<a
										href="mailto:{itinerary.tripLeaderEmail}"
										class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
										title="Email"
									>
										<EnvelopeOutline class="w-4 h-4" />
									</a>
								{/if}
							</div>
						{:else}
							<p class="text-gray-500 dark:text-gray-400 italic">{$t('itineraries.noTripLeader')}</p>
						{/if}
					</Card>
				</div>

				<!-- Notes -->
				{#if itinerary.notes}
					<Card class="max-w-none !p-6">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{$t('clients.fields.notes')}</h3>
						<p class="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{itinerary.notes}</p>
					</Card>
				{/if}
			</div>

			<!-- Right Column: Sidebar -->
			<div class="space-y-4">
				<!-- Dates Card -->
				<Card class="max-w-none !p-5">
					<div class="flex items-center gap-2 mb-3">
						<CalendarMonthOutline class="w-5 h-5 text-gray-500" />
						<h3 class="font-semibold text-gray-900 dark:text-white">{$t('itineraries.columns.date')}</h3>
					</div>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">{$t('itineraries.details.startDate')}</span>
							<span class="text-gray-900 dark:text-white font-medium">{formatDate(itinerary.startDate)}</span>
						</div>
						{#if itinerary.endDate}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('itineraries.details.endDate')}</span>
								<span class="text-gray-900 dark:text-white">{formatDate(itinerary.endDate)}</span>
							</div>
						{/if}
						<div class="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
							<span class="text-gray-600 dark:text-gray-400">{$t('common.created')}</span>
							<span class="text-gray-900 dark:text-white">{formatDateTime(itinerary.createdAt)}</span>
						</div>
						{#if itinerary.startedAt}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('itineraries.status.in_progress')}</span>
								<span class="text-gray-900 dark:text-white">{formatDateTime(itinerary.startedAt)}</span>
							</div>
						{/if}
						{#if itinerary.completedAt}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('itineraries.status.completed')}</span>
								<span class="text-gray-900 dark:text-white">{formatDateTime(itinerary.completedAt)}</span>
							</div>
						{/if}
					</div>
				</Card>

				<!-- Source Quotation -->
				{#if itinerary.quotationId}
					<Card class="max-w-none !p-5">
						<div class="flex items-center gap-2 mb-3">
							<LinkOutline class="w-5 h-5 text-gray-500" />
							<h3 class="font-semibold text-gray-900 dark:text-white">{$t('itineraries.sourceQuotation')}</h3>
						</div>
						<Button href="/quotations/{itinerary.quotationId}" size="sm" color="light" class="w-full">
							{$t('quotations.viewQuotation')}
						</Button>
					</Card>
				{/if}

				<!-- Invoice -->
				{#if itinerary.status === 'completed' || existingInvoice}
					<Card class="max-w-none !p-5">
						<div class="flex items-center gap-2 mb-3">
							<FileLinesOutline class="w-5 h-5 text-gray-500" />
							<h3 class="font-semibold text-gray-900 dark:text-white">{$t('invoices.invoice')}</h3>
						</div>
						{#if existingInvoice}
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3">
								<p class="font-medium text-gray-900 dark:text-white">{existingInvoice.invoiceNumber}</p>
								<p class="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(existingInvoice.totalHnl)}</p>
							</div>
							<Button href="/invoices/{existingInvoice._id}" size="sm" color="light" class="w-full">
								{$t('invoices.viewInvoice')}
							</Button>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{$t('invoices.noInvoice')}</p>
							<Button size="sm" color="blue" class="w-full" onclick={() => (showInvoiceModal = true)}>
								<CashOutline class="w-4 h-4 mr-2" />
								{$t('invoices.generateInvoice')}
							</Button>
						{/if}
					</Card>
				{/if}

				<!-- Expense Advance -->
				{#if itinerary.status !== 'cancelled'}
					<Card class="max-w-none !p-5">
						<div class="flex items-center gap-2 mb-3">
							<CashOutline class="w-5 h-5 text-gray-500" />
							<h3 class="font-semibold text-gray-900 dark:text-white">{$t('expenses.advance')}</h3>
						</div>
						{#if existingAdvance}
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3">
								<div class="flex items-center justify-between mb-1">
									<p class="font-medium text-gray-900 dark:text-white">{existingAdvance.advanceNumber}</p>
									<StatusBadge status={existingAdvance.status} variant="advance" size="sm" />
								</div>
								<p class="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(existingAdvance.amountHnl)}</p>
							</div>
							<Button href="/expenses/{existingAdvance._id}" size="sm" color="light" class="w-full">
								{$t('expenses.viewAdvance')}
							</Button>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{$t('expenses.noAdvance')}</p>
							<Button size="sm" color="green" class="w-full" onclick={() => (showAdvanceModal = true)}>
								<CashOutline class="w-4 h-4 mr-2" />
								{$t('expenses.createAdvance')}
							</Button>
						{/if}
					</Card>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Assign Driver Modal -->
<Modal bind:open={showAssignDriverModal} title={$t('itineraries.assignDriver')} size="sm">
	<div class="space-y-4">
		<Select bind:value={selectedDriverId}>
			<option value="">{$t('itineraries.selectDriver')}</option>
			{#each activeDrivers as d}
				<option value={d._id}>{d.firstName} {d.lastName}</option>
			{/each}
		</Select>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showAssignDriverModal = false)}>
				{$t('common.cancel')}
			</Button>
			<Button color="primary" onclick={assignDriver} disabled={!selectedDriverId}>
				{$t('itineraries.assignDriver')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Assign Vehicle Modal -->
<Modal bind:open={showAssignVehicleModal} title={$t('itineraries.assignVehicle')} size="sm">
	<div class="space-y-4">
		{#if itinerary}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{$t('itineraries.vehicleCapacityHint', { values: { count: itinerary.groupSize } })}
			</p>
		{/if}
		<Select bind:value={selectedVehicleId}>
			<option value="">{$t('itineraries.selectVehicle')}</option>
			{#each suitableVehicles as v}
				<option value={v._id}>
					{v.name} ({v.passengerCapacity} {$t('vehicles.fields.passengers')})
				</option>
			{/each}
		</Select>
		{#if suitableVehicles.length === 0}
			<Alert color="yellow">
				{$t('itineraries.noSuitableVehicles')}
			</Alert>
		{/if}
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showAssignVehicleModal = false)}>
				{$t('common.cancel')}
			</Button>
			<Button color="primary" onclick={assignVehicle} disabled={!selectedVehicleId}>
				{$t('itineraries.assignVehicle')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Edit Addresses Modal -->
<Modal bind:open={showAddressModal} title={$t('itineraries.details.exactAddresses')} size="lg">
	<div class="space-y-4">
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{$t('itineraries.details.exactAddressesHint')}
		</p>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="editPickupAddress" class="mb-2">{$t('itineraries.details.pickup')}</Label>
				<Textarea
					id="editPickupAddress"
					bind:value={editPickupAddress}
					placeholder={itinerary?.origin || ''}
					rows={3}
				/>
			</div>
			<div>
				<Label for="editDropoffAddress" class="mb-2">{$t('itineraries.details.dropoff')}</Label>
				<Textarea
					id="editDropoffAddress"
					bind:value={editDropoffAddress}
					placeholder={itinerary?.destination || ''}
					rows={3}
				/>
			</div>
			<div>
				<Label for="editPickupNotes" class="mb-2">{$t('itineraries.details.pickupNotes')}</Label>
				<Textarea
					id="editPickupNotes"
					bind:value={editPickupNotes}
					placeholder={$t('itineraries.details.notesPlaceholder')}
					rows={2}
				/>
			</div>
			<div>
				<Label for="editDropoffNotes" class="mb-2">{$t('itineraries.details.dropoffNotes')}</Label>
				<Textarea
					id="editDropoffNotes"
					bind:value={editDropoffNotes}
					placeholder={$t('itineraries.details.notesPlaceholder')}
					rows={2}
				/>
			</div>
		</div>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showAddressModal = false)} disabled={isSavingAddresses}>
				{$t('common.cancel')}
			</Button>
			<Button color="primary" onclick={saveAddresses} disabled={isSavingAddresses}>
				{#if isSavingAddresses}
					<Spinner size="4" class="mr-2" />
				{/if}
				{$t('common.save')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Trip Leader Modal -->
<Modal bind:open={showTripLeaderModal} title={$t('itineraries.details.tripLeader')} size="sm">
	<div class="space-y-4">
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{$t('itineraries.tripLeaderHint')}
		</p>
		<div>
			<Label for="tripLeaderName">{$t('clients.fields.name')}</Label>
			<Input
				id="tripLeaderName"
				bind:value={editTripLeaderName}
				placeholder="Juan Pérez"
			/>
		</div>
		<div>
			<Label for="tripLeaderPhone">{$t('clients.fields.phone')}</Label>
			<Input
				id="tripLeaderPhone"
				type="tel"
				bind:value={editTripLeaderPhone}
				placeholder="+504 9999-0000"
			/>
		</div>
		<div>
			<Label for="tripLeaderEmail">{$t('clients.fields.email')}</Label>
			<Input
				id="tripLeaderEmail"
				type="email"
				bind:value={editTripLeaderEmail}
				placeholder="email@example.com"
			/>
		</div>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showTripLeaderModal = false)} disabled={isSavingTripLeader}>
				{$t('common.cancel')}
			</Button>
			<Button color="primary" onclick={saveTripLeader} disabled={isSavingTripLeader}>
				{#if isSavingTripLeader}
					<Spinner size="4" class="mr-2" />
				{/if}
				{$t('common.save')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Generate Invoice Modal -->
<Modal bind:open={showInvoiceModal} title={$t('invoices.generateInvoice')} size="sm">
	<div class="space-y-4">
		<div>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				{$t('invoices.generateFromItinerary')}
			</p>
			<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
				<p class="text-sm text-gray-500 dark:text-gray-400">{$t('invoices.subtotal')}</p>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(itinerary?.agreedPriceHnl || 0)}</p>
			</div>
		</div>
		<div>
			<Label for="taxPercentage">{$t('invoices.taxPercentage')} (ISV)</Label>
			<Input
				id="taxPercentage"
				type="number"
				step="0.1"
				min="0"
				max="100"
				bind:value={invoiceTaxPercentage}
			/>
		</div>
		<div>
			<Label for="paymentTerms">{$t('invoices.paymentTerms')}</Label>
			<Input
				id="paymentTerms"
				type="number"
				min="0"
				bind:value={invoicePaymentTerms}
			/>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{$t('common.days')}</p>
		</div>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showInvoiceModal = false)}>
				{$t('common.cancel')}
			</Button>
			<Button color="blue" onclick={generateInvoice}>
				<FileLinesOutline class="w-4 h-4 mr-2" />
				{$t('invoices.generateInvoice')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Create Expense Advance Modal -->
<Modal bind:open={showAdvanceModal} title={$t('expenses.createAdvance')} size="md">
	<div class="space-y-4">
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{$t('expenses.createAdvanceHint')}
		</p>

		<div>
			<Label for="advancePurpose">{$t('expenses.fields.purpose')}</Label>
			<Input
				id="advancePurpose"
				type="text"
				bind:value={advancePurpose}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<Label for="advanceFuel">{$t('expenses.fields.fuel')}</Label>
				<Input
					id="advanceFuel"
					type="number"
					step="0.01"
					min="0"
					bind:value={advanceFuel}
				/>
			</div>
			<div>
				<Label for="advanceMeals">{$t('expenses.fields.meals')}</Label>
				<Input
					id="advanceMeals"
					type="number"
					step="0.01"
					min="0"
					bind:value={advanceMeals}
				/>
			</div>
			<div>
				<Label for="advanceLodging">{$t('expenses.fields.lodging')}</Label>
				<Input
					id="advanceLodging"
					type="number"
					step="0.01"
					min="0"
					bind:value={advanceLodging}
				/>
			</div>
			<div>
				<Label for="advanceTolls">{$t('expenses.fields.tolls')}</Label>
				<Input
					id="advanceTolls"
					type="number"
					step="0.01"
					min="0"
					bind:value={advanceTolls}
				/>
			</div>
			<div class="col-span-2">
				<Label for="advanceOther">{$t('expenses.fields.other')}</Label>
				<Input
					id="advanceOther"
					type="number"
					step="0.01"
					min="0"
					bind:value={advanceOther}
				/>
			</div>
		</div>

		<div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
			<p class="text-sm text-amber-600 dark:text-amber-400">{$t('expenses.totalAdvance')}</p>
			<p class="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalAdvanceAmount)}</p>
		</div>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showAdvanceModal = false)}>
				{$t('common.cancel')}
			</Button>
			<Button color="green" onclick={createAdvance} disabled={totalAdvanceAmount <= 0}>
				<CashOutline class="w-4 h-4 mr-2" />
				{$t('expenses.createAdvance')}
			</Button>
		</div>
	{/snippet}
</Modal>

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
