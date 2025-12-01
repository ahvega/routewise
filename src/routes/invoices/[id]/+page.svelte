<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button, Card, Spinner, Modal, Label, Input, Select, Textarea, Toast } from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		PrinterOutline,
		PaperPlaneSolid,
		CheckCircleSolid,
		CloseCircleSolid,
		PlusOutline,
		TrashBinOutline,
		CashOutline,
		CalendarMonthOutline,
		FileLinesOutline,
		DownloadOutline,
		EnvelopeOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';
	import type { Id } from '$convex/_generated/dataModel';
	import type { InvoicePdfData } from '$lib/services/pdf';

	const client = useConvexClient();

	// Get invoice ID from URL
	const invoiceId = $derived($page.params.id as Id<'invoices'>);

	// Queries
	const invoiceQuery = useQuery(api.invoices.get, () => ({ id: invoiceId }));
	const paymentsQuery = useQuery(api.invoices.getPayments, () => ({ invoiceId }));
	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const itinerariesQuery = useQuery(
		api.itineraries.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query tenant for company info
	const tenantQuery = useQuery(
		api.tenants.get,
		() => (tenantStore.tenantId ? { id: tenantStore.tenantId as Id<'tenants'> } : 'skip')
	);

	const invoice = $derived(invoiceQuery.data);
	const payments = $derived(paymentsQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const itineraries = $derived(itinerariesQuery.data || []);
	const tenant = $derived(tenantQuery.data);
	const isLoading = $derived(invoiceQuery.isLoading);

	// Get related data
	const clientData = $derived(invoice?.clientId ? clients.find((c) => c._id === invoice.clientId) : null);
	const itinerary = $derived(invoice?.itineraryId ? itineraries.find((i) => i._id === invoice.itineraryId) : null);

	// Modals
	let showPaymentModal = $state(false);
	let showStatusModal = $state(false);
	let showDeletePaymentModal = $state(false);
	let selectedPaymentId = $state<Id<'invoicePayments'> | null>(null);

	// Payment form
	let paymentAmount = $state(0);
	let paymentMethod = $state('');
	let paymentReference = $state('');
	let paymentNotes = $state('');
	let paymentDate = $state(new Date().toISOString().split('T')[0]);

	// Toast
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// PDF and Email state
	let isGeneratingPdf = $state(false);
	let isSendingEmail = $state(false);
	let showEmailModal = $state(false);
	let emailRecipient = $state('');

	// Payment methods
	const paymentMethods = [
		{ value: 'cash', name: $t('invoices.paymentMethods.cash') },
		{ value: 'transfer', name: $t('invoices.paymentMethods.transfer') },
		{ value: 'card', name: $t('invoices.paymentMethods.card') },
		{ value: 'check', name: $t('invoices.paymentMethods.check') }
	];

	// Format currency
	function formatCurrency(value: number, currency: 'HNL' | 'USD' = 'HNL'): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	}

	// Format date
	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('es-HN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(new Date(timestamp));
	}

	// Format short date
	function formatShortDate(timestamp: number): string {
		return new Intl.DateTimeFormat('es-HN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(timestamp));
	}

	// Get client display name
	function getClientName(): string {
		if (!clientData) return '-';
		return clientData.type === 'company'
			? clientData.companyName || '-'
			: `${clientData.firstName} ${clientData.lastName}`;
	}

	// Check if invoice is overdue
	function isOverdue(): boolean {
		if (!invoice) return false;
		return invoice.paymentStatus !== 'paid' && invoice.dueDate < Date.now();
	}

	// Open payment modal
	function openPaymentModal() {
		paymentAmount = invoice?.amountDue || 0;
		paymentMethod = 'transfer';
		paymentReference = '';
		paymentNotes = '';
		paymentDate = new Date().toISOString().split('T')[0];
		showPaymentModal = true;
	}

	// Record payment
	async function recordPayment() {
		if (!invoice || paymentAmount <= 0) return;

		try {
			await client.mutation(api.invoices.recordPayment, {
				invoiceId: invoice._id,
				amount: paymentAmount,
				paymentMethod: paymentMethod || undefined,
				referenceNumber: paymentReference || undefined,
				paymentDate: new Date(paymentDate).getTime(),
				notes: paymentNotes || undefined
			});

			showPaymentModal = false;
			toastMessage = $t('invoices.paymentRecorded');
			toastType = 'success';
			showToast = true;
		} catch (err) {
			toastMessage = $t('common.error');
			toastType = 'error';
			showToast = true;
		}
	}

	// Delete payment
	async function deletePayment() {
		if (!selectedPaymentId) return;

		try {
			await client.mutation(api.invoices.deletePayment, {
				paymentId: selectedPaymentId
			});

			showDeletePaymentModal = false;
			selectedPaymentId = null;
			toastMessage = $t('invoices.paymentDeleted');
			toastType = 'success';
			showToast = true;
		} catch (err) {
			toastMessage = $t('common.error');
			toastType = 'error';
			showToast = true;
		}
	}

	// Update invoice status
	async function updateStatus(status: string) {
		if (!invoice) return;

		try {
			await client.mutation(api.invoices.updateStatus, {
				id: invoice._id,
				status
			});

			toastMessage = $t('common.saved');
			toastType = 'success';
			showToast = true;
		} catch (err) {
			toastMessage = $t('common.error');
			toastType = 'error';
			showToast = true;
		}
	}

	// Get payment method display name
	function getPaymentMethodName(method: string | undefined): string {
		if (!method) return '-';
		const found = paymentMethods.find((m) => m.value === method);
		return found?.name || method;
	}

	// Build PDF data
	function buildPdfData(): InvoicePdfData | null {
		if (!invoice || !tenant) return null;

		return {
			invoiceNumber: invoice.invoiceNumber,
			date: invoice.invoiceDate.toString(), // Pass timestamp as string
			dueDate: invoice.dueDate.toString(), // Pass timestamp as string
			client: {
				name: getClientName(),
				rtn: clientData?.taxId || undefined,
				email: clientData?.email || undefined,
				phone: clientData?.phone || undefined,
				address: clientData?.address || undefined
			},
			items: [
				{
					description: invoice.description,
					quantity: 1,
					unitPrice: invoice.subtotalHnl,
					total: invoice.subtotalHnl
				}
			],
			subtotal: invoice.subtotalHnl,
			tax: invoice.taxAmountHnl,
			taxRate: invoice.taxPercentage,
			total: invoice.totalHnl,
			totalUsd: invoice.totalUsd || 0,
			amountPaid: invoice.amountPaid,
			amountDue: invoice.amountDue,
			company: {
				name: tenant.companyName,
				rtn: undefined, // TODO: Add company RTN to tenant
				phone: tenant.primaryContactPhone || undefined,
				email: tenant.primaryContactEmail || undefined,
				address: tenant.address || undefined
			},
			notes: invoice.notes,
			paymentInstructions: invoice.paymentInstructions
		};
	}

	// Download PDF
	async function downloadPdf() {
		const pdfData = buildPdfData();
		if (!pdfData) {
			toastMessage = $t('errors.unknown');
			toastType = 'error';
			showToast = true;
			return;
		}

		isGeneratingPdf = true;
		try {
			const response = await fetch('/api/pdf/invoice', {
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
			link.download = `factura-${invoice!.invoiceNumber}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toastMessage = $t('common.downloadComplete');
			toastType = 'success';
			showToast = true;
		} catch (error) {
			console.error('PDF generation error:', error);
			toastMessage = $t('errors.unknown');
			toastType = 'error';
			showToast = true;
		} finally {
			isGeneratingPdf = false;
		}
	}

	// Open email modal
	function openEmailModal() {
		emailRecipient = clientData?.email || '';
		showEmailModal = true;
	}

	// Send invoice email
	async function sendInvoiceEmail() {
		if (!emailRecipient || !invoice || !tenant) return;

		isSendingEmail = true;
		try {
			// First generate the PDF
			const pdfData = buildPdfData();
			if (!pdfData) throw new Error('Missing PDF data');

			const pdfResponse = await fetch('/api/pdf/invoice', {
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
					type: 'invoice',
					to: emailRecipient,
					data: {
						recipientName: getClientName(),
						invoiceNumber: invoice.invoiceNumber,
						totalAmount: formatCurrency(invoice.totalHnl),
						dueDate: formatDate(invoice.dueDate),
						companyName: tenant.companyName,
						companyPhone: tenant.primaryContactPhone,
						companyEmail: tenant.primaryContactEmail,
						paymentInstructions: invoice.paymentInstructions
					},
					pdfBase64
				})
			});

			if (!emailResponse.ok) {
				const error = await emailResponse.json();
				throw new Error(error.message || 'Failed to send email');
			}

			showEmailModal = false;
			toastMessage = $t('common.emailSent');
			toastType = 'success';
			showToast = true;

			// Update status to sent if still draft
			if (invoice.status === 'draft') {
				await updateStatus('sent');
			}
		} catch (error) {
			console.error('Email send error:', error);
			toastMessage = $t('errors.unknown');
			toastType = 'error';
			showToast = true;
		} finally {
			isSendingEmail = false;
		}
	}
</script>

<svelte:head>
	<title>{invoice?.invoiceNumber || $t('invoices.title')} - RouteWise</title>
</svelte:head>

{#if isLoading}
	<div class="flex justify-center py-12">
		<Spinner size="8" />
	</div>
{:else if !invoice}
	<Card class="max-w-none !p-8 text-center">
		<p class="text-gray-500 dark:text-gray-400">{$t('invoices.notFound')}</p>
		<Button href="/invoices" class="mt-4">
			<ArrowLeftOutline class="w-4 h-4 mr-2" />
			{$t('common.back')}
		</Button>
	</Card>
{:else}
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
			<div class="flex items-center gap-4">
				<Button href="/invoices" color="light" size="sm">
					<ArrowLeftOutline class="w-4 h-4" />
				</Button>
				<div>
					<div class="flex items-center gap-3">
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{invoice.invoiceNumber}</h1>
						<StatusBadge status={invoice.status} variant="invoice" />
						<StatusBadge status={isOverdue() ? 'overdue' : invoice.paymentStatus} variant="payment" />
					</div>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{$t('invoices.createdOn')} {formatDate(invoice.createdAt)}
					</p>
				</div>
			</div>
			<div class="flex gap-2 flex-wrap">
				<!-- PDF and Email buttons -->
				<Button size="sm" color="light" onclick={downloadPdf} disabled={isGeneratingPdf || !tenant}>
					{#if isGeneratingPdf}
						<Spinner size="4" class="mr-2" />
					{:else}
						<DownloadOutline class="w-4 h-4 mr-2" />
					{/if}
					PDF
				</Button>
				<Button size="sm" color="light" onclick={openEmailModal} disabled={!tenant}>
					<EnvelopeOutline class="w-4 h-4 mr-2" />
					{$t('common.email')}
				</Button>

				{#if invoice.status === 'draft'}
					<Button color="blue" onclick={() => updateStatus('sent')}>
						<PaperPlaneSolid class="w-4 h-4 mr-2" />
						{$t('invoices.actions.send')}
					</Button>
				{/if}
				{#if invoice.paymentStatus !== 'paid'}
					<Button color="green" onclick={openPaymentModal}>
						<CashOutline class="w-4 h-4 mr-2" />
						{$t('invoices.actions.recordPayment')}
					</Button>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Invoice Details Card -->
				<Card class="max-w-none !p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('invoices.details')}</h3>

					<!-- Client Info -->
					<div class="grid grid-cols-2 gap-6 mb-6">
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('invoices.billTo')}</p>
							<p class="font-semibold text-gray-900 dark:text-white">{getClientName()}</p>
							{#if clientData?.email}
								<p class="text-sm text-gray-600 dark:text-gray-400">{clientData.email}</p>
							{/if}
							{#if clientData?.phone}
								<p class="text-sm text-gray-600 dark:text-gray-400">{clientData.phone}</p>
							{/if}
							{#if clientData?.taxId}
								<p class="text-sm text-gray-600 dark:text-gray-400">RTN: {clientData.taxId}</p>
							{/if}
						</div>
						<div class="text-right">
							<div class="mb-2">
								<p class="text-sm text-gray-500 dark:text-gray-400">{$t('invoices.columns.date')}</p>
								<p class="font-semibold text-gray-900 dark:text-white">{formatDate(invoice.invoiceDate)}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">{$t('invoices.columns.dueDate')}</p>
								<p class="font-semibold" class:text-rose-600={isOverdue()} class:dark:text-rose-400={isOverdue()} class:text-gray-900={!isOverdue()} class:dark:text-white={!isOverdue()}>
									{formatDate(invoice.dueDate)}
								</p>
							</div>
						</div>
					</div>

					<!-- Description -->
					<div class="border-t border-gray-200 dark:border-gray-700 pt-4">
						<table class="w-full">
							<thead>
								<tr class="text-left text-sm text-gray-500 dark:text-gray-400">
									<th class="pb-2">{$t('invoices.description')}</th>
									<th class="pb-2 text-right">{$t('invoices.amount')}</th>
								</tr>
							</thead>
							<tbody class="text-gray-900 dark:text-white">
								<tr>
									<td class="py-2">{invoice.description}</td>
									<td class="py-2 text-right">{formatCurrency(invoice.subtotalHnl)}</td>
								</tr>
								{#if invoice.additionalCharges && invoice.additionalCharges.length > 0}
									{#each invoice.additionalCharges as charge}
										<tr>
											<td class="py-2 text-sm">{charge.description}</td>
											<td class="py-2 text-right text-sm">{formatCurrency(charge.amount)}</td>
										</tr>
									{/each}
								{/if}
								{#if invoice.discounts && invoice.discounts.length > 0}
									{#each invoice.discounts as discount}
										<tr>
											<td class="py-2 text-sm text-emerald-600 dark:text-emerald-400">{discount.description}</td>
											<td class="py-2 text-right text-sm text-emerald-600 dark:text-emerald-400">-{formatCurrency(discount.amount)}</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>

					<!-- Totals -->
					<div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
						<div class="flex justify-between py-1">
							<span class="text-gray-600 dark:text-gray-400">{$t('invoices.subtotal')}</span>
							<span class="text-gray-900 dark:text-white">{formatCurrency(invoice.subtotalHnl)}</span>
						</div>
						<div class="flex justify-between py-1">
							<span class="text-gray-600 dark:text-gray-400">ISV ({invoice.taxPercentage}%)</span>
							<span class="text-gray-900 dark:text-white">{formatCurrency(invoice.taxAmountHnl)}</span>
						</div>
						<div class="flex justify-between py-2 text-lg font-bold border-t border-gray-200 dark:border-gray-700 mt-2">
							<span class="text-gray-900 dark:text-white">{$t('invoices.total')}</span>
							<span class="text-gray-900 dark:text-white">{formatCurrency(invoice.totalHnl)}</span>
						</div>
						{#if invoice.totalUsd}
							<div class="flex justify-between py-1 text-sm text-gray-500 dark:text-gray-400">
								<span>{$t('invoices.totalUsd')}</span>
								<span>{formatCurrency(invoice.totalUsd, 'USD')}</span>
							</div>
						{/if}
					</div>

					<!-- Payment Summary -->
					<div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
						<div class="flex justify-between py-1">
							<span class="text-gray-600 dark:text-gray-400">{$t('invoices.amountPaid')}</span>
							<span class="text-emerald-600 dark:text-emerald-400">{formatCurrency(invoice.amountPaid)}</span>
						</div>
						<div class="flex justify-between py-1 font-semibold">
							<span class="text-gray-900 dark:text-white">{$t('invoices.amountDue')}</span>
							<span class:text-rose-600={invoice.amountDue > 0} class:dark:text-rose-400={invoice.amountDue > 0} class:text-emerald-600={invoice.amountDue <= 0} class:dark:text-emerald-400={invoice.amountDue <= 0}>
								{formatCurrency(invoice.amountDue)}
							</span>
						</div>
					</div>
				</Card>

				<!-- Payments History -->
				<Card class="max-w-none !p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('invoices.paymentHistory')}</h3>
						{#if invoice.paymentStatus !== 'paid'}
							<Button size="xs" color="light" onclick={openPaymentModal}>
								<PlusOutline class="w-4 h-4 mr-1" />
								{$t('invoices.actions.addPayment')}
							</Button>
						{/if}
					</div>

					{#if payments.length === 0}
						<p class="text-gray-500 dark:text-gray-400 text-center py-4">{$t('invoices.noPayments')}</p>
					{:else}
						<div class="space-y-3">
							{#each payments as payment}
								<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
									<div class="flex items-center gap-3">
										<div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
											<CashOutline class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
										</div>
										<div>
											<p class="font-medium text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
											<p class="text-sm text-gray-500 dark:text-gray-400">
												{formatShortDate(payment.paymentDate)} - {getPaymentMethodName(payment.paymentMethod)}
												{#if payment.referenceNumber}
													<span class="ml-2 text-gray-400">#{payment.referenceNumber}</span>
												{/if}
											</p>
										</div>
									</div>
									<Button
										size="xs"
										color="light"
										onclick={() => {
											selectedPaymentId = payment._id;
											showDeletePaymentModal = true;
										}}
									>
										<TrashBinOutline class="w-4 h-4 text-rose-500" />
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</Card>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Quick Info -->
				<Card class="max-w-none !p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('common.information')}</h3>
					<div class="space-y-4">
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">{$t('invoices.exchangeRate')}</p>
							<p class="font-medium text-gray-900 dark:text-white">1 USD = {invoice.exchangeRateUsed.toFixed(2)} HNL</p>
						</div>
						{#if itinerary}
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">{$t('invoices.linkedItinerary')}</p>
								<Button href="/itineraries/{itinerary._id}" size="xs" color="light" class="mt-1">
									<FileLinesOutline class="w-4 h-4 mr-1" />
									{itinerary.itineraryNumber}
								</Button>
							</div>
						{/if}
						{#if invoice.notes}
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">{$t('common.notes')}</p>
								<p class="text-gray-900 dark:text-white">{invoice.notes}</p>
							</div>
						{/if}
					</div>
				</Card>

				<!-- Actions -->
				<Card class="max-w-none !p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('common.actions')}</h3>
					<div class="space-y-2">
						{#if invoice.status === 'draft'}
							<Button color="blue" class="w-full" onclick={() => updateStatus('sent')}>
								<PaperPlaneSolid class="w-4 h-4 mr-2" />
								{$t('invoices.actions.markSent')}
							</Button>
						{/if}
						{#if invoice.status !== 'cancelled' && invoice.status !== 'paid'}
							<Button color="light" class="w-full" onclick={() => updateStatus('cancelled')}>
								<CloseCircleSolid class="w-4 h-4 mr-2" />
								{$t('invoices.actions.cancel')}
							</Button>
						{/if}
					</div>
				</Card>
			</div>
		</div>
	</div>
{/if}

<!-- Record Payment Modal -->
<Modal bind:open={showPaymentModal} size="md" title={$t('invoices.recordPayment')}>
	<div class="grid grid-cols-2 gap-4">
		<div>
			<Label for="paymentAmount">{$t('invoices.paymentAmount')}</Label>
			<Input
				id="paymentAmount"
				type="number"
				step="0.01"
				bind:value={paymentAmount}
				placeholder="0.00"
			/>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
				{$t('invoices.amountDue')}: {formatCurrency(invoice?.amountDue || 0)}
			</p>
		</div>
		<div>
			<Label for="paymentDate">{$t('invoices.paymentDate')}</Label>
			<Input id="paymentDate" type="date" bind:value={paymentDate} />
		</div>
		<div>
			<Label for="paymentMethod">{$t('invoices.paymentMethod')}</Label>
			<Select id="paymentMethod" items={paymentMethods} bind:value={paymentMethod} />
		</div>
		<div>
			<Label for="paymentReference">{$t('invoices.reference')}</Label>
			<Input id="paymentReference" bind:value={paymentReference} placeholder={$t('invoices.referencePlaceholder')} />
		</div>
		<div class="col-span-2">
			<Label for="paymentNotes">{$t('common.notes')}</Label>
			<Textarea id="paymentNotes" bind:value={paymentNotes} rows={2} class="w-full" />
		</div>
	</div>
	{#snippet footer()}
		<div class="flex gap-2 justify-end w-full">
			<Button color="light" onclick={() => (showPaymentModal = false)}>{$t('common.cancel')}</Button>
			<Button color="green" onclick={recordPayment} disabled={paymentAmount <= 0}>
				<CheckCircleSolid class="w-4 h-4 mr-2" />
				{$t('invoices.actions.recordPayment')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Delete Payment Confirmation -->
<Modal bind:open={showDeletePaymentModal} size="sm" title={$t('invoices.deletePayment')}>
	<p class="text-gray-500 dark:text-gray-400">{$t('invoices.deletePaymentConfirm')}</p>
	{#snippet footer()}
		<div class="flex gap-2 justify-end w-full">
			<Button color="light" onclick={() => (showDeletePaymentModal = false)}>{$t('common.cancel')}</Button>
			<Button color="red" onclick={deletePayment}>
				<TrashBinOutline class="w-4 h-4 mr-2" />
				{$t('common.delete')}
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Email Modal -->
<Modal bind:open={showEmailModal} title={$t('common.sendEmail')} size="md">
	<div class="space-y-4">
		<p class="text-gray-600 dark:text-gray-400">
			{$t('invoices.emailDescription')}
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

		{#if invoice}
			<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{$t('quotations.emailPreview')}:</p>
				<p class="font-medium text-gray-900 dark:text-white">
					{$t('invoices.title')} {invoice.invoiceNumber}
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{getClientName()}
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					{$t('invoices.total')}: {formatCurrency(invoice.totalHnl)}
				</p>
			</div>
		{/if}
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showEmailModal = false)} disabled={isSendingEmail}>
				{$t('common.cancel')}
			</Button>
			<Button onclick={sendInvoiceEmail} disabled={!emailRecipient || isSendingEmail}>
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

<!-- Toast Notifications -->
{#if showToast}
	<Toast
		color={toastType === 'success' ? 'green' : 'red'}
		position="top-right"
		class="fixed top-4 right-4 z-50"
		onclose={() => (showToast = false)}
	>
		{toastMessage}
	</Toast>
{/if}
