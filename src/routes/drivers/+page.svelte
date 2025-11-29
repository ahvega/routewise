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
		InfoCircleSolid
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge, DataTable, type Column } from '$lib/components/ui';
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
			filterOptions: licenseCategories.map(c => c.name)
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
			filterOptions: ['active', 'inactive', 'on_leave'],
			filterPlaceholder: $t('drivers.filters.statusPlaceholder')
		},
		{
			key: 'actions',
			label: $t('common.actions'),
			sortable: false
		}
	]);

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
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('drivers.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('drivers.subtitle', { values: { count: drivers.length } })}
				{#if tenant && tenant.maxDrivers !== -1}
					<span class="text-sm">({drivers.length} / {tenant.maxDrivers})</span>
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

	<Card class="max-w-none !p-6">
		{#if isLoading}
			<div class="flex justify-center py-12">
				<Spinner size="8" />
			</div>
		{:else if drivers.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					{$t('drivers.noDrivers')}
				</p>
				<Button onclick={openCreateModal}>
					<PlusOutline class="w-4 h-4 mr-2" />
					{$t('drivers.addDriver')}
				</Button>
			</div>
		{:else}
			<DataTable data={drivers} {columns}>
				{#snippet row(driver)}
					{@const expiryStatus = getLicenseExpiryStatus(driver.licenseExpiry)}
					<TableBodyCell>
						<div class="font-medium text-gray-900 dark:text-white">
							{driver.firstName} {driver.lastName}
						</div>
						{#if driver.hireDate}
							<div class="text-sm text-gray-500 dark:text-gray-400">
								Since {formatDate(driver.hireDate)}
							</div>
						{/if}
					</TableBodyCell>
					<TableBodyCell>
						<div class="text-sm">
							<div class="text-gray-900 dark:text-white">{driver.phone}</div>
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
					<TableBodyCell>
						<div class="flex gap-2">
							<Button size="xs" color="light" onclick={() => openEditModal(driver)}>
								<PenOutline class="w-4 h-4" />
							</Button>
							<Button size="xs" color="red" outline onclick={() => handleDelete(driver._id)}>
								<TrashBinOutline class="w-4 h-4" />
							</Button>
						</div>
					</TableBodyCell>
				{/snippet}
			</DataTable>
		{/if}
	</Card>
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
		<svelte:fragment slot="icon">
			{#if toastType === 'success'}
				<CheckCircleOutline class="w-5 h-5" />
			{:else}
				<CloseCircleOutline class="w-5 h-5" />
			{/if}
		</svelte:fragment>
		{toastMessage}
	</Toast>
{/if}
