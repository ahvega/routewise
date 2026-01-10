<script lang="ts">
	import {
		Button,
		Card,
		TableBodyCell,
		Modal,
		Label,
		Input,
		Select,
		Textarea,
		Spinner,
		Toast
	} from 'flowbite-svelte';
	import {
		PlusOutline,
		PenOutline,
		TrashBinOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		BuildingOutline,
		UserOutline,
		RefreshOutline,
		FilterOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import {
		StatusBadge,
		DataTable,
		ActionMenu,
		createEditAction,
		createDeleteAction,
		createCallAction,
		createEmailAction,
		filterActions,
		type Column,
		type ActionItem
	} from '$lib/components/ui';
	import type { Id } from '$convex/_generated/dataModel';
	import { t } from '$lib/i18n';

	const client = useConvexClient();

	// Query clients when tenant is available
	const clientsQuery = useQuery(
		api.clients.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query active parameters for pricing levels
	const parametersQuery = useQuery(
		api.parameters.getActive,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Pricing level type
	type PricingLevel = {
		key: string;
		name: string;
		discountPercentage: number;
		isDefault?: boolean;
	};

	// Default pricing levels (fallback)
	const defaultPricingLevels: PricingLevel[] = [
		{ key: 'standard', name: 'Estándar', discountPercentage: 0, isDefault: true },
		{ key: 'preferred', name: 'Preferencial', discountPercentage: 5 },
		{ key: 'vip', name: 'VIP', discountPercentage: 10 }
	];

	// Get pricing levels from parameters or use defaults
	const pricingLevels = $derived<PricingLevel[]>(
		(parametersQuery.data?.pricingLevels as PricingLevel[]) || defaultPricingLevels
	);

	// Modal state
	let showModal = $state(false);
	let isEditing = $state(false);
	let editingId = $state<Id<'clients'> | null>(null);

	// Form state
	let formData = $state({
		type: 'company' as 'company' | 'individual',
		clientCode: '', // 4-letter code for quotation naming
		companyName: '',
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		address: '',
		city: '',
		state: '',
		country: 'HN',
		taxId: '',
		pricingLevel: 'standard' as 'standard' | 'preferred' | 'vip',
		discountPercentage: 0,
		creditLimit: 5000,
		paymentTerms: 0,
		notes: '',
		status: 'active'
	});

	// Query for code preview (must be after formData declaration)
	const codePreviewQuery = useQuery(
		api.clients.previewClientCode,
		() => ({
			type: formData.type,
			companyName: formData.companyName || undefined,
			firstName: formData.firstName || undefined,
			lastName: formData.lastName || undefined,
		})
	);

	// Generate code button handler
	function generateClientCode() {
		if (codePreviewQuery.data) {
			formData.clientCode = codePreviewQuery.data;
		}
	}

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Loading state
	let isSaving = $state(false);

	// Table columns configuration (reactive for i18n)
	const columns = $derived<Column<any>[]>([
		{
			key: 'clientCode',
			label: 'Código',
			sortable: true,
			filterable: true,
			filterPlaceholder: 'Código...',
			getValue: (c) => c.clientCode || '-'
		},
		{
			key: 'name',
			label: $t('clients.columns.client'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('clients.filters.searchPlaceholder'),
			getValue: (c) => c.companyName || `${c.firstName} ${c.lastName}`
		},
		{
			key: 'email',
			label: $t('clients.columns.contact'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('clients.filters.searchPlaceholder')
		},
		{
			key: 'type',
			label: $t('clients.columns.type'),
			sortable: true,
			filterOptions: ['company', 'individual'],
			filterPlaceholder: $t('clients.filters.typePlaceholder')
		},
		{
			key: 'pricingLevel',
			label: $t('clients.columns.pricing') || 'Pricing',
			sortable: true,
			filterOptions: ['standard', 'preferred', 'vip']
		},
		{
			key: 'creditLimit',
			label: $t('clients.columns.credit') || 'Credit',
			sortable: true
		},
		{
			key: 'status',
			label: $t('clients.columns.status'),
			sortable: true,
			filterOptions: ['active', 'inactive'],
			filterPlaceholder: $t('clients.filters.statusPlaceholder')
		}
	]);

	// Build actions for a client row
	function getClientActions(clientData: typeof clients[0]): ActionItem[] {
		return filterActions([
			// Edit action
			createEditAction(() => openEditModal(clientData), $t('common.edit')),

			// Call/Email actions (with divider)
			clientData.phone
				? { ...createCallAction(clientData.phone, $t('common.call'))!, dividerBefore: true }
				: null,
			createEmailAction(clientData.email, $t('common.email')),

			// Delete action
			createDeleteAction(() => handleDelete(clientData._id), false, $t('common.delete'))
		]);
	}

	function openCreateModal() {
		isEditing = false;
		editingId = null;
		// Get the default pricing level from settings
		const defaultLevel = pricingLevels.find(l => l.isDefault) || pricingLevels[0];
		formData = {
			type: 'company',
			clientCode: '', // Auto-generated if left empty
			companyName: '',
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			address: '',
			city: '',
			state: '',
			country: 'HN',
			taxId: '',
			pricingLevel: defaultLevel?.key || 'standard',
			discountPercentage: defaultLevel?.discountPercentage || 0,
			creditLimit: 5000,
			paymentTerms: 0,
			notes: '',
			status: 'active'
		};
		showModal = true;
	}

	function openEditModal(clientData: any) {
		isEditing = true;
		editingId = clientData._id;
		formData = {
			type: clientData.type,
			clientCode: clientData.clientCode || '',
			companyName: clientData.companyName || '',
			firstName: clientData.firstName || '',
			lastName: clientData.lastName || '',
			email: clientData.email || '',
			phone: clientData.phone || '',
			address: clientData.address || '',
			city: clientData.city || '',
			state: clientData.state || '',
			country: clientData.country,
			taxId: clientData.taxId || '',
			pricingLevel: clientData.pricingLevel,
			discountPercentage: clientData.discountPercentage,
			creditLimit: clientData.creditLimit,
			paymentTerms: clientData.paymentTerms,
			notes: clientData.notes || '',
			status: clientData.status
		};
		showModal = true;
	}

	// Handle pricing level change - auto-set discount from configured levels
	function handlePricingLevelChange(event: Event) {
		const selectedKey = (event.target as HTMLSelectElement).value;
		const level = pricingLevels.find(l => l.key === selectedKey);
		if (level) {
			formData.pricingLevel = level.key;
			formData.discountPercentage = level.discountPercentage;
		}
	}

	// Get display name for a pricing level key
	function getPricingLevelName(key: string): string {
		const level = pricingLevels.find(l => l.key === key);
		return level?.name || key;
	}

	async function handleSubmit() {
		if (!tenantStore.tenantId) return;

		isSaving = true;
		try {
			const payload = {
				...formData,
				clientCode: formData.clientCode?.trim().toUpperCase() || undefined, // Will auto-generate if empty
				companyName: formData.companyName || undefined,
				firstName: formData.firstName || undefined,
				lastName: formData.lastName || undefined,
				email: formData.email || undefined,
				phone: formData.phone || undefined,
				address: formData.address || undefined,
				city: formData.city || undefined,
				state: formData.state || undefined,
				taxId: formData.taxId || undefined,
				notes: formData.notes || undefined
			};

			if (isEditing && editingId) {
				await client.mutation(api.clients.update, {
					id: editingId,
					...payload
				});
				showToastMessage($t('clients.updateSuccess'), 'success');
			} else {
				await client.mutation(api.clients.create, {
					tenantId: tenantStore.tenantId,
					...payload
				});
				showToastMessage($t('clients.createSuccess'), 'success');
			}
			showModal = false;
		} catch (error) {
			console.error('Failed to save client:', error);
			showToastMessage($t('clients.saveFailed'), 'error');
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(id: Id<'clients'>) {
		if (!confirm($t('clients.deleteConfirm'))) return;

		try {
			await client.mutation(api.clients.remove, { id });
			showToastMessage($t('clients.deleteSuccess'), 'success');
		} catch (error) {
			console.error('Failed to delete client:', error);
			showToastMessage($t('clients.deleteFailed'), 'error');
		}
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	function getClientName(clientData: any): string {
		if (clientData.type === 'company') {
			return clientData.companyName || 'Unnamed Company';
		}
		return [clientData.firstName, clientData.lastName].filter(Boolean).join(' ') || 'Unnamed Client';
	}

	const clients = $derived(clientsQuery.data || []);
	const isLoading = $derived(clientsQuery.isLoading);

	// Status filter state
	let statusFilter = $state('');

	// Stats
	const stats = $derived({
		total: clients.length,
		active: clients.filter((c) => c.status === 'active').length,
		inactive: clients.filter((c) => c.status === 'inactive').length,
		companies: clients.filter((c) => c.type === 'company').length,
		individuals: clients.filter((c) => c.type === 'individual').length
	});

	// Filter functions
	function filterByStatus(status: string) {
		statusFilter = status;
	}

	function clearFilters() {
		statusFilter = '';
	}

	// Active filter indicator
	const activeFilter = $derived(statusFilter);

	// Pre-filtered clients for DataTable
	const filteredClients = $derived(
		statusFilter
			? clients.filter((c) => c.status === statusFilter)
			: clients
	);
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('clients.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('clients.subtitle', { values: { count: stats.total } })}
			</p>
		</div>
		<Button onclick={openCreateModal}>
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('clients.addClient')}
		</Button>
	</div>

	{#if !isLoading}
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
			<Card class="max-w-none p-4! {activeFilter === 'active' ? 'ring-2 ring-emerald-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('statuses.active')}</p>
						<p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
					</div>
					<button
						onclick={() => filterByStatus('active')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4! {activeFilter === 'inactive' ? 'ring-2 ring-gray-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('statuses.inactive')}</p>
						<p class="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.inactive}</p>
					</div>
					<button
						onclick={() => filterByStatus('inactive')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'inactive' ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
						title={$t('common.filter')}
					>
						<FilterOutline class="w-4 h-4" />
					</button>
				</div>
			</Card>
			<Card class="max-w-none p-4!">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('clients.fields.company')}</p>
						<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.companies}</p>
					</div>
					<div class="p-1.5">
						<BuildingOutline class="w-4 h-4 text-gray-400" />
					</div>
				</div>
			</Card>
		</div>
	{/if}

	<Card class="max-w-none !p-6">
		{#if isLoading}
			<div class="flex justify-center py-12">
				<Spinner size="8" />
			</div>
		{:else if clients.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					{$t('clients.noClients')}
				</p>
				<Button onclick={openCreateModal}>
					<PlusOutline class="w-4 h-4 mr-2" />
					{$t('clients.addClient')}
				</Button>
			</div>
		{:else if filteredClients.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					{$t('common.noResults')}
				</p>
				<Button color="alternative" onclick={() => clearFilters()}>
					{$t('common.clearFilters')}
				</Button>
			</div>
		{:else}
			<DataTable data={filteredClients} {columns}>
				{#snippet row(clientData)}
					<TableBodyCell>
						<span class="font-mono text-sm text-gray-600 dark:text-gray-400">
							{clientData.clientCode || '-'}
						</span>
					</TableBodyCell>
					<TableBodyCell>
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-3">
								<div class="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
									{#if clientData.type === 'company'}
										<BuildingOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
									{:else}
										<UserOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
									{/if}
								</div>
								<div>
									<div class="font-medium text-gray-900 dark:text-white">
										{getClientName(clientData)}
									</div>
									<div class="text-sm text-gray-500 dark:text-gray-400">
										{clientData.city || clientData.country}
									</div>
								</div>
							</div>
							<ActionMenu
								triggerId="actions-{clientData._id}"
								actions={getClientActions(clientData)}
							/>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="text-sm">
							{#if clientData.email}
								<div class="text-gray-900 dark:text-white">{clientData.email}</div>
							{/if}
							{#if clientData.phone}
								<div class="text-gray-500 dark:text-gray-400">{clientData.phone}</div>
							{/if}
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={clientData.type} />
					</TableBodyCell>
					<TableBodyCell>
						<div class="text-sm font-medium text-gray-900 dark:text-white">
							{getPricingLevelName(clientData.pricingLevel)}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{clientData.discountPercentage}% {$t('clients.columns.discount').toLowerCase()}
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<div class="text-sm">
							<div class="text-gray-900 dark:text-white">
								L {clientData.creditLimit.toLocaleString()}
							</div>
							<div class="text-gray-500 dark:text-gray-400">
								{clientData.paymentTerms > 0 ? $t('clients.fields.paymentTermsDays', { values: { days: clientData.paymentTerms } }) : $t('clients.fields.immediate')}
							</div>
						</div>
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={clientData.status} />
					</TableBodyCell>
				{/snippet}
			</DataTable>
		{/if}
	</Card>
</div>

<!-- Create/Edit Modal -->
<Modal bind:open={showModal} size="lg" title={isEditing ? $t('clients.editClient') : $t('clients.addClient')}>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div>
			<Label for="type">{$t('clients.fields.type')} *</Label>
			<Select id="type" bind:value={formData.type}>
				<option value="company">{$t('clients.fields.company')}</option>
				<option value="individual">{$t('clients.fields.individual')}</option>
			</Select>
		</div>

		{#if formData.type === 'company'}
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="md:col-span-3">
					<Label for="companyName">{$t('clients.fields.companyName')} *</Label>
					<Input id="companyName" bind:value={formData.companyName} required placeholder={$t('clients.fields.companyNamePlaceholder')} />
				</div>
				<div>
					<Label for="clientCode">Código</Label>
					<div class="flex gap-1">
						<Input
							id="clientCode"
							bind:value={formData.clientCode}
							placeholder={codePreviewQuery.data || 'AUTO'}
							maxlength="4"
							class="uppercase font-mono flex-1"
						/>
						<Button
							size="sm"
							color="alternative"
							onclick={generateClientCode}
							disabled={!codePreviewQuery.data}
							title="Generar código"
						>
							<RefreshOutline class="w-4 h-4" />
						</Button>
					</div>
					<p class="text-xs text-gray-500 mt-1">
						{#if codePreviewQuery.data && !formData.clientCode}
							Sugerido: <span class="font-mono font-semibold">{codePreviewQuery.data}</span>
						{:else}
							4 letras, ej: HOTR
						{/if}
					</p>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
				<div class="md:col-span-2">
					<Label for="firstName">{$t('clients.fields.firstName')} *</Label>
					<Input id="firstName" bind:value={formData.firstName} required placeholder={$t('clients.fields.firstNamePlaceholder')} />
				</div>
				<div class="md:col-span-2">
					<Label for="lastName">{$t('clients.fields.lastName')} *</Label>
					<Input id="lastName" bind:value={formData.lastName} required placeholder={$t('clients.fields.lastNamePlaceholder')} />
				</div>
				<div>
					<Label for="clientCode">Código</Label>
					<div class="flex gap-1">
						<Input
							id="clientCode"
							bind:value={formData.clientCode}
							placeholder={codePreviewQuery.data || 'AUTO'}
							maxlength="4"
							class="uppercase font-mono flex-1"
						/>
						<Button
							size="sm"
							color="alternative"
							onclick={generateClientCode}
							disabled={!codePreviewQuery.data}
							title="Generar código"
						>
							<RefreshOutline class="w-4 h-4" />
						</Button>
					</div>
					<p class="text-xs text-gray-500 mt-1">
						{#if codePreviewQuery.data && !formData.clientCode}
							Sugerido: <span class="font-mono font-semibold">{codePreviewQuery.data}</span>
						{:else}
							4 letras
						{/if}
					</p>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="email">{$t('clients.fields.email')}</Label>
				<Input id="email" type="email" bind:value={formData.email} placeholder={$t('clients.fields.emailPlaceholder')} />
			</div>
			<div>
				<Label for="phone">{$t('clients.fields.phone')}</Label>
				<Input id="phone" bind:value={formData.phone} placeholder={$t('clients.fields.phonePlaceholder')} />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<Label for="city">{$t('clients.fields.city')}</Label>
				<Input id="city" bind:value={formData.city} placeholder={$t('clients.fields.cityPlaceholder')} />
			</div>
			<div>
				<Label for="state">{$t('clients.fields.state')}</Label>
				<Input id="state" bind:value={formData.state} placeholder={$t('clients.fields.statePlaceholder')} />
			</div>
			<div>
				<Label for="country">{$t('clients.fields.country')} *</Label>
				<Select id="country" bind:value={formData.country}>
					<option value="HN">{$t('clients.countries.HN')}</option>
					<option value="GT">{$t('clients.countries.GT')}</option>
					<option value="SV">{$t('clients.countries.SV')}</option>
					<option value="NI">{$t('clients.countries.NI')}</option>
					<option value="CR">{$t('clients.countries.CR')}</option>
					<option value="PA">{$t('clients.countries.PA')}</option>
					<option value="US">{$t('clients.countries.US')}</option>
				</Select>
			</div>
		</div>

		<div>
			<Label for="address">{$t('clients.fields.address')}</Label>
			<Input id="address" bind:value={formData.address} placeholder={$t('clients.fields.addressPlaceholder')} />
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<Label for="pricingLevel">{$t('clients.fields.pricingLevel')}</Label>
				<Select id="pricingLevel" value={formData.pricingLevel} onchange={handlePricingLevelChange}>
					{#each pricingLevels as level}
						<option value={level.key}>{level.name} ({level.discountPercentage}%)</option>
					{/each}
				</Select>
			</div>
			<div>
				<Label for="discountPercentage">{$t('clients.fields.discount')}</Label>
				<Input id="discountPercentage" type="number" bind:value={formData.discountPercentage} min={0} max={100} />
			</div>
			<div>
				<Label for="taxId">{$t('clients.fields.rtn')}</Label>
				<Input id="taxId" bind:value={formData.taxId} placeholder={$t('clients.fields.rtnPlaceholder')} />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<Label for="creditLimit">{$t('clients.fields.creditLimit')}</Label>
				<Input id="creditLimit" type="number" bind:value={formData.creditLimit} min={0} />
			</div>
			<div>
				<Label for="paymentTerms">{$t('clients.fields.paymentTerms')}</Label>
				<Input id="paymentTerms" type="number" bind:value={formData.paymentTerms} min={0} />
			</div>
			<div>
				<Label for="status">{$t('clients.fields.status')}</Label>
				<Select id="status" bind:value={formData.status}>
					<option value="active">{$t('common.active')}</option>
					<option value="inactive">{$t('common.inactive')}</option>
				</Select>
			</div>
		</div>

		<div>
			<Label for="notes">{$t('clients.fields.notes')}</Label>
			<Textarea id="notes" bind:value={formData.notes} rows={3} placeholder={$t('clients.fields.notesPlaceholder')} />
		</div>
	</form>

	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showModal = false)}>{$t('common.cancel')}</Button>
			<Button onclick={handleSubmit} disabled={isSaving}>
				{#if isSaving}
					<Spinner size="4" class="mr-2" />
				{/if}
				{isEditing ? $t('common.update') : $t('common.create')}
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
