<script lang="ts">
	import { Button, Card, Spinner, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Select, Input } from 'flowbite-svelte';
	import { PlusOutline, SearchOutline, EyeOutline } from 'flowbite-svelte-icons';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';
	import type { Id } from '$convex/_generated/dataModel';

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
				if (
					!inv.invoiceNumber.toLowerCase().includes(term) &&
					!clientName.includes(term) &&
					!inv.description.toLowerCase().includes(term)
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
		{ value: '', name: $t('common.all') },
		{ value: 'draft', name: $t('invoices.statuses.draft') },
		{ value: 'sent', name: $t('invoices.statuses.sent') },
		{ value: 'paid', name: $t('invoices.statuses.paid') },
		{ value: 'cancelled', name: $t('invoices.statuses.cancelled') }
	];

	const paymentStatusOptions = [
		{ value: '', name: $t('common.all') },
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
			<Card class="max-w-none !p-4">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.total')}</p>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
			</Card>
			<Card class="max-w-none !p-4">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.unpaid')}</p>
				<p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.unpaid}</p>
			</Card>
			<Card class="max-w-none !p-4">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.overdue')}</p>
				<p class="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.overdue}</p>
			</Card>
			<Card class="max-w-none !p-4">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('invoices.stats.receivables')}</p>
				<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.totalReceivables)}</p>
			</Card>
		</div>

		<!-- Filters -->
		<Card class="max-w-none !p-4">
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
			<Card class="max-w-none !p-8 text-center">
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
			<Card class="max-w-none !p-0 overflow-hidden">
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
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{#each filteredInvoices as invoice}
							<TableBodyRow>
								<TableBodyCell class="font-medium">{invoice.invoiceNumber}</TableBodyCell>
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
								<TableBodyCell>
									<Button href="/invoices/{invoice._id}" size="xs" color="light">
										<EyeOutline class="w-4 h-4" />
									</Button>
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</Card>
		{/if}
	{/if}
</div>
