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
		Toast,
		Alert
	} from 'flowbite-svelte';
	import {
		PlusOutline,
		PenOutline,
		TrashBinOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		ExclamationCircleOutline,
		UserOutline,
		InfoCircleSolid,
		FilterOutline
	} from 'flowbite-svelte-icons';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import {
		StatusBadge,
		DataTable,
		ActionMenu,
		ContactActions,
		createEditAction,
		createDeleteAction,
		createCallAction,
		createEmailAction,
		createWhatsAppAction,
		filterActions,
		type Column,
		type ActionItem
	} from '$lib/components/ui';
	import type { Id } from '$convex/_generated/dataModel';
	import { t } from '$lib/i18n';

	const client = useConvexClient();

	// Query drivers when tenant is available
	const driversQuery = useQuery(
		api.drivers.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query tenant for plan limits
	const tenantQuery = useQuery(
		api.tenants.get,
		() => (tenantStore.tenantId ? { id: tenantStore.tenantId } : 'skip')
	);

	// Query parameters for license categories
	const parametersQuery = useQuery(
		api.parameters.getActive,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const tenant = $derived(tenantQuery.data);
	const parameters = $derived(parametersQuery.data);

	// License categories from parameters or defaults
	const defaultLicenseCategories = [
		{ key: 'comercial_a', name: 'Comercial A' },
		{ key: 'comercial_b', name: 'Comercial B' },
		{ key: 'particular', name: 'Particular' }
	];
	const licenseCategories = $derived(
		(parameters?.licenseCategories as { key: string; name: string; description?: string }[]) || defaultLicenseCategories
	);

	// Check if can add more drivers
	const canAddDriver = $derived(() => {
		if (!tenant) return false;
		if (tenant.maxDrivers === -1) return true;
		return drivers.length < (tenant.maxDrivers || 0);
	});

	// Modal state
	let showModal = $state(false);
	let isEditing = $state(false);
	let editingId = $state<Id<'drivers'> | null>(null);

	// Form state
	let formData = $state({
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		licenseNumber: '',
		licenseExpiry: '',
		licenseCategory: '',
		emergencyContactName: '',
		emergencyContactPhone: '',
		status: 'active',
		hireDate: '',
		notes: ''
	});

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Loading state
	let isSaving = $state(false);

	// Table columns configuration (reactive for i18n)
	const columns = $derived<Column<any>[]>([
		{
			key: 'firstName',
			label: $t('drivers.columns.driver'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('drivers.filters.searchPlaceholder'),
			getValue: (d) => `${d.firstName} ${d.lastName}`
		},
		{
			key: 'phone',
			label: $t('drivers.columns.contact'),
			sortable: true,
			filterable: true,
			filterPlaceholder: $t('drivers.filters.searchPlaceholder')
		},
		{
			key: 'licenseNumber',
			label: $t('drivers.columns.license'),
			sortable: true,
			filterable: true
		},
		{
			key: 'licenseCategory',
			label: $t('drivers.columns.category') || 'Category',
			sortable: true,
			filterOptions: licenseCategories.map(c => c.name),
			filterPlaceholder: $t('drivers.filters.categoryPlaceholder')
		},
		{
			key: 'licenseExpiry',
			label: $t('drivers.columns.expiry') || 'Expiry',
			sortable: true,
			sortFn: (a, b, dir) => dir === 'asc' ? a.licenseExpiry - b.licenseExpiry : b.licenseExpiry - a.licenseExpiry
		},
		{
			key: 'status',
			label: $t('drivers.columns.status'),
			sortable: true,
			filterOptions: [
				{ label: $t('statuses.active'), value: 'active' },
				{ label: $t('statuses.inactive'), value: 'inactive' },
				{ label: $t('statuses.on_leave'), value: 'on_leave' }
			],
			filterPlaceholder: $t('drivers.filters.statusPlaceholder')
		}
	]);

	// Build actions for a driver row
	function getDriverActions(driver: typeof drivers[0]): ActionItem[] {
		return filterActions([
			// Edit action
			createEditAction(() => openEditModal(driver), $t('common.edit')),

			// Call/WhatsApp actions (with divider)
			driver.phone
				? { ...createCallAction(driver.phone, $t('common.call'))!, dividerBefore: true }
				: null,
			createWhatsAppAction(driver.phone),
			driver.emergencyContactPhone
				? createCallAction(driver.emergencyContactPhone, $t('drivers.callEmergencyContact'))
				: null,

			// Email action
			createEmailAction(driver.email, $t('common.email')),

			// Delete action
			createDeleteAction(() => handleDelete(driver._id), false, $t('common.delete'))
		]);
	}

	function openCreateModal() {
		isEditing = false;
		editingId = null;
		formData = {
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			licenseNumber: '',
			licenseExpiry: '',
			licenseCategory: '',
			emergencyContactName: '',
			emergencyContactPhone: '',
			status: 'active',
			hireDate: '',
			notes: ''
		};
		showModal = true;
	}

	function openEditModal(driver: any) {
		isEditing = true;
		editingId = driver._id;
		formData = {
			firstName: driver.firstName,
			lastName: driver.lastName,
			email: driver.email || '',
			phone: driver.phone,
			licenseNumber: driver.licenseNumber,
			licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : '',
			licenseCategory: driver.licenseCategory || '',
			emergencyContactName: driver.emergencyContactName || '',
			emergencyContactPhone: driver.emergencyContactPhone || '',
			status: driver.status,
			hireDate: driver.hireDate ? new Date(driver.hireDate).toISOString().split('T')[0] : '',
			notes: driver.notes || ''
		};
		showModal = true;
	}

	async function handleSubmit() {
		if (!tenantStore.tenantId) return;

		isSaving = true;
		try {
			const payload = {
				firstName: formData.firstName,
				lastName: formData.lastName,
				phone: formData.phone,
				licenseNumber: formData.licenseNumber,
				licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).getTime() : Date.now(),
				status: formData.status,
				email: formData.email || undefined,
				licenseCategory: formData.licenseCategory || undefined,
				emergencyContactName: formData.emergencyContactName || undefined,
				emergencyContactPhone: formData.emergencyContactPhone || undefined,
				hireDate: formData.hireDate ? new Date(formData.hireDate).getTime() : undefined,
				notes: formData.notes || undefined
			};

			if (isEditing && editingId) {
				await client.mutation(api.drivers.update, {
					id: editingId,
					...payload
				});
				showToastMessage($t('drivers.updateSuccess'), 'success');
			} else {
				await client.mutation(api.drivers.create, {
					tenantId: tenantStore.tenantId,
					...payload
				});
				showToastMessage($t('drivers.createSuccess'), 'success');
			}
			showModal = false;
		} catch (error) {
			console.error('Failed to save driver:', error);
			showToastMessage($t('drivers.saveFailed'), 'error');
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(id: Id<'drivers'>) {
		if (!confirm($t('drivers.deleteConfirm'))) return;

		try {
			await client.mutation(api.drivers.remove, { id });
			showToastMessage($t('drivers.deleteSuccess'), 'success');
		} catch (error) {
			console.error('Failed to delete driver:', error);
			showToastMessage($t('drivers.deleteFailed'), 'error');
		}
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('es-HN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getLicenseExpiryStatus(expiry: number): { status: string; text: string } {
		const now = Date.now();
		const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

		if (daysUntilExpiry < 0) {
			return { status: 'error', text: 'Expired' };
		} else if (daysUntilExpiry < 30) {
			return { status: 'error', text: `${daysUntilExpiry}d left` };
		} else if (daysUntilExpiry < 90) {
			return { status: 'warning', text: `${daysUntilExpiry}d left` };
		}
		return { status: 'success', text: formatDate(expiry) };
	}

	const drivers = $derived(driversQuery.data || []);
	const isLoading = $derived(driversQuery.isLoading);

	// Handle URL param to auto-open modal for selected driver
	$effect(() => {
		const selectedId = $page.url.searchParams.get('selected');
		if (selectedId && drivers.length > 0) {
			const selectedDriver = drivers.find(d => d._id === selectedId);
			if (selectedDriver) {
				openEditModal(selectedDriver);
				// Clear the URL param to prevent reopening on navigation
				goto('/drivers', { replaceState: true });
			}
		}
	});

	// Status filter state
	let statusFilter = $state('');

	// Stats
	const stats = $derived({
		total: drivers.length,
		active: drivers.filter((d) => d.status === 'active').length,
		inactive: drivers.filter((d) => d.status === 'inactive').length,
		on_leave: drivers.filter((d) => d.status === 'on_leave').length
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

	// Pre-filtered drivers for DataTable
	const filteredDrivers = $derived(
		statusFilter
			? drivers.filter((d) => d.status === statusFilter)
			: drivers
	);
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('drivers.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('drivers.subtitle', { values: { count: stats.total } })}
				{#if tenant && tenant.maxDrivers !== -1}
					<span class="text-sm">({stats.total} / {tenant.maxDrivers})</span>
				{/if}
			</p>
		</div>
		<Button onclick={openCreateModal} disabled={!canAddDriver()}>
			<PlusOutline class="w-4 h-4 mr-2" />
			{$t('drivers.addDriver')}
		</Button>
	</div>

	{#if !canAddDriver() && tenant}
		<Alert color="red" border class="bg-red-50 dark:bg-red-900/30">
			{#snippet icon()}
				<InfoCircleSolid class="w-5 h-5" />
			{/snippet}
			<span class="font-semibold">{$t('drivers.limits.driverLimitReached')}</span>
			<span class="ml-1">{$t('drivers.limits.upgradeToAddMore')}</span>
			<Button size="xs" color="red" class="ml-3" href="/settings/billing">
				{$t('settings.billing.upgrade')}
			</Button>
		</Alert>
	{/if}

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
			<Card class="max-w-none p-4! {activeFilter === 'on_leave' ? 'ring-2 ring-yellow-500' : ''}">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{$t('statuses.on_leave')}</p>
						<p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.on_leave}</p>
					</div>
					<button
						onclick={() => filterByStatus('on_leave')}
						class="p-1.5 rounded-lg transition-colors {activeFilter === 'on_leave' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'}"
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
		</div>
	{/if}

	{#if isLoading}
		<Card class="max-w-none !p-6">
			<div class="flex justify-center py-12">
				<Spinner size="8" />
			</div>
		</Card>
	{:else if drivers.length === 0}
		<Card class="max-w-none !p-6">
			<div class="text-center py-12">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					{$t('drivers.noDrivers')}
				</p>
				<Button onclick={openCreateModal}>
					<PlusOutline class="w-4 h-4 mr-2" />
					{$t('drivers.addDriver')}
				</Button>
			</div>
		</Card>
	{:else}
		<DataTable data={filteredDrivers} {columns}>
			{#snippet row(driver)}
				{@const expiryStatus = getLicenseExpiryStatus(driver.licenseExpiry)}
				<TableBodyCell>
					<div class="flex items-center justify-between gap-2">
						<div>
							<div class="font-medium text-gray-900 dark:text-white">
								{driver.firstName} {driver.lastName}
							</div>
							{#if driver.hireDate}
								<div class="text-sm text-gray-500 dark:text-gray-400">
									Since {formatDate(driver.hireDate)}
								</div>
							{/if}
						</div>
						<ActionMenu
							triggerId="actions-{driver._id}"
							actions={getDriverActions(driver)}
						/>
					</div>
				</TableBodyCell>
				<TableBodyCell>
					<div class="text-sm">
						<div class="flex items-center gap-2">
							<span class="text-gray-900 dark:text-white">{driver.phone}</span>
							<ContactActions phone={driver.phone} email={driver.email} size="xs" />
						</div>
						{#if driver.email}
							<div class="text-gray-500 dark:text-gray-400">{driver.email}</div>
						{/if}
					</div>
				</TableBodyCell>
				<TableBodyCell>
					<div class="font-mono text-sm text-gray-900 dark:text-white">{driver.licenseNumber}</div>
				</TableBodyCell>
				<TableBodyCell>
					{#if driver.licenseCategory}
						<StatusBadge status={driver.licenseCategory} />
					{:else}
						<span class="text-gray-400">-</span>
					{/if}
				</TableBodyCell>
				<TableBodyCell>
					<StatusBadge status={expiryStatus.status}>
						{#if expiryStatus.status === 'error'}
							<ExclamationCircleOutline class="w-3 h-3 mr-1 inline" />
						{/if}
						{expiryStatus.text}
					</StatusBadge>
				</TableBodyCell>
				<TableBodyCell>
					<StatusBadge status={driver.status} />
				</TableBodyCell>
			{/snippet}
		</DataTable>
	{/if}
</div>

<!-- Create/Edit Modal -->
<Modal bind:open={showModal} size="lg" title={isEditing ? $t('drivers.editDriver') : $t('drivers.addDriver')}>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="firstName">{$t('drivers.fields.firstName')} *</Label>
				<Input id="firstName" bind:value={formData.firstName} required placeholder={$t('drivers.fields.firstNamePlaceholder')} />
			</div>
			<div>
				<Label for="lastName">{$t('drivers.fields.lastName')} *</Label>
				<Input id="lastName" bind:value={formData.lastName} required placeholder={$t('drivers.fields.lastNamePlaceholder')} />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="phone">{$t('drivers.fields.phone')} *</Label>
				<Input id="phone" bind:value={formData.phone} required placeholder={$t('drivers.fields.phonePlaceholder')} />
			</div>
			<div>
				<Label for="email">{$t('drivers.fields.email')}</Label>
				<Input id="email" type="email" bind:value={formData.email} placeholder={$t('drivers.fields.emailPlaceholder')} />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<Label for="licenseNumber">{$t('drivers.fields.licenseNumber')} *</Label>
				<Input id="licenseNumber" bind:value={formData.licenseNumber} required placeholder={$t('drivers.fields.licenseNumberPlaceholder')} />
			</div>
			<div>
				<Label for="licenseCategory">{$t('drivers.fields.licenseCategory')}</Label>
				<Select id="licenseCategory" bind:value={formData.licenseCategory}>
					<option value="">{$t('drivers.fields.licenseCategoryPlaceholder')}</option>
					{#each licenseCategories as category}
						<option value={category.name}>{category.name}</option>
					{/each}
				</Select>
			</div>
			<div>
				<Label for="licenseExpiry">{$t('drivers.fields.licenseExpiry')} *</Label>
				<Input id="licenseExpiry" type="date" bind:value={formData.licenseExpiry} required />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="emergencyContactName">{$t('drivers.fields.emergencyContactName')}</Label>
				<Input id="emergencyContactName" bind:value={formData.emergencyContactName} placeholder={$t('drivers.fields.emergencyContactNamePlaceholder')} />
			</div>
			<div>
				<Label for="emergencyContactPhone">{$t('drivers.fields.emergencyContactPhone')}</Label>
				<Input id="emergencyContactPhone" bind:value={formData.emergencyContactPhone} placeholder={$t('drivers.fields.emergencyContactPhonePlaceholder')} />
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="hireDate">{$t('drivers.fields.hireDate')}</Label>
				<Input id="hireDate" type="date" bind:value={formData.hireDate} />
			</div>
			<div>
				<Label for="status">{$t('drivers.fields.status')}</Label>
				<Select id="status" bind:value={formData.status}>
					<option value="active">{$t('common.active')}</option>
					<option value="inactive">{$t('common.inactive')}</option>
					<option value="on_leave">{$t('statuses.on_leave')}</option>
				</Select>
			</div>
		</div>

		<div>
			<Label for="notes">{$t('drivers.fields.notes')}</Label>
			<Textarea id="notes" bind:value={formData.notes} rows={3} placeholder={$t('drivers.fields.notesPlaceholder')} />
		</div>
	</form>

	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={() => (showModal = false)}>{$t('common.cancel')}</Button>
			<Button onclick={handleSubmit} disabled={isSaving}>
				{#if isSaving}
					<Spinner size="4" class="mr-2" />
				{/if}
				{isEditing ? $t('common.update') : $t('common.add')}
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
