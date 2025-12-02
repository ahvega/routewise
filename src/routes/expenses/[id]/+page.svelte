<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';
	import {
		Card,
		Button,
		Modal,
		Label,
		Input,
		Textarea,
		Select,
		Spinner,
		Toast
	} from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		CheckCircleOutline,
		CashOutline,
		ClipboardCheckOutline,
		CloseCircleOutline,
		ExclamationCircleOutline,
		TruckOutline,
		UserOutline,
		CalendarMonthOutline,
		EditOutline,
		PaperPlaneOutline,
		TrashBinOutline,
		FilePdfOutline,
		DownloadOutline
	} from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';

	const client = useConvexClient();
	const advanceId = $derived($page.params.id as Id<'expenseAdvances'>);

	const advanceQuery = useQuery(api.expenseAdvances.get, () => advanceId ? { id: advanceId } : 'skip');
	const advance = $derived(advanceQuery.data);

	// Fetch related data
	const itineraryQuery = useQuery(
		api.itineraries.get,
		() => advance?.itineraryId ? { id: advance.itineraryId } : 'skip'
	);
	const driverQuery = useQuery(
		api.drivers.get,
		() => advance?.driverId ? { id: advance.driverId } : 'skip'
	);

	const itinerary = $derived(itineraryQuery.data);
	const driver = $derived(driverQuery.data);

	// Modal states
	let showApproveModal = $state(false);
	let showDisburseModal = $state(false);
	let showSettleModal = $state(false);
	let showCancelModal = $state(false);

	// Form states
	let disbursementMethod = $state('cash');
	let disbursementReference = $state('');

	let actualFuel = $state(0);
	let actualMeals = $state(0);
	let actualLodging = $state(0);
	let actualTolls = $state(0);
	let actualOther = $state(0);
	let receiptsCount = $state(0);
	let settlementNotes = $state('');

	let cancelReason = $state('');

	// Toast
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	let isSubmitting = $state(false);

	// Initialize settlement form with estimated values
	$effect(() => {
		if (advance && showSettleModal) {
			actualFuel = advance.estimatedFuel ?? 0;
			actualMeals = advance.estimatedMeals ?? 0;
			actualLodging = advance.estimatedLodging ?? 0;
			actualTolls = advance.estimatedTolls ?? 0;
			actualOther = advance.estimatedOther ?? 0;
		}
	});

	const actualTotal = $derived(actualFuel + actualMeals + actualLodging + actualTolls + actualOther);
	const balancePreview = $derived(advance ? advance.amountHnl - actualTotal : 0);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 2
		}).format(amount);
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

	function showSuccessToast(message: string) {
		toastMessage = message;
		toastType = 'success';
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	function showErrorToast(message: string) {
		toastMessage = message;
		toastType = 'error';
		showToast = true;
		setTimeout(() => (showToast = false), 5000);
	}

	async function approveAdvance() {
		if (!advance) return;
		isSubmitting = true;
		try {
			await client.mutation(api.expenseAdvances.approve, { id: advance._id });
			showApproveModal = false;
			showSuccessToast($t('expenses.messages.approved'));
		} catch (error) {
			showErrorToast($t('common.error'));
		} finally {
			isSubmitting = false;
		}
	}

	async function disburseAdvance() {
		if (!advance) return;
		isSubmitting = true;
		try {
			await client.mutation(api.expenseAdvances.disburse, {
				id: advance._id,
				disbursementMethod,
				disbursementReference: disbursementReference || undefined
			});
			showDisburseModal = false;
			showSuccessToast($t('expenses.messages.disbursed'));
		} catch (error) {
			showErrorToast($t('common.error'));
		} finally {
			isSubmitting = false;
		}
	}

	async function settleAdvance() {
		if (!advance) return;
		isSubmitting = true;
		try {
			await client.mutation(api.expenseAdvances.settle, {
				id: advance._id,
				actualFuel,
				actualMeals,
				actualLodging,
				actualTolls,
				actualOther,
				receiptsCount: receiptsCount || undefined,
				settlementNotes: settlementNotes || undefined
			});
			showSettleModal = false;
			showSuccessToast($t('expenses.messages.settled'));
		} catch (error) {
			showErrorToast($t('common.error'));
		} finally {
			isSubmitting = false;
		}
	}

	async function cancelAdvance() {
		if (!advance) return;
		isSubmitting = true;
		try {
			await client.mutation(api.expenseAdvances.cancel, {
				id: advance._id,
				reason: cancelReason || undefined
			});
			showCancelModal = false;
			showSuccessToast($t('expenses.messages.cancelled'));
		} catch (error) {
			showErrorToast($t('common.error'));
		} finally {
			isSubmitting = false;
		}
	}

	async function settleBalance() {
		if (!advance) return;
		isSubmitting = true;
		try {
			await client.mutation(api.expenseAdvances.settleBalance, {
				id: advance._id
			});
			showSuccessToast($t('expenses.messages.balanceSettled'));
		} catch (error) {
			showErrorToast($t('common.error'));
		} finally {
			isSubmitting = false;
		}
	}

	const disbursementOptions = [
		{ value: 'cash', name: $t('expenses.disbursement.cash') },
		{ value: 'transfer', name: $t('expenses.disbursement.transfer') }
	];

	// Submit draft for approval
	async function submitForApproval() {
		if (!advance) return;
		isSubmitting = true;
		try {
			await client.mutation(api.expenseAdvances.submitForApproval, { id: advance._id });
			showSuccessToast($t('expenses.messages.submitted'));
		} catch (error) {
			showErrorToast($t('common.error'));
		} finally {
			isSubmitting = false;
		}
	}

	// Delete draft
	async function deleteAdvance() {
		if (!advance) return;
		isSubmitting = true;
		try {
			await client.mutation(api.expenseAdvances.remove, { id: advance._id });
			goto('/expenses');
		} catch (error) {
			showErrorToast($t('common.error'));
		} finally {
			isSubmitting = false;
		}
	}

	// Download PDF
	let isDownloadingPdf = $state(false);

	async function downloadPdf() {
		if (!advance || !itinerary) return;

		isDownloadingPdf = true;
		try {
			// Build PDF data from advance and itinerary
			const pdfData = {
				advanceNumber: advance.advanceNumber,
				clientName: itinerary.clientId ? 'Cliente' : 'Walk-in', // We'll get this from the client query
				itineraryCode: itinerary.itineraryNumber || itinerary.itineraryLongName || '',
				route: `${itinerary.origin} - ${itinerary.destination}`,
				driverName: driver ? `${driver.firstName} ${driver.lastName}` : 'Sin asignar',
				currency: 'HNL' as const,
				totalAdvance: advance.amountHnl,
				mode: advance.status === 'settled' ? 'settlement' as const : 'advance' as const,
				// Build viaticos from estimated values
				viaticos: buildViaticosData(),
				gastosItinerario: buildGastosData(),
				liquidacion: advance.status === 'settled' ? buildLiquidacionData() : [],
				viaticosTotal: (advance.estimatedMeals ?? 0) + (advance.estimatedLodging ?? 0),
				gastosTotal: (advance.estimatedFuel ?? 0) + (advance.estimatedTolls ?? 0) + (advance.estimatedOther ?? 0),
				balanceCompanyFavor: advance.balanceAmount && advance.balanceAmount > 0 ? advance.balanceAmount : 0,
				balanceEmployeeFavor: advance.balanceAmount && advance.balanceAmount < 0 ? Math.abs(advance.balanceAmount) : 0,
				documentDate: formatDate(advance.createdAt),
				company: {
					name: 'LAT Tours & Travel'
				}
			};

			const response = await fetch('/api/pdf/expense-advance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pdfData)
			});

			if (!response.ok) throw new Error('PDF generation failed');

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `anticipo-${advance.advanceNumber}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			showSuccessToast($t('expenses.pdfDownloaded'));
		} catch (error) {
			console.error('Failed to download PDF:', error);
			showErrorToast($t('expenses.pdfFailed'));
		} finally {
			isDownloadingPdf = false;
		}
	}

	// Helper to build viáticos data for PDF
	function buildViaticosData() {
		if (!itinerary) return [];
		const days = itinerary.estimatedDays || 1;
		const mealsPerDay = (advance?.estimatedMeals ?? 0) / days;
		const lodgingPerDay = (advance?.estimatedLodging ?? 0) / days;

		// Create one row per day
		const viaticos = [];
		const startDate = new Date(itinerary.startDate);

		for (let i = 0; i < days; i++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + i);
			const dayOfWeek = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'][date.getDay()];
			const dayNum = String(date.getDate()).padStart(2, '0');
			const month = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'][date.getMonth()];

			viaticos.push({
				date: `${dayOfWeek}-${dayNum}/${month}`,
				location: i === 0 ? itinerary.origin : (i === days - 1 ? itinerary.destination : itinerary.destination),
				breakfast: mealsPerDay / 3,
				lunch: mealsPerDay / 3,
				dinner: mealsPerDay / 3,
				busOrHotel: i < days - 1 ? lodgingPerDay : 0, // No lodging on last day
				total: mealsPerDay + (i < days - 1 ? lodgingPerDay : 0)
			});
		}
		return viaticos;
	}

	// Helper to build gastos data for PDF
	function buildGastosData() {
		if (!advance) return [];
		const gastos = [];
		const dateStr = itinerary ? formatAdvanceDate(itinerary.startDate) : '';

		if (advance.estimatedFuel && advance.estimatedFuel > 0) {
			gastos.push({
				date: dateStr,
				location: itinerary?.origin || '',
				concept: 'Combustible',
				quantity: 1,
				unitPrice: advance.estimatedFuel,
				total: advance.estimatedFuel
			});
		}
		if (advance.estimatedTolls && advance.estimatedTolls > 0) {
			gastos.push({
				date: dateStr,
				location: 'Ruta',
				concept: 'Peajes',
				quantity: 1,
				unitPrice: advance.estimatedTolls,
				total: advance.estimatedTolls
			});
		}
		if (advance.estimatedOther && advance.estimatedOther > 0) {
			gastos.push({
				date: dateStr,
				location: '',
				concept: 'Otros / Imprevistos',
				quantity: 1,
				unitPrice: advance.estimatedOther,
				total: advance.estimatedOther
			});
		}
		return gastos;
	}

	// Helper to build liquidación data for PDF (settlement mode)
	function buildLiquidacionData() {
		if (!advance || advance.status !== 'settled') return [];
		const liquidacion = [];
		const dateStr = advance.settledAt ? formatAdvanceDate(advance.settledAt) : '';

		if (advance.actualFuel && advance.actualFuel > 0) {
			liquidacion.push({
				date: dateStr,
				location: itinerary?.origin || '',
				concept: 'Combustible',
				currency: 'HNL' as const,
				originalValue: advance.actualFuel,
				totalInCurrency: advance.actualFuel
			});
		}
		if (advance.actualTolls && advance.actualTolls > 0) {
			liquidacion.push({
				date: dateStr,
				location: 'Ruta',
				concept: 'Peajes',
				currency: 'HNL' as const,
				originalValue: advance.actualTolls,
				totalInCurrency: advance.actualTolls
			});
		}
		if (advance.actualOther && advance.actualOther > 0) {
			liquidacion.push({
				date: dateStr,
				location: '',
				concept: 'Otros gastos',
				currency: 'HNL' as const,
				originalValue: advance.actualOther,
				totalInCurrency: advance.actualOther
			});
		}
		return liquidacion;
	}

	// Format date for advance PDF
	function formatAdvanceDate(dateInput: number): string {
		const date = new Date(dateInput);
		const dayOfWeek = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'][date.getDay()];
		const dayNum = String(date.getDate()).padStart(2, '0');
		const month = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'][date.getMonth()];
		return `${dayOfWeek}-${dayNum}/${month}`;
	}
</script>

<svelte:head>
	<title>{advance?.advanceNumber ?? $t('expenses.title')} | RouteWise</title>
</svelte:head>

{#if showToast}
	<Toast class="fixed top-4 right-4 z-50" color={toastType === 'success' ? 'green' : 'red'}>
		{toastMessage}
	</Toast>
{/if}

<div class="p-4 md:p-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button href="/expenses" color="light" size="sm">
			<ArrowLeftOutline class="w-4 h-4 mr-2" />
			{$t('common.back')}
		</Button>
	</div>

	{#if advanceQuery.isLoading}
		<div class="flex items-center justify-center p-8">
			<Spinner size="8" />
		</div>
	{:else if !advance}
		<Card class="!p-8 text-center">
			<ExclamationCircleOutline class="w-12 h-12 text-gray-400 mx-auto mb-4" />
			<p class="text-gray-500 dark:text-gray-400">{$t('expenses.notFound')}</p>
		</Card>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Advance Header -->
				<Card class="!p-6">
					<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
								{advance.advanceNumber}
							</h1>
							<p class="text-gray-500 dark:text-gray-400 mt-1">{advance.purpose}</p>
						</div>
						<StatusBadge status={advance.status} variant="advance" size="lg" showIcon />
					</div>

					<!-- Amount -->
					<div class="grid grid-cols-2 gap-4">
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.amount')}</p>
							<p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
								{formatCurrency(advance.amountHnl)}
							</p>
							{#if advance.amountUsd}
								<p class="text-sm text-gray-500 dark:text-gray-400">
									≈ ${advance.amountUsd.toFixed(2)} USD
								</p>
							{/if}
						</div>

						{#if advance.status === 'settled' && advance.actualExpenses !== undefined}
							<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.actualExpenses')}</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
									{formatCurrency(advance.actualExpenses)}
								</p>
								{#if advance.balanceAmount !== undefined}
									<p class="text-sm {advance.balanceAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
										{advance.balanceAmount >= 0 ? $t('expenses.driverOwes') : $t('expenses.companyOwes')}:
										{formatCurrency(Math.abs(advance.balanceAmount))}
									</p>
								{/if}
							</div>
						{/if}
					</div>
				</Card>

				<!-- Estimated Breakdown -->
				{#if advance.status !== 'settled'}
					<Card class="!p-6">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							{$t('expenses.estimatedBreakdown')}
						</h3>
						<div class="space-y-3">
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.fuel')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.estimatedFuel ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.meals')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.estimatedMeals ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.lodging')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.estimatedLodging ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.tolls')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.estimatedTolls ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.other')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.estimatedOther ?? 0)}
								</span>
							</div>
							<div class="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
								<span class="font-semibold text-gray-900 dark:text-white">{$t('common.total')}</span>
								<span class="font-bold text-gray-900 dark:text-white">
									{formatCurrency(
										(advance.estimatedFuel ?? 0) +
										(advance.estimatedMeals ?? 0) +
										(advance.estimatedLodging ?? 0) +
										(advance.estimatedTolls ?? 0) +
										(advance.estimatedOther ?? 0)
									)}
								</span>
							</div>
						</div>
					</Card>
				{/if}

				<!-- Actual Breakdown (for settled) -->
				{#if advance.status === 'settled'}
					<Card class="!p-6">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							{$t('expenses.actualBreakdown')}
						</h3>
						<div class="space-y-3">
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.fuel')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.actualFuel ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.meals')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.actualMeals ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.lodging')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.actualLodging ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.tolls')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.actualTolls ?? 0)}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">{$t('expenses.breakdown.other')}</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(advance.actualOther ?? 0)}
								</span>
							</div>
							<div class="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
								<span class="font-semibold text-gray-900 dark:text-white">{$t('common.total')}</span>
								<span class="font-bold text-gray-900 dark:text-white">
									{formatCurrency(advance.actualExpenses ?? 0)}
								</span>
							</div>
							{#if advance.receiptsCount}
								<div class="pt-2">
									<span class="text-sm text-gray-500 dark:text-gray-400">
										{$t('expenses.receiptsCount')}: {advance.receiptsCount}
									</span>
								</div>
							{/if}
						</div>
					</Card>

					<!-- Balance Settlement -->
					{#if advance.balanceAmount !== undefined && !advance.balanceSettled}
						<Card class="!p-6 border-2 {advance.balanceAmount >= 0 ? 'border-emerald-500' : 'border-rose-500'}">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
								{$t('expenses.pendingBalance')}
							</h3>
							<div class="flex items-center justify-between">
								<div>
									<p class="text-2xl font-bold {advance.balanceAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
										{formatCurrency(Math.abs(advance.balanceAmount))}
									</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{advance.balanceAmount >= 0 ? $t('expenses.driverOwes') : $t('expenses.companyOwes')}
									</p>
								</div>
								<Button color="primary" onclick={() => settleBalance()} disabled={isSubmitting}>
									<CheckCircleOutline class="w-4 h-4 mr-2" />
									{$t('expenses.markBalanceSettled')}
								</Button>
							</div>
						</Card>
					{/if}
				{/if}

				<!-- Timeline -->
				<Card class="!p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						{$t('expenses.sections.timeline')}
					</h3>
					<div class="space-y-4">
						<div class="flex gap-3">
							<div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
								<CalendarMonthOutline class="w-4 h-4 text-gray-500" />
							</div>
							<div>
								<p class="font-medium text-gray-900 dark:text-white">{$t('expenses.timeline.created')}</p>
								<p class="text-sm text-gray-500">{formatDateTime(advance.createdAt)}</p>
							</div>
						</div>

						{#if advance.approvedAt}
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
									<CheckCircleOutline class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
								</div>
								<div>
									<p class="font-medium text-gray-900 dark:text-white">{$t('expenses.timeline.approved')}</p>
									<p class="text-sm text-gray-500">{formatDateTime(advance.approvedAt)}</p>
								</div>
							</div>
						{/if}

						{#if advance.disbursedAt}
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
									<CashOutline class="w-4 h-4 text-sky-600 dark:text-sky-400" />
								</div>
								<div>
									<p class="font-medium text-gray-900 dark:text-white">{$t('expenses.timeline.disbursed')}</p>
									<p class="text-sm text-gray-500">{formatDateTime(advance.disbursedAt)}</p>
									{#if advance.disbursementMethod}
										<p class="text-sm text-gray-400">
											{$t(`expenses.disbursement.${advance.disbursementMethod}`)}
											{#if advance.disbursementReference}
												- {advance.disbursementReference}
											{/if}
										</p>
									{/if}
								</div>
							</div>
						{/if}

						{#if advance.settledAt}
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
									<ClipboardCheckOutline class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
								</div>
								<div>
									<p class="font-medium text-gray-900 dark:text-white">{$t('expenses.timeline.settled')}</p>
									<p class="text-sm text-gray-500">{formatDateTime(advance.settledAt)}</p>
								</div>
							</div>
						{/if}

						{#if advance.cancelledAt}
							<div class="flex gap-3">
								<div class="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
									<CloseCircleOutline class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								</div>
								<div>
									<p class="font-medium text-gray-900 dark:text-white">{$t('expenses.timeline.cancelled')}</p>
									<p class="text-sm text-gray-500">{formatDateTime(advance.cancelledAt)}</p>
									{#if advance.cancellationReason}
										<p class="text-sm text-gray-400">{advance.cancellationReason}</p>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</Card>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Actions -->
				<Card class="!p-4">
					<h3 class="font-semibold text-gray-900 dark:text-white mb-4">{$t('common.actions')}</h3>
					<div class="space-y-2">
						<!-- PDF Download - available for all non-draft statuses -->
						{#if advance.status !== 'draft' && advance.status !== 'cancelled'}
							<Button color="light" class="w-full" onclick={downloadPdf} disabled={isDownloadingPdf}>
								{#if isDownloadingPdf}
									<Spinner size="4" class="mr-2" />
								{:else}
									<FilePdfOutline class="w-4 h-4 mr-2" />
								{/if}
								{$t('expenses.downloadPdf')}
							</Button>
						{/if}

						{#if advance.status === 'draft'}
							<Button color="light" href="/expenses/{advance._id}/edit" class="w-full">
								<EditOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.edit')}
							</Button>
							<Button color="primary" class="w-full" onclick={submitForApproval} disabled={isSubmitting}>
								<PaperPlaneOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.submitForApproval')}
							</Button>
							<Button color="red" outline class="w-full" onclick={deleteAdvance} disabled={isSubmitting}>
								<TrashBinOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.delete')}
							</Button>
						{:else if advance.status === 'cancelled'}
							<!-- Cancelled advances can be deleted to allow creating a new one -->
							<Button color="red" outline class="w-full" onclick={deleteAdvance} disabled={isSubmitting}>
								<TrashBinOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.delete')}
							</Button>
						{:else if advance.status === 'pending'}
							<Button color="green" class="w-full" onclick={() => (showApproveModal = true)}>
								<CheckCircleOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.approve')}
							</Button>
							<Button color="red" outline class="w-full" onclick={() => (showCancelModal = true)}>
								<CloseCircleOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.cancel')}
							</Button>
						{:else if advance.status === 'approved'}
							<Button color="primary" class="w-full" onclick={() => (showDisburseModal = true)}>
								<CashOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.disburse')}
							</Button>
							<Button color="red" outline class="w-full" onclick={() => (showCancelModal = true)}>
								<CloseCircleOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.cancel')}
							</Button>
						{:else if advance.status === 'disbursed'}
							<Button color="green" class="w-full" onclick={() => (showSettleModal = true)}>
								<ClipboardCheckOutline class="w-4 h-4 mr-2" />
								{$t('expenses.actions.settle')}
							</Button>
						{/if}
					</div>
				</Card>

				<!-- Itinerary Info -->
				{#if itinerary}
					<Card class="!p-4">
						<h3 class="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<TruckOutline class="w-5 h-5" />
							{$t('itineraries.title')}
						</h3>
						<div class="space-y-2 text-sm">
							<p>
								<span class="text-gray-500 dark:text-gray-400">{$t('common.number')}:</span>
								<a href="/itineraries/{itinerary._id}" class="text-primary-600 hover:underline ml-1">
									{itinerary.itineraryNumber}
								</a>
							</p>
							<p>
								<span class="text-gray-500 dark:text-gray-400">{$t('quotations.route')}:</span>
								<span class="text-gray-900 dark:text-white ml-1">
									{itinerary.origin} → {itinerary.destination}
								</span>
							</p>
							<p>
								<span class="text-gray-500 dark:text-gray-400">{$t('itineraries.startDate')}:</span>
								<span class="text-gray-900 dark:text-white ml-1">
									{formatDate(itinerary.startDate)}
								</span>
							</p>
							<p>
								<span class="text-gray-500 dark:text-gray-400">{$t('common.status')}:</span>
								<span class="ml-1">
									<StatusBadge status={itinerary.status} variant="itinerary" size="sm" />
								</span>
							</p>
						</div>
					</Card>
				{/if}

				<!-- Driver Info -->
				{#if driver}
					<Card class="!p-4">
						<h3 class="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<UserOutline class="w-5 h-5" />
							{$t('drivers.driver')}
						</h3>
						<div class="space-y-2 text-sm">
							<p class="text-gray-900 dark:text-white font-medium">
								{driver.firstName} {driver.lastName}
							</p>
							<p class="text-gray-500 dark:text-gray-400">
								{driver.phone}
							</p>
						</div>
					</Card>
				{/if}

				<!-- Notes -->
				{#if advance.notes}
					<Card class="!p-4">
						<h3 class="font-semibold text-gray-900 dark:text-white mb-2">{$t('common.notes')}</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400">{advance.notes}</p>
					</Card>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Approve Modal -->
<Modal bind:open={showApproveModal} size="sm" title={$t('expenses.actions.approve')}>
	<p class="text-gray-500 dark:text-gray-400">
		{$t('expenses.confirmApprove')}
	</p>
	{#snippet footer()}
		<div class="flex gap-2 justify-end w-full">
			<Button color="light" onclick={() => (showApproveModal = false)}>{$t('common.cancel')}</Button>
			<Button color="green" onclick={approveAdvance} disabled={isSubmitting}>
				{#if isSubmitting}
					<Spinner size="4" class="mr-2" />
				{/if}
				{$t('expenses.actions.approve')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Disburse Modal -->
<Modal bind:open={showDisburseModal} size="md" title={$t('expenses.actions.disburse')}>
	<div class="space-y-4">
		<div>
			<Label for="method">{$t('expenses.disbursementMethod')}</Label>
			<Select id="method" items={disbursementOptions} bind:value={disbursementMethod} />
		</div>
		<div>
			<Label for="reference">{$t('expenses.disbursementReference')}</Label>
			<Input id="reference" bind:value={disbursementReference} placeholder={$t('expenses.disbursementReferencePlaceholder')} />
		</div>
	</div>
	{#snippet footer()}
		<div class="flex gap-2 justify-end w-full">
			<Button color="light" onclick={() => (showDisburseModal = false)}>{$t('common.cancel')}</Button>
			<Button color="primary" onclick={disburseAdvance} disabled={isSubmitting}>
				{#if isSubmitting}
					<Spinner size="4" class="mr-2" />
				{/if}
				{$t('expenses.actions.disburse')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Settle Modal -->
<Modal bind:open={showSettleModal} size="lg" title={$t('expenses.actions.settle')}>
	<div class="space-y-4">
		<p class="text-sm text-gray-500 dark:text-gray-400">{$t('expenses.settleInstructions')}</p>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<Label for="actualFuel">{$t('expenses.breakdown.fuel')}</Label>
				<Input id="actualFuel" type="number" bind:value={actualFuel} min="0" step="0.01" />
			</div>
			<div>
				<Label for="actualMeals">{$t('expenses.breakdown.meals')}</Label>
				<Input id="actualMeals" type="number" bind:value={actualMeals} min="0" step="0.01" />
			</div>
			<div>
				<Label for="actualLodging">{$t('expenses.breakdown.lodging')}</Label>
				<Input id="actualLodging" type="number" bind:value={actualLodging} min="0" step="0.01" />
			</div>
			<div>
				<Label for="actualTolls">{$t('expenses.breakdown.tolls')}</Label>
				<Input id="actualTolls" type="number" bind:value={actualTolls} min="0" step="0.01" />
			</div>
			<div>
				<Label for="actualOther">{$t('expenses.breakdown.other')}</Label>
				<Input id="actualOther" type="number" bind:value={actualOther} min="0" step="0.01" />
			</div>
			<div>
				<Label for="receiptsCount">{$t('expenses.receiptsCount')}</Label>
				<Input id="receiptsCount" type="number" bind:value={receiptsCount} min="0" />
			</div>
		</div>

		<!-- Balance Preview -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<div class="flex justify-between mb-2">
				<span class="text-gray-600 dark:text-gray-400">{$t('expenses.advanceGiven')}</span>
				<span class="font-medium">{formatCurrency(advance?.amountHnl ?? 0)}</span>
			</div>
			<div class="flex justify-between mb-2">
				<span class="text-gray-600 dark:text-gray-400">{$t('expenses.actualExpenses')}</span>
				<span class="font-medium">{formatCurrency(actualTotal)}</span>
			</div>
			<div class="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
				<span class="font-semibold">{$t('expenses.balance')}</span>
				<span class="font-bold {balancePreview >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
					{formatCurrency(Math.abs(balancePreview))}
					<span class="text-sm font-normal">
						({balancePreview >= 0 ? $t('expenses.driverOwes') : $t('expenses.companyOwes')})
					</span>
				</span>
			</div>
		</div>

		<div>
			<Label for="settlementNotes">{$t('common.notes')}</Label>
			<Textarea id="settlementNotes" bind:value={settlementNotes} rows={3} />
		</div>
	</div>
	{#snippet footer()}
		<div class="flex gap-2 justify-end w-full">
			<Button color="light" onclick={() => (showSettleModal = false)}>{$t('common.cancel')}</Button>
			<Button color="green" onclick={settleAdvance} disabled={isSubmitting}>
				{#if isSubmitting}
					<Spinner size="4" class="mr-2" />
				{/if}
				{$t('expenses.actions.settle')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Cancel Modal -->
<Modal bind:open={showCancelModal} size="md" title={$t('expenses.actions.cancel')}>
	<div class="space-y-4">
		<p class="text-gray-500 dark:text-gray-400">{$t('expenses.confirmCancel')}</p>
		<div>
			<Label for="cancelReason">{$t('expenses.cancellationReason')}</Label>
			<Textarea id="cancelReason" bind:value={cancelReason} rows={3} />
		</div>
	</div>
	{#snippet footer()}
		<div class="flex gap-2 justify-end w-full">
			<Button color="light" onclick={() => (showCancelModal = false)}>{$t('common.cancel')}</Button>
			<Button color="red" onclick={cancelAdvance} disabled={isSubmitting}>
				{#if isSubmitting}
					<Spinner size="4" class="mr-2" />
				{/if}
				{$t('expenses.actions.cancel')}
			</Button>
		</div>
	{/snippet}
</Modal>
