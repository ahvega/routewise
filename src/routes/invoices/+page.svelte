<script lang="ts">
	import { Card, Spinner, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Select, Input, Toast } from 'flowbite-svelte';
	import {
		SearchOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		FilePdfOutline,
		EnvelopeOutline,
		CashOutline,
		FilterOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import {
		StatusBadge,
		ActionMenu,
		createViewAction,
		createCallAction,
		createEmailAction,
		createWhatsAppAction,
		createDeleteAction,
		filterActions,
		type ActionItem
	} from '$lib/components/ui';
	import { t } from '$lib/i18n';
	import type { Id } from '$convex/_generated/dataModel';

	const client = useConvexClient();

	// Queries
	const invoicesQuery = useQuery(
		api.invoices.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const invoices = $derived(invoicesQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const isLoading = $derived(invoicesQuery.isLoading || clientsQuery.isLoading);

	// Filters
	let searchTerm = $state('');
	let statusFilter = $state('');
	let paymentStatusFilter = $state('');

	// Get client name
	function getClientName(clientId: Id<'clients'> | undefined): string {
		if (!clientId) return '-';
		const client = clients.find((c) => c._id === clientId);
		if (!client) return '-';
		return client.type === 'company' ? client.companyName || '-' : `${client.firstName} ${client.lastName}`;
	}

	// Get client code
	function getClientCode(clientId: Id<'clients'> | undefined): string {
		if (!clientId) return '';
		const client = clients.find((c) => c._id === clientId);
		return client?.clientCode || '';
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

	// Format date
	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('es-HN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(timestamp));
	}

	// Check if invoice is overdue
	function isOverdue(invoice: (typeof invoices)[0]): boolean {
		return invoice.paymentStatus !== 'paid' && invoice.dueDate < Date.now();
	}

	// Filtered invoices
	const filteredInvoices = $derived(
		invoices.filter((inv) => {
			// Search filter
			if (searchTerm) {
				const term = searchTerm.toLowerCase();
				const clientName = getClientName(inv.clientId).toLowerCase();
				const clientCode = getClientCode(inv.clientId).toLowerCase();
				if (
					!inv.invoiceNumber.toLowerCase().includes(term) &&
					!(inv.invoiceLongName && inv.invoiceLongName.toLowerCase().includes(term)) &&
					!clientName.includes(term) &&
					!clientCode.includes(term) &&
					!inv.description.toLowerCase().includes(term) &&
					!(inv.serviceDescription && inv.serviceDescription.toLowerCase().includes(term))
				) {
					return false;
				}
			}

			// Status filter
			if (statusFilter && inv.status !== statusFilter) return false;

			// Payment status filter
			if (paymentStatusFilter) {
				if (paymentStatusFilter === 'overdue') {
					if (!isOverdue(inv)) return false;
				} else if (inv.paymentStatus !== paymentStatusFilter) {
					return false;
				}
			}

			return true;
		})
	);

	// Status options
	const statusOptions = [
		{ value: '', name: $t('invoices.filterByStatus') },
		{ value: 'draft', name: $t('invoices.statuses.draft') },
		{ value: 'sent', name: $t('invoices.statuses.sent') },
		{ value: 'paid', name: $t('invoices.statuses.paid') },
		{ value: 'cancelled', name: $t('invoices.statuses.cancelled') }
	];

	const paymentStatusOptions = [
		{ value: '', name: $t('invoices.filterByPayment') },
		{ value: 'unpaid', name: $t('invoices.paymentStatuses.unpaid') },
		{ value: 'partial', name: $t('invoices.paymentStatuses.partial') },
		{ value: 'paid', name: $t('invoices.paymentStatuses.paid') },
		{ value: 'overdue', name: $t('invoices.paymentStatuses.overdue') }
	];

	// Stats
	const stats = $derived({
		total: invoices.length,
		unpaid: invoices.filter((i) => i.paymentStatus === 'unpaid' || i.paymentStatus === 'partial').length,
		overdue: invoices.filter((i) => isOverdue(i)).length,
		totalReceivables: invoices
			.filter((i) => i.paymentStatus !== 'paid')
			.reduce((sum, i) => sum + i.amountDue, 0)
	});

	// Filter by card click
	function filterByStatus(status: string, paymentStatus: string = '') {
		statusFilter = status;
		paymentStatusFilter = paymentStatus;
		searchTerm = '';
	}

	function clearFilters() {
		statusFilter = '';
		paymentStatusFilter = '';
		searchTerm = '';
	}

	// Check if a specific filter is active
	const activeFilter = $derived(
		paymentStatusFilter === 'overdue' ? 'overdue' :
		paymentStatusFilter === 'unpaid' ? 'unpaid' :
		statusFilter || paymentStatusFilter || ''
	);

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	// Get client contact info
	function getClientContact(clientId: Id<'clients'> | undefined): { phone?: string; email?: string } {
		if (!clientId) return {};
		const clientData = clients.find((c) => c._id === clientId);
		if (!clientData) return {};
		return {
			phone: clientData.phone || undefined,
			email: clientData.email || undefined
		};
	}

	// Status update functions
	async function updateStatus(id: Id<'invoices'>, status: string) {
		try {
			await client.mutation(api.invoices.updateStatus, { id, status });
			showToastMessage($t('invoices.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to update status:', error);
			showToastMessage($t('invoices.updateFailed'), 'error');
		}
	}

	async function markAsPaid(id: Id<'invoices'>) {
		try {
			await client.mutation(api.invoices.updateStatus, { id, status: 'paid' });
			showToastMessage($t('invoices.markedAsPaid'), 'success');
		} catch (error) {
			console.error('Failed to mark as paid:', error);
			showToastMessage($t('invoices.updateFailed'), 'error');
		}
	}

	async function handleDelete(id: Id<'invoices'>) {
		if (!confirm($t('invoices.deleteConfirm'))) return;

		try {
			await client.mutation(api.invoices.remove, { id });
			showToastMessage($t('invoices.deleteSuccess'), 'success');
		} catch (error) {
			console.error('Failed to delete invoice:', error);
			showToastMessage($t('invoices.deleteFailed'), 'error');
		}
	}

	// Build actions for an invoice row
	function getInvoiceActions(invoice: typeof invoices[0]): ActionItem[] {
		const contact = getClientContact(invoice.clientId);

		return filterActions([
			// View action
			createViewAction(`/invoices/${invoice._id}`, $t('invoices.viewInvoice')),

			// Contact actions (with divider)
			contact.phone
				? { ...createCallAction(contact.phone, $t('common.callClient'))!, dividerBefore: true }
				: null,
			createWhatsAppAction(contact.phone, $t('common.chatClient')),
			createEmailAction(contact.email, $t('common.emailClient')),

			// PDF/Email actions (with divider)
			{
				id: 'pdf',
				label: $t('common.downloadPdf'),
				icon: FilePdfOutline as any,
				href: `/invoices/${invoice._id}?pdf=true`,
				dividerBefore: true
			},
			contact.email ? {
				id: 'sendEmail',
				label: $t('invoices.actions.sendViaEmail'),
				icon: EnvelopeOutline as any,
				onClick: () => console.log('Send email to:', contact.email)
			} : null,

			!['cancelled', 'void'].includes(invoice.status) ? {
				id: 'recordPayment',
				label: $t('invoices.actions.recordPayment'),
				icon: CashOutline as any,
				href: invoice.paymentStatus !== 'paid' ? `/invoices/${invoice._id}?action=recordPayment` : undefined,
				disabled: invoice.paymentStatus === 'paid',
				dividerBefore: true
			} : null,

			// Delete action (only for draft)
			invoice.status === 'draft'
				? createDeleteAction(() => handleDelete(invoice._id), false, $t('common.delete'))
				: null
		]);
	}
</script>

<svelte:head>
	<title>{$t('invoices.title')} - RouteWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$t('invoices.title')}</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400">{$t('invoices.subtitle')}</p>
		</div>
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else}
		<!-- Stats Cards -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card class="max-w-none p-4! {activeFilter === '' ? 'ring-2 ring-primary-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.total')}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
					</div>
					<button
						onclick={() => clearFilters()}
						class="p-1.5 rounded-lg transition-colors {activeFilter === '' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.clearFilters')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4! {activeFilter === 'unpaid' ? 'ring-2 ring-amber-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.unpaid')}</p>
						<p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.unpaid}</p>
					</div>
					<button
						onclick={() => filterByStatus('', 'unpaid')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'unpaid' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4! {activeFilter === 'overdue' ? 'ring-2 ring-rose-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.overdue')}</p>
						<p class="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.overdue}</p>
					</div>
					<button
						onclick={() => filterByStatus('', 'overdue')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'overdue' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4!">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.receivables')}</p>
						<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.totalReceivables)}</p>
					</div>
				</div>
			</Card>
		</div>

		<!-- Filters -->
		<Card class="max-w-none p-4!">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="relative">
					<Input
						placeholder={$t('invoices.searchPlaceholder')}
						bind:value={searchTerm}
						class="pl-10"
					/>
					<SearchOutline class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
				</div>
				<Select items={statusOptions} bind:value={statusFilter} placeholder={$t('invoices.filterByStatus')} />
				<Select items={paymentStatusOptions} bind:value={paymentStatusFilter} placeholder={$t('invoices.filterByPayment')} />
			</div>
		</Card>

		<!-- Invoices Table -->
		{#if filteredInvoices.length === 0}
			<Card class="max-w-none p-8! text-center">
				<p class="text-gray-500 dark:text-gray-400">
					{searchTerm || statusFilter || paymentStatusFilter
						? $t('invoices.noResults')
						: $t('invoices.empty')}
				</p>
				<p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
					{$t('invoices.emptyHint')}
				</p>
			</Card>
		{:else}
			<Card class="max-w-none p-0! overflow-hidden">
				<Table hoverable striped>
					<TableHead>
						<TableHeadCell>{$t('invoices.columns.number')}</TableHeadCell>
						<TableHeadCell>{$t('invoices.columns.client')}</TableHeadCell>
						<TableHeadCell>{$t('invoices.columns.date')}</TableHeadCell>
						<TableHeadCell>{$t('invoices.columns.dueDate')}</TableHeadCell>
						<TableHeadCell class="text-right">{$t('invoices.columns.total')}</TableHeadCell>
						<TableHeadCell class="text-right">{$t('invoices.columns.balance')}</TableHeadCell>
						<TableHeadCell>{$t('invoices.columns.status')}</TableHeadCell>
						<TableHeadCell>{$t('invoices.columns.payment')}</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each filteredInvoices as invoice}
							<TableBodyRow>
								<TableBodyCell>
									<div class="flex items-center justify-between gap-2">
										<span class="font-medium">{invoice.invoiceNumber}</span>
										<ActionMenu
											triggerId="actions-{invoice._id}"
											actions={getInvoiceActions(invoice)}
										/>
									</div>
								</TableBodyCell>
								<TableBodyCell>{getClientName(invoice.clientId)}</TableBodyCell>
								<TableBodyCell>{formatDate(invoice.invoiceDate)}</TableBodyCell>
								<TableBodyCell class={isOverdue(invoice) ? 'text-rose-600 dark:text-rose-400' : ''}>
									{formatDate(invoice.dueDate)}
								</TableBodyCell>
								<TableBodyCell class="text-right font-medium">{formatCurrency(invoice.totalHnl)}</TableBodyCell>
								<TableBodyCell class="text-right font-medium">
									{#if invoice.amountDue > 0}
										<span class="text-amber-600 dark:text-amber-400">{formatCurrency(invoice.amountDue)}</span>
									{:else}
										<span class="text-emerald-600 dark:text-emerald-400">{formatCurrency(0)}</span>
									{/if}
								</TableBodyCell>
								<TableBodyCell>
									<StatusBadge status={invoice.status} variant="invoice" />
								</TableBodyCell>
								<TableBodyCell>
									<StatusBadge status={isOverdue(invoice) ? 'overdue' : invoice.paymentStatus} variant="payment" />
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</Card>
		{/if}
	{/if}
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
