<script lang="ts">
	import {
		Card,
		Button,
		Spinner,
		Alert,
		Badge,
		Toast,
		Modal,
		Select,
		Label,
		Input,
		Accordion,
		AccordionItem
	} from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		ArrowRightOutline,
		PenOutline,
		TrashBinOutline,
		PaperPlaneOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		MapPinOutline,
		TruckOutline,
		UserOutline,
		CalendarMonthOutline,
		ClockOutline,
		DownloadOutline,
		EnvelopeOutline
	} from 'flowbite-svelte-icons';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';
	import type { Id } from '$convex/_generated/dataModel';
	import type { QuotationPdfData } from '$lib/services/pdf';

	const client = useConvexClient();

	// Get quotation ID from URL
	const quotationId = $derived($page.params.id as Id<'quotations'>);

	// Query quotation
	const quotationQuery = useQuery(
		api.quotations.get,
		() => quotationId ? { id: quotationId } : 'skip'
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

	// Query tenant for company info
	const tenantQuery = useQuery(
		api.tenants.get,
		() => (tenantStore.tenantId ? { id: tenantStore.tenantId as Id<'tenants'> } : 'skip')
	);

	// Query parameters for terms and conditions
	const parametersQuery = useQuery(
		api.parameters.getActive,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Check if already converted to itinerary
	const existingItineraryQuery = useQuery(
		api.itineraries.byQuotation,
		() => quotationId ? { quotationId } : 'skip'
	);

	const quotation = $derived(quotationQuery.data);
	const vehicles = $derived(vehiclesQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const drivers = $derived(driversQuery.data || []);
	const existingItinerary = $derived(existingItineraryQuery.data);
	const tenant = $derived(tenantQuery.data);
	const parameters = $derived(parametersQuery.data);
	const isLoading = $derived(quotationQuery.isLoading);

	// Active resources for assignment
	const activeDrivers = $derived(drivers.filter(d => d.status === 'active'));
	const activeVehicles = $derived(vehicles.filter(v => v.status === 'active'));

	// Get vehicle and client details
	const vehicle = $derived(
		quotation?.vehicleId ? vehicles.find(v => v._id === quotation.vehicleId) : null
	);
	const clientData = $derived(
		quotation?.clientId ? clients.find(c => c._id === quotation.clientId) : null
	);

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Convert to itinerary modal state
	let showConvertModal = $state(false);
	let convertStartDate = $state('');
	let convertDriverId = $state('');
	let convertVehicleId = $state('');
	let isConverting = $state(false);

	// Approval modal state
	let showApprovalModal = $state(false);
	let approvalStartDate = $state('');
	let approvalCreateItinerary = $state(true);
	let approvalCreateInvoice = $state(true);
	let isApproving = $state(false);

	// PDF and Email state
	let isGeneratingPdf = $state(false);
	let isSendingEmail = $state(false);
	let showEmailModal = $state(false);
	let emailRecipient = $state('');

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

	function formatUsd(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2
		}).format(value);
	}

	// Calculate USD value from HNL
	function toUsd(hnl: number, exchangeRate: number): number {
		return hnl / exchangeRate;
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

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	async function updateStatus(status: string) {
		if (!quotation) return;

		try {
			await client.mutation(api.quotations.updateStatus, {
				id: quotation._id,
				status
			});
			showToastMessage($t('quotations.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to update status:', error);
			showToastMessage($t('quotations.saveFailed'), 'error');
		}
	}

	async function handleDelete() {
		if (!quotation) return;
		if (!confirm($t('quotations.deleteConfirm'))) return;

		try {
			await client.mutation(api.quotations.remove, { id: quotation._id });
			showToastMessage($t('quotations.deleteSuccess'), 'success');
			setTimeout(() => goto('/quotations'), 500);
		} catch (error) {
			console.error('Failed to delete quotation:', error);
			showToastMessage($t('quotations.deleteFailed'), 'error');
		}
	}

	function openConvertModal() {
		// Set default start date to tomorrow
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		convertStartDate = tomorrow.toISOString().split('T')[0];
		convertDriverId = '';
		convertVehicleId = quotation?.vehicleId || '';
		showConvertModal = true;
	}

	function openApprovalModal() {
		// Set default start date to tomorrow
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		approvalStartDate = tomorrow.toISOString().split('T')[0];
		approvalCreateItinerary = true;
		approvalCreateInvoice = true;
		showApprovalModal = true;
	}

	async function approveQuotation() {
		if (!quotation) return;

		isApproving = true;
		try {
			const startDateTimestamp = approvalStartDate ? new Date(approvalStartDate).getTime() : undefined;

			const result = await client.mutation(api.quotations.approve, {
				id: quotation._id,
				createItinerary: approvalCreateItinerary,
				createInvoice: approvalCreateInvoice,
				startDate: startDateTimestamp
			});

			showApprovalModal = false;

			let message = $t('quotations.approveSuccess');
			if (result.itineraryId) {
				message += ` ${$t('itineraries.created')}`;
			}
			if (result.invoiceId) {
				message += ` ${$t('invoices.created')}`;
			}

			showToastMessage(message, 'success');

			// If itinerary was created, navigate to it
			if (result.itineraryId) {
				setTimeout(() => goto(`/itineraries/${result.itineraryId}`), 1000);
			}
		} catch (error) {
			console.error('Failed to approve quotation:', error);
			showToastMessage(error instanceof Error ? error.message : $t('quotations.saveFailed'), 'error');
		} finally {
			isApproving = false;
		}
	}

	async function rejectQuotation() {
		if (!quotation) return;
		if (!confirm($t('quotations.rejectConfirm'))) return;

		try {
			await client.mutation(api.quotations.reject, {
				id: quotation._id,
				reason: 'Rejected by staff'
			});
			showToastMessage($t('quotations.rejectSuccess'), 'success');
		} catch (error) {
			console.error('Failed to reject quotation:', error);
			showToastMessage($t('quotations.saveFailed'), 'error');
		}
	}

	async function convertToItinerary() {
		if (!quotation || !convertStartDate) return;

		isConverting = true;
		try {
			const startDateTimestamp = new Date(convertStartDate).getTime();
			const itineraryId = await client.mutation(api.itineraries.createFromQuotation, {
				quotationId: quotation._id,
				startDate: startDateTimestamp,
				driverId: convertDriverId ? (convertDriverId as Id<'drivers'>) : undefined,
				vehicleId: convertVehicleId ? (convertVehicleId as Id<'vehicles'>) : undefined,
			});
			showConvertModal = false;
			showToastMessage($t('itineraries.createSuccess'), 'success');
			setTimeout(() => goto(`/itineraries/${itineraryId}`), 500);
		} catch (error) {
			console.error('Failed to convert to itinerary:', error);
			showToastMessage($t('itineraries.saveFailed'), 'error');
		} finally {
			isConverting = false;
		}
	}

	function buildPdfData(): QuotationPdfData | null {
		if (!quotation || !vehicle || !tenant) return null;

		// Calculate discount if client has one
		// To make the math work: subtotal - discount = salePriceHnl
		// So: subtotal = salePriceHnl + discountAmount
		const discountPercentage = clientData?.discountPercentage || 0;
		// Calculate discount amount based on the final sale price
		// If discount is 10%, then salePriceHnl = subtotal * 0.9, so subtotal = salePriceHnl / 0.9
		const subtotalHnl = discountPercentage > 0
			? Math.round(quotation.salePriceHnl / (1 - discountPercentage / 100))
			: quotation.salePriceHnl;
		const discountAmountHnl = subtotalHnl - quotation.salePriceHnl;

		return {
			quotationNumber: quotation.quotationNumber,
			date: quotation.createdAt.toString(), // Pass timestamp as string
			validUntil: quotation.validUntil ? quotation.validUntil.toString() : '',
			groupLeaderName: quotation.groupLeaderName,
			client: {
				name: getClientName(clientData),
				code: clientData?.clientCode || undefined,
				email: clientData?.email || undefined,
				phone: clientData?.phone || undefined,
				address: clientData?.address || undefined,
				taxId: clientData?.taxId || undefined,
				discountPercentage: discountPercentage
			},
			trip: {
				origin: quotation.origin,
				destination: quotation.destination,
				departureDate: quotation.departureDate ? quotation.departureDate.toString() : undefined,
				returnDate: undefined,
				groupSize: quotation.groupSize,
				estimatedDays: quotation.estimatedDays,
				totalDistance: quotation.totalDistance,
				totalTime: quotation.totalTime
			},
			vehicle: {
				name: vehicle.name,
				type: vehicle.make || 'Bus',
				capacity: vehicle.passengerCapacity
			},
			costs: {
				fuelCost: quotation.includeFuel ? quotation.fuelCost : 0,
				driverMealsCost: quotation.includeMeals ? quotation.driverMealsCost : 0,
				driverLodgingCost: quotation.includeMeals ? quotation.driverLodgingCost : 0,
				driverIncentiveCost: quotation.includeDriverIncentive ? quotation.driverIncentiveCost : 0,
				vehicleDistanceCost: quotation.vehicleDistanceCost,
				vehicleDailyCost: quotation.vehicleDailyCost,
				tollCost: quotation.includeTolls ? quotation.tollCost : 0,
				totalCost: quotation.totalCost
			},
			pricing: {
				subtotalHnl: subtotalHnl,
				discountPercentage: discountPercentage,
				discountAmountHnl: discountAmountHnl,
				salePriceHnl: quotation.salePriceHnl,
				salePriceUsd: quotation.salePriceUsd,
				markup: quotation.selectedMarkupPercentage
			},
			company: {
				name: tenant.companyName,
				logo: tenant.logoUrl || undefined,
				phone: tenant.primaryContactPhone || undefined,
				email: tenant.primaryContactEmail || undefined,
				address: tenant.address || undefined,
				city: tenant.city || undefined
			},
			termsAndConditions: parameters ? {
				validityDays: parameters.quotationValidityDays,
				prepaymentDays: parameters.prepaymentDays,
				cancellationMinHours: parameters.cancellationMinHours,
				cancellationPenaltyPercentage: parameters.cancellationPenaltyPercentage
			} : undefined,
			notes: quotation.notes
		};
	}

	async function downloadPdf() {
		const pdfData = buildPdfData();
		if (!pdfData) {
			showToastMessage($t('errors.unknown'), 'error');
			return;
		}

		isGeneratingPdf = true;
		try {
			const response = await fetch('/api/pdf/quotation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pdfData)
			});

			if (!response.ok) {
				throw new Error('Failed to generate PDF');
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `cotizacion-${quotation!.quotationNumber}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			showToastMessage($t('common.downloadComplete'), 'success');
		} catch (error) {
			console.error('PDF generation error:', error);
			showToastMessage($t('errors.unknown'), 'error');
		} finally {
			isGeneratingPdf = false;
		}
	}

	function openEmailModal() {
		emailRecipient = clientData?.email || '';
		showEmailModal = true;
	}

	async function sendQuotationEmail() {
		if (!emailRecipient || !quotation || !tenant) return;

		isSendingEmail = true;
		try {
			// First generate the PDF
			const pdfData = buildPdfData();
			if (!pdfData) throw new Error('Missing PDF data');

			const pdfResponse = await fetch('/api/pdf/quotation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pdfData)
			});

			if (!pdfResponse.ok) throw new Error('Failed to generate PDF');

			const pdfBlob = await pdfResponse.blob();
			const pdfArrayBuffer = await pdfBlob.arrayBuffer();
			const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

			// Send the email
			const emailResponse = await fetch('/api/email/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'quotation',
					to: emailRecipient,
					data: {
						recipientName: getClientName(clientData),
						quotationNumber: quotation.quotationNumber,
						origin: quotation.origin,
						destination: quotation.destination,
						departureDate: quotation.departureDate ? formatDate(quotation.departureDate) : '',
						totalPrice: formatCurrency(quotation.salePriceHnl),
						validUntil: quotation.validUntil ? formatDate(quotation.validUntil) : '',
						companyName: tenant.companyName,
						companyPhone: tenant.primaryContactPhone,
						companyEmail: tenant.primaryContactEmail
					},
					pdfBase64
				})
			});

			if (!emailResponse.ok) {
				const error = await emailResponse.json();
				throw new Error(error.message || 'Failed to send email');
			}

			showEmailModal = false;
			showToastMessage($t('common.emailSent'), 'success');

			// Update status to sent if still draft
			if (quotation.status === 'draft') {
				await updateStatus('sent');
			}
		} catch (error) {
			console.error('Email send error:', error);
			showToastMessage($t('errors.unknown'), 'error');
		} finally {
			isSendingEmail = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div class="flex items-center gap-4">
			<Button href="/quotations" color="alternative" size="sm">
				<ArrowLeftOutline class="w-4 h-4 mr-2" />
				{$t('quotations.title')}
			</Button>
			{#if quotation}
				<div>
					<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{quotation.quotationNumber}</h1>
					<p class="text-gray-600 dark:text-gray-400">{formatDate(quotation.createdAt)}</p>
				</div>
			{/if}
		</div>
		{#if quotation}
			<div class="flex items-center gap-2 flex-wrap">
				<StatusBadge status={quotation.status} variant="quotation" />

				<!-- PDF and Email buttons -->
				<Button size="sm" color="light" onclick={downloadPdf} disabled={isGeneratingPdf || !vehicle || !tenant}>
					{#if isGeneratingPdf}
						<Spinner size="4" class="mr-2" />
					{:else}
						<DownloadOutline class="w-4 h-4 mr-2" />
					{/if}
					PDF
				</Button>
				<Button size="sm" color="light" onclick={openEmailModal} disabled={!vehicle || !tenant}>
					<EnvelopeOutline class="w-4 h-4 mr-2" />
					{$t('common.email')}
				</Button>

				{#if quotation.status === 'draft'}
					<Button size="sm" onclick={() => updateStatus('sent')}>
						<PaperPlaneOutline class="w-4 h-4 mr-2" />
						{$t('common.sent')}
					</Button>
				{/if}
				{#if quotation.status === 'sent'}
					<Button size="sm" color="green" onclick={openApprovalModal}>
						<CheckCircleOutline class="w-4 h-4 mr-2" />
						{$t('common.accepted')}
					</Button>
					<Button size="sm" color="red" onclick={rejectQuotation}>
						<CloseCircleOutline class="w-4 h-4 mr-2" />
						{$t('common.rejected')}
					</Button>
				{/if}
				{#if quotation.status === 'approved'}
					{#if existingItinerary}
						<Button size="sm" color="light" href="/itineraries/{existingItinerary._id}">
							<CalendarMonthOutline class="w-4 h-4 mr-2" />
							{$t('itineraries.viewItinerary')}
						</Button>
					{:else}
						<Button size="sm" color="green" onclick={openConvertModal}>
							<ArrowRightOutline class="w-4 h-4 mr-2" />
							{$t('itineraries.convertFromQuotation')}
						</Button>
					{/if}
				{/if}
				{#if quotation.status === 'draft'}
					<Button size="sm" color="red" outline onclick={handleDelete}>
						<TrashBinOutline class="w-4 h-4 mr-2" />
						{$t('common.delete')}
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else if !quotation}
		<Alert color="red">
			{$t('errors.notFound')}
		</Alert>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Column: Details -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Route Information -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center gap-2 mb-4">
						<MapPinOutline class="w-5 h-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('quotations.new.routeInfo')}</h3>
					</div>

					<div class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{$t('quotations.new.origin')}</p>
								<p class="font-medium text-gray-900 dark:text-white">{quotation.origin}</p>
							</div>
							<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{$t('quotations.new.destination')}</p>
								<p class="font-medium text-gray-900 dark:text-white">{quotation.destination}</p>
							</div>
						</div>

						<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
								<p class="text-xs text-blue-600 dark:text-blue-400">{$t('quotations.new.totalDistance')}</p>
								<p class="text-lg font-bold text-blue-700 dark:text-blue-300">{formatDistance(quotation.totalDistance)}</p>
							</div>
							<div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
								<p class="text-xs text-purple-600 dark:text-purple-400">{$t('quotations.new.estimatedTime')}</p>
								<p class="text-lg font-bold text-purple-700 dark:text-purple-300">{formatDuration(quotation.totalTime)}</p>
							</div>
							<div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
								<p class="text-xs text-green-600 dark:text-green-400">{$t('quotations.new.days')}</p>
								<p class="text-lg font-bold text-green-700 dark:text-green-300">{quotation.estimatedDays}</p>
							</div>
							<div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
								<p class="text-xs text-orange-600 dark:text-orange-400">{$t('quotations.new.passengers')}</p>
								<p class="text-lg font-bold text-orange-700 dark:text-orange-300">{quotation.groupSize}</p>
							</div>
						</div>
					</div>
				</Card>

				<!-- Cost Breakdown -->
				<Card class="max-w-none !p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('quotations.new.costEstimate')}</h3>

					<div class="space-y-1">
						<Accordion flush class="divide-y-0">
							{#if quotation.includeFuel}
								<AccordionItem class="!py-1">
									{#snippet header()}
										<div class="flex justify-between w-full pr-2">
											<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.new.fuelCost')}</span>
											<span class="text-gray-900 dark:text-white font-medium">
												{formatCurrency(quotation.fuelCost)}
												<span class="text-gray-500 text-xs ml-2">{formatUsd(toUsd(quotation.fuelCost, quotation.exchangeRateUsed))}</span>
											</span>
										</div>
									{/snippet}
									<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
										<div class="flex justify-between">
											<span>{$t('quotations.costDetails.totalDistance')}:</span>
											<span>{quotation.totalDistance.toLocaleString()} km</span>
										</div>
										{#if vehicle}
											<div class="flex justify-between">
												<span>{$t('quotations.costDetails.fuelEfficiency')}:</span>
												<span>{vehicle.fuelEfficiency} {vehicle.fuelEfficiencyUnit === 'kpl' ? 'km/L' : vehicle.fuelEfficiencyUnit}</span>
											</div>
										{/if}
									</div>
								</AccordionItem>
							{/if}

							{#if quotation.includeMeals}
								<AccordionItem class="!py-1">
									{#snippet header()}
										<div class="flex justify-between w-full pr-2">
											<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.costDetails.viaticos')}</span>
											<span class="text-gray-900 dark:text-white font-medium">
												{formatCurrency(quotation.driverMealsCost + quotation.driverLodgingCost)}
												<span class="text-gray-500 text-xs ml-2">{formatUsd(toUsd(quotation.driverMealsCost + quotation.driverLodgingCost, quotation.exchangeRateUsed))}</span>
											</span>
										</div>
									{/snippet}
									<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
										<div class="flex justify-between">
											<span>{$t('quotations.costDetails.meals')} ({quotation.estimatedDays} {$t('units.days')}):</span>
											<span>{formatCurrency(quotation.driverMealsCost)}</span>
										</div>
										{#if quotation.driverLodgingCost > 0}
											<div class="flex justify-between">
												<span>{$t('quotations.costDetails.lodging')}:</span>
												<span>{formatCurrency(quotation.driverLodgingCost)}</span>
											</div>
										{/if}
									</div>
								</AccordionItem>
							{/if}

							{#if quotation.includeDriverIncentive && quotation.driverIncentiveCost > 0}
								<AccordionItem class="!py-1">
									{#snippet header()}
										<div class="flex justify-between w-full pr-2">
											<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.costDetails.driverIncentive')}</span>
											<span class="text-gray-900 dark:text-white font-medium">
												{formatCurrency(quotation.driverIncentiveCost)}
												<span class="text-gray-500 text-xs ml-2">{formatUsd(toUsd(quotation.driverIncentiveCost, quotation.exchangeRateUsed))}</span>
											</span>
										</div>
									{/snippet}
									<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
										<div class="flex justify-between">
											<span>{quotation.estimatedDays} {$t('units.days')}:</span>
											<span>{formatCurrency(quotation.driverIncentiveCost)}</span>
										</div>
										<p class="text-xs text-gray-400 dark:text-gray-500 italic mt-1">
											{$t('quotations.costDetails.driverIncentiveHint')}
										</p>
									</div>
								</AccordionItem>
							{/if}

							<AccordionItem class="!py-1">
								{#snippet header()}
									<div class="flex justify-between w-full pr-2">
										<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.new.vehicleCost')}</span>
										<span class="text-gray-900 dark:text-white font-medium">
											{formatCurrency(quotation.vehicleDistanceCost + quotation.vehicleDailyCost)}
											<span class="text-gray-500 text-xs ml-2">{formatUsd(toUsd(quotation.vehicleDistanceCost + quotation.vehicleDailyCost, quotation.exchangeRateUsed))}</span>
										</span>
									</div>
								{/snippet}
								<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
									<div class="flex justify-between">
										<span>{$t('quotations.costDetails.perDistance')} ({quotation.totalDistance.toLocaleString()} km):</span>
										<span>{formatCurrency(quotation.vehicleDistanceCost)}</span>
									</div>
									<div class="flex justify-between">
										<span>{$t('quotations.costDetails.perDay')} ({quotation.estimatedDays} {$t('units.days')}):</span>
										<span>{formatCurrency(quotation.vehicleDailyCost)}</span>
									</div>
								</div>
							</AccordionItem>

							{#if quotation.tollCost > 0}
								<AccordionItem class="!py-1">
									{#snippet header()}
										<div class="flex justify-between w-full pr-2">
											<span class="text-gray-700 dark:text-gray-300 font-medium">{$t('quotations.new.tollCost')}</span>
											<span class="text-gray-900 dark:text-white font-medium">
												{formatCurrency(quotation.tollCost)}
												<span class="text-gray-500 text-xs ml-2">{formatUsd(toUsd(quotation.tollCost, quotation.exchangeRateUsed))}</span>
											</span>
										</div>
									{/snippet}
									<div class="pl-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 pb-2">
										<div class="flex justify-between">
											<span>{$t('quotations.new.tollCost')}:</span>
											<span>{formatCurrency(quotation.tollCost)}</span>
										</div>
									</div>
								</AccordionItem>
							{/if}
						</Accordion>

						<div class="flex justify-between py-3 border-t-2 border-gray-200 dark:border-gray-600 mt-2">
							<span class="font-semibold text-gray-700 dark:text-gray-300">{$t('quotations.new.subtotal')}</span>
							<span class="font-semibold text-gray-900 dark:text-white">
								{formatCurrency(quotation.totalCost)}
								<span class="text-gray-500 text-xs ml-2">{formatUsd(toUsd(quotation.totalCost, quotation.exchangeRateUsed))}</span>
							</span>
						</div>

						<div class="flex justify-between py-2">
							<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.margin')} ({quotation.selectedMarkupPercentage}%)</span>
							<span class="font-medium text-gray-900 dark:text-white">
								+{formatCurrency(quotation.salePriceHnl - quotation.totalCost)}
								<span class="text-gray-500 text-xs ml-2">+{formatUsd(toUsd(quotation.salePriceHnl - quotation.totalCost, quotation.exchangeRateUsed))}</span>
							</span>
						</div>
					</div>
				</Card>

				<!-- Notes -->
				{#if quotation.notes}
					<Card class="max-w-none !p-6">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{$t('clients.fields.notes')}</h3>
						<p class="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{quotation.notes}</p>
					</Card>
				{/if}
			</div>

			<!-- Right Column: Summary -->
			<div class="space-y-6">
				<!-- Final Price -->
				<Card class="max-w-none !p-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('quotations.new.total')}</h3>
					<div class="text-center">
						<p class="text-4xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(quotation.salePriceHnl)}</p>
						<p class="text-lg text-gray-600 dark:text-gray-400 mt-1">${quotation.salePriceUsd.toFixed(2)} USD</p>
						<p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
							{$t('settings.fields.exchangeRate')}: L{quotation.exchangeRateUsed.toFixed(2)}
						</p>
					</div>
				</Card>

				<!-- Vehicle Info -->
				{#if vehicle}
					<Card class="max-w-none !p-6">
						<div class="flex items-center gap-2 mb-3">
							<TruckOutline class="w-5 h-5 text-gray-500" />
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('quotations.new.vehicleSelection')}</h3>
						</div>
						<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="font-medium text-gray-900 dark:text-white">{vehicle.name}</p>
							{#if vehicle.make || vehicle.model}
								<p class="text-sm text-gray-500 dark:text-gray-400">
									{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
								</p>
							{/if}
							<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
								{vehicle.passengerCapacity} {$t('vehicles.fields.passengers')}
							</p>
						</div>
					</Card>
				{/if}

				<!-- Client Info -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center gap-2 mb-3">
						<UserOutline class="w-5 h-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('quotations.new.clientSelection')}</h3>
					</div>
					{#if clientData}
						<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="font-medium text-gray-900 dark:text-white">{getClientName(clientData)}</p>
							{#if clientData.email}
								<p class="text-sm text-gray-500 dark:text-gray-400">{clientData.email}</p>
							{/if}
							{#if clientData.phone}
								<p class="text-sm text-gray-500 dark:text-gray-400">{clientData.phone}</p>
							{/if}
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400">Walk-in</p>
					{/if}
				</Card>

				<!-- Dates -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center gap-2 mb-3">
						<CalendarMonthOutline class="w-5 h-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('quotations.columns.date')}</h3>
					</div>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">{$t('common.create')}</span>
							<span class="text-gray-900 dark:text-white">{formatDateTime(quotation.createdAt)}</span>
						</div>
						{#if quotation.validUntil && quotation.status !== 'approved'}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('common.expires')}</span>
								<span class="text-gray-900 dark:text-white">{formatDateTime(quotation.validUntil)}</span>
							</div>
						{/if}
						{#if quotation.sentAt}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('common.sent')}</span>
								<span class="text-gray-900 dark:text-white">{formatDateTime(quotation.sentAt)}</span>
							</div>
						{/if}
						{#if quotation.approvedAt}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('common.accepted')}</span>
								<span class="text-gray-900 dark:text-white">{formatDateTime(quotation.approvedAt)}</span>
							</div>
						{/if}
						{#if quotation.rejectedAt}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('common.rejected')}</span>
								<span class="text-gray-900 dark:text-white">{formatDateTime(quotation.rejectedAt)}</span>
							</div>
						{/if}
					</div>
				</Card>

				<!-- Included Options -->
				<Card class="max-w-none !p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">{$t('quotations.new.pricingOptions')}</h3>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.fuelCost')}</span>
							<Badge color={quotation.includeFuel ? 'green' : 'gray'}>
								{quotation.includeFuel ? $t('common.yes') : $t('common.no')}
							</Badge>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.mealsCost')}</span>
							<Badge color={quotation.includeMeals ? 'green' : 'gray'}>
								{quotation.includeMeals ? $t('common.yes') : $t('common.no')}
							</Badge>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.tollCost')}</span>
							<Badge color={quotation.includeTolls ? 'green' : 'gray'}>
								{quotation.includeTolls ? $t('common.yes') : $t('common.no')}
							</Badge>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600 dark:text-gray-400">{$t('quotations.new.driverCost')}</span>
							<Badge color={quotation.includeDriverIncentive ? 'green' : 'gray'}>
								{quotation.includeDriverIncentive ? $t('common.yes') : $t('common.no')}
							</Badge>
						</div>
					</div>
				</Card>
			</div>
		</div>
	{/if}
</div>

<!-- Convert to Itinerary Modal -->
<Modal bind:open={showConvertModal} title={$t('itineraries.convertFromQuotation')} size="md">
	<div class="space-y-4">
		<p class="text-gray-600 dark:text-gray-400">
			{$t('itineraries.convert.subtitle')}
		</p>

		<div>
			<Label for="start-date" class="mb-2">{$t('itineraries.details.startDate')} *</Label>
			<Input
				id="start-date"
				type="date"
				bind:value={convertStartDate}
				required
			/>
		</div>

		<div>
			<Label for="driver" class="mb-2">{$t('itineraries.columns.driver')} ({$t('common.optional')})</Label>
			<Select id="driver" bind:value={convertDriverId}>
				<option value="">{$t('itineraries.selectDriver')}</option>
				{#each activeDrivers as d}
					<option value={d._id}>{d.firstName} {d.lastName}</option>
				{/each}
			</Select>
		</div>

		<div>
			<Label for="vehicle" class="mb-2">{$t('itineraries.columns.vehicle')} ({$t('common.optional')})</Label>
			<Select id="vehicle" bind:value={convertVehicleId}>
				<option value="">{$t('itineraries.selectVehicle')}</option>
				{#each activeVehicles as v}
					<option value={v._id}>{v.name} ({v.passengerCapacity} {$t('vehicles.fields.passengers')})</option>
				{/each}
			</Select>
		</div>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showConvertModal = false)} disabled={isConverting}>
				{$t('common.cancel')}
			</Button>
			<Button color="green" onclick={convertToItinerary} disabled={!convertStartDate || isConverting}>
				{#if isConverting}
					<Spinner size="4" class="mr-2" />
				{:else}
					<ArrowRightOutline class="w-4 h-4 mr-2" />
				{/if}
				{$t('itineraries.convertFromQuotation')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Email Modal -->
<Modal bind:open={showEmailModal} title={$t('common.sendEmail')} size="md">
	<div class="space-y-4">
		<p class="text-gray-600 dark:text-gray-400">
			{$t('quotations.emailDescription')}
		</p>

		<div>
			<Label for="email-recipient" class="mb-2">{$t('common.email')} *</Label>
			<Input
				id="email-recipient"
				type="email"
				bind:value={emailRecipient}
				placeholder="cliente@ejemplo.com"
				required
			/>
		</div>

		{#if quotation}
			<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{$t('quotations.emailPreview')}:</p>
				<p class="font-medium text-gray-900 dark:text-white">
					{$t('quotations.title')} {quotation.quotationNumber}
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{quotation.origin} → {quotation.destination}
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					{$t('quotations.new.total')}: {formatCurrency(quotation.salePriceHnl)}
				</p>
			</div>
		{/if}
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showEmailModal = false)} disabled={isSendingEmail}>
				{$t('common.cancel')}
			</Button>
			<Button onclick={sendQuotationEmail} disabled={!emailRecipient || isSendingEmail}>
				{#if isSendingEmail}
					<Spinner size="4" class="mr-2" />
				{:else}
					<EnvelopeOutline class="w-4 h-4 mr-2" />
				{/if}
				{$t('common.send')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Approval Modal -->
<Modal bind:open={showApprovalModal} title={$t('quotations.approveTitle')} size="md">
	<div class="space-y-4">
		<p class="text-gray-600 dark:text-gray-400">
			{$t('quotations.approveDescription')}
		</p>

		<div>
			<Label for="approval-start-date" class="mb-2">{$t('itineraries.details.startDate')}</Label>
			<Input
				id="approval-start-date"
				type="date"
				bind:value={approvalStartDate}
			/>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				{$t('quotations.startDateHint')}
			</p>
		</div>

		<div class="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<h4 class="font-medium text-gray-900 dark:text-white">{$t('quotations.approvalOptions')}</h4>

			<label class="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={approvalCreateItinerary}
					class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
				/>
				<div>
					<span class="text-gray-900 dark:text-white">{$t('quotations.createItinerary')}</span>
					<p class="text-xs text-gray-500 dark:text-gray-400">{$t('quotations.createItineraryHint')}</p>
				</div>
			</label>

			<label class="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={approvalCreateInvoice}
					class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
				/>
				<div>
					<span class="text-gray-900 dark:text-white">{$t('quotations.createInvoice')}</span>
					<p class="text-xs text-gray-500 dark:text-gray-400">{$t('quotations.createInvoiceHint')}</p>
				</div>
			</label>
		</div>

		{#if approvalCreateItinerary && !approvalStartDate}
			<Alert color="yellow">
				{$t('quotations.startDateRequired')}
			</Alert>
		{/if}
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showApprovalModal = false)} disabled={isApproving}>
				{$t('common.cancel')}
			</Button>
			<Button
				color="green"
				onclick={approveQuotation}
				disabled={isApproving || (approvalCreateItinerary && !approvalStartDate)}
			>
				{#if isApproving}
					<Spinner size="4" class="mr-2" />
				{:else}
					<CheckCircleOutline class="w-4 h-4 mr-2" />
				{/if}
				{$t('quotations.approve')}
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
