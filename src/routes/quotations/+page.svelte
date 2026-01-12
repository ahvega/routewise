<script lang="ts">
	import { Button, Card, TableBodyCell, Spinner, Toast } from 'flowbite-svelte';
	import { PlusOutline, CheckCircleOutline, CloseCircleOutline, FilterOutline } from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import {
		StatusBadge,
		DataTable,
		ActionMenu,
		type Column,
		createViewAction,
		createCallAction,
		createEmailAction,
		createDeleteAction,
		filterActions,
		type ActionItem
	} from '$lib/components/ui';
	import {
		PaperPlaneOutline,
		FilePdfOutline
	} from 'flowbite-svelte-icons';
	import type { Id } from '$convex/_generated/dataModel';
	import { t } from '$lib/i18n';

	const client = useConvexClient();

	// Query quotations when tenant is available
	const quotationsQuery = useQuery(
		api.quotations.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query clients for display names
	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	const quotations = $derived(quotationsQuery.data || []);
	const clients = $derived(clientsQuery.data || []);
	const isLoading = $derived(quotationsQuery.isLoading);

	// Status filter state
	let statusFilter = $state('');

	// Table columns configuration (reactive for i18n)
	// Note: Actions column removed - kebab menu is now in first column
	const columns = $derived<Column<any>[]>([
		{
			key: 'quotationNumber',
			label: $t('quotations.columns.quotation'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('quotations.filters.searchPlaceholder')
		},
		{
			key: 'origin',
			label: $t('quotations.columns.route'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('quotations.filters.searchPlaceholder')
		},
		{
			key: 'salePriceHnl',
			label: $t('quotations.columns.total'),
			sortable: true
		},
		{
			key: 'selectedMarkupPercentage',
			label: $t('quotations.new.margin'),
			sortable: true
		},
		{
			key: 'status',
			label: $t('quotations.columns.status'),
			sortable: true,
			filterOptions: ['draft', 'sent', 'approved', 'rejected', 'expired'],
			filterPlaceholder: $t('quotations.filters.statusPlaceholder')
		},
		{
			key: 'createdAt',
			label: $t('quotations.columns.date'),
			sortable: true,
			sortFn: (a, b, dir) => dir === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
		}
	]);

	function getClientName(clientId: Id<'clients'> | undefined): string {
		if (!clientId) return 'Walk-in';
		const clientData = clients.find((c) => c._id === clientId);
		if (!clientData) return 'Unknown';
		if (clientData.type === 'company') {
			return clientData.companyName || 'Unnamed Company';
		}
		return [clientData.firstName, clientData.lastName].filter(Boolean).join(' ') || 'Unnamed';
	}

	// Get client contact info for Call/Email actions
	function getClientContact(clientId: Id<'clients'> | undefined): { phone?: string; email?: string } {
		if (!clientId) return {};
		const clientData = clients.find((c) => c._id === clientId);
		if (!clientData) return {};
		return {
			phone: clientData.phone || undefined,
			email: clientData.email || undefined
		};
	}

	// Build actions for a quotation row
	function getQuotationActions(quote: typeof quotations[0]): ActionItem[] {
		const contact = getClientContact(quote.clientId);

		return filterActions([
			// View action
			createViewAction(`/quotations/${quote._id}`, $t('quotations.viewQuotation')),

			// Contact actions (with divider)
			contact.phone ? { ...createCallAction(contact.phone, $t('common.callClient'))!, dividerBefore: true } : null,
			createEmailAction(contact.email, $t('common.emailClient')),

			// Status actions (with divider)
			quote.status === 'draft' ? {
				id: 'send',
				label: $t('common.sent'),
				icon: PaperPlaneOutline,
				onClick: () => updateStatus(quote._id, 'sent'),
				dividerBefore: true
			} : null,
			quote.status === 'sent' ? {
				id: 'approve',
				label: $t('common.accepted'),
				icon: CheckCircleOutline,
				onClick: () => updateStatus(quote._id, 'approved'),
				color: 'success' as const,
				dividerBefore: true
			} : null,
			quote.status === 'sent' ? {
				id: 'reject',
				label: $t('common.rejected'),
				icon: CloseCircleOutline,
				onClick: () => updateStatus(quote._id, 'rejected'),
				color: 'warning' as const
			} : null,

			// Delete action (always last, with divider)
			createDeleteAction(() => handleDelete(quote._id), false, $t('common.delete'))
		]);
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
			month: 'short',
			day: 'numeric'
		});
	}

	async function updateStatus(id: Id<'quotations'>, status: string) {
		try {
			await client.mutation(api.quotations.updateStatus, { id, status });
			showToastMessage($t('quotations.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to update status:', error);
			showToastMessage($t('quotations.saveFailed'), 'error');
		}
	}

	async function handleDelete(id: Id<'quotations'>) {
		if (!confirm($t('quotations.deleteConfirm'))) return;

		try {
			await client.mutation(api.quotations.remove, { id });
			showToastMessage($t('quotations.deleteSuccess'), 'success');
		} catch (error) {
			console.error('Failed to delete quotation:', error);
			showToastMessage($t('quotations.deleteFailed'), 'error');
		}
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	// Stats
	const stats = $derived({
		total: quotations.length,
		draft: quotations.filter((q) => q.status === 'draft').length,
		sent: quotations.filter((q) => q.status === 'sent').length,
		approved: quotations.filter((q) => q.status === 'approved').length
	});

	// Filter by card click
	function filterByStatus(status: string) {
		statusFilter = status;
	}

	function clearFilters() {
		statusFilter = '';
	}

	// Active filter indicator
	const activeFilter = $derived(statusFilter);

	// Pre-filtered quotations for DataTable
	const filteredQuotations = $derived(
		statusFilter
			? quotations.filter((q) => q.status === statusFilter)
			: quotations
	);
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('quotations.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('quotations.subtitle', { values: { count: stats.total } })}
			</p>
		</div>
		<Button href="/quotations/new">
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('quotations.newQuotation')}
		</Button>
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
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('common.all')}</p>
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
			<Card class="max-w-none p-4! {activeFilter === 'draft' ? 'ring-2 ring-gray-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('statuses.draft')}</p>
						<p class="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.draft}</p>
					</div>
					<button
						onclick={() => filterByStatus('draft')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'draft' ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4! {activeFilter === 'sent' ? 'ring-2 ring-blue-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('statuses.sent')}</p>
						<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
					</div>
					<button
						onclick={() => filterByStatus('sent')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'sent' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4! {activeFilter === 'approved' ? 'ring-2 ring-emerald-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('statuses.approved')}</p>
						<p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</p>
					</div>
					<button
						onclick={() => filterByStatus('approved')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
		</div>

		<Card class="max-w-none !p-6">
			{#if quotations.length === 0}
				<div class="text-center py-12">
					<p class="text-gray-500 dark:text-gray-400 mb-4">
						{$t('quotations.noQuotations')}
					</p>
					<Button href="/quotations/new">
						<PlusOutline class="w-4 h-4 mr-2" />
						{$t('quotations.newQuotation')}
					</Button>
				</div>
			{:else if filteredQuotations.length === 0}
				<div class="text-center py-12">
					<p class="text-gray-500 dark:text-gray-400 mb-4">
						{$t('common.noResults')}
					</p>
					<Button color="alternative" onclick={() => clearFilters()}>
						{$t('common.clearFilters')}
					</Button>
				</div>
			{:else}
				<DataTable data={filteredQuotations} {columns}>
				{#snippet row(quote)}
					<TableBodyCell>
						<div class="flex items-center justify-between gap-2">
							<div>
								<div class="font-mono font-medium text-gray-900 dark:text-white">
									{quote.quotationNumber}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{getClientName(quote.clientId)}
								</div>
							</div>
							<ActionMenu
								triggerId="actions-{quote._id}"
								actions={getQuotationActions(quote)}
							/>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="text-sm">
							<div class="text-gray-900 dark:text-white truncate max-w-[200px]">
								{quote.origin}
							</div>
							<div class="text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
								→ {quote.destination}
							</div>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="font-semibold text-gray-900 dark:text-white">
							{formatCurrency(quote.salePriceHnl)}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							${quote.salePriceUsd.toFixed(2)} USD
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status="{quote.selectedMarkupPercentage}%" variant="pricing" />
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={quote.status} variant="quotation" />
					</TableBodyCell>
					<TableBodyCell class="text-sm text-gray-500 dark:text-gray-400">
						{formatDate(quote.createdAt)}
					</TableBodyCell>
				{/snippet}
			</DataTable>
		{/if}
		</Card>
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
