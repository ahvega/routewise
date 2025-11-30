<script lang="ts">
	import {
		Button,
		Card,
		TableBodyCell,
		Dropdown,
		DropdownItem,
		Spinner,
		Toast
	} from 'flowbite-svelte';
	import {
		PlusOutline,
		DotsHorizontalOutline,
		EyeOutline,
		PenOutline,
		TrashBinOutline,
		PaperPlaneOutline,
		CheckCircleOutline,
		CloseCircleOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge, DataTable, type Column } from '$lib/components/ui';
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

	// Table columns configuration (reactive for i18n)
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
		},
		{
			key: 'actions',
			label: $t('common.actions'),
			sortable: false
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
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('quotations.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{stats.total} total, {stats.draft} {$t('dashboard.drafts')}, {stats.approved} {$t('dashboard.approved')}
			</p>
		</div>
		<Button href="/quotations/new">
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('quotations.newQuotation')}
		</Button>
	</div>

	<Card class="max-w-none !p-6">
		{#if isLoading}
			<div class="flex justify-center py-12">
				<Spinner size="8" />
			</div>
		{:else if quotations.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					{$t('quotations.noQuotations')}
				</p>
				<Button href="/quotations/new">
					<PlusOutline class="w-4 h-4 mr-2" />
					{$t('quotations.newQuotation')}
				</Button>
			</div>
		{:else}
			<DataTable data={quotations} {columns}>
				{#snippet row(quote)}
					<TableBodyCell>
						<div class="font-mono font-medium text-gray-900 dark:text-white">
							{quote.quotationNumber}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{getClientName(quote.clientId)}
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
					<TableBodyCell>
						<Button size="xs" color="light" id="actions-{quote._id}">
							<DotsHorizontalOutline class="w-4 h-4" />
						</Button>
						<Dropdown triggeredBy="#actions-{quote._id}" class="dark:bg-gray-800 dark:border-gray-700">
							<DropdownItem href="/quotations/{quote._id}" class="dark:text-gray-200 dark:hover:bg-gray-700">
								<EyeOutline class="w-4 h-4 mr-2 inline" />
								{$t('quotations.viewQuotation')}
							</DropdownItem>
							{#if quote.status === 'draft'}
								<DropdownItem onclick={() => updateStatus(quote._id, 'sent')} class="dark:text-gray-200 dark:hover:bg-gray-700">
									<PaperPlaneOutline class="w-4 h-4 mr-2 inline" />
									{$t('common.sent')}
								</DropdownItem>
							{/if}
							{#if quote.status === 'sent'}
								<DropdownItem onclick={() => updateStatus(quote._id, 'approved')} class="dark:text-gray-200 dark:hover:bg-gray-700">
									<CheckCircleOutline class="w-4 h-4 mr-2 inline" />
									{$t('common.accepted')}
								</DropdownItem>
								<DropdownItem onclick={() => updateStatus(quote._id, 'rejected')} class="dark:text-gray-200 dark:hover:bg-gray-700">
									<CloseCircleOutline class="w-4 h-4 mr-2 inline" />
									{$t('common.rejected')}
								</DropdownItem>
							{/if}
							<DropdownItem class="text-red-600 dark:text-red-400 dark:hover:bg-gray-700" onclick={() => handleDelete(quote._id)}>
								<TrashBinOutline class="w-4 h-4 mr-2 inline" />
								{$t('common.delete')}
							</DropdownItem>
						</Dropdown>
					</TableBodyCell>
				{/snippet}
			</DataTable>
		{/if}
	</Card>
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
