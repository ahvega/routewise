<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { goto } from '$app/navigation';
	import {
		Card,
		Button,
		Label,
		Input,
		Select,
		Alert,
		Spinner,
		Badge,
		Toast
	} from 'flowbite-svelte';
	import {
		BuildingOutline,
		CheckCircleOutline,
		ExclamationCircleOutline,
		ArrowRightOutline,
		UsersOutline,
		TruckOutline,
		UserOutline,
		DocumentTextOutline,
		CloseCircleOutline
	} from 'flowbite-svelte-icons';

	let { data } = $props();
	const client = useConvexClient();

	// Query default tenant status
	const migrationQuery = useQuery(api.migration.checkDefaultTenant, {});

	// Derived values
	const migrationData = $derived(migrationQuery.data);
	const isLoading = $derived(migrationQuery.isLoading);
	const hasDefaultTenant = $derived(migrationData?.exists ?? false);
	const tenant = $derived(migrationData?.tenant);
	const stats = $derived(migrationData?.stats);

	// Form state
	let companyName = $state('');
	let plan = $state('professional');
	let billingCycle = $state('yearly');
	let primaryContactEmail = $state('');
	let primaryContactPhone = $state('');
	let address = $state('');
	let city = $state('');

	// UI state
	let isMigrating = $state(false);
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');
	let migrationComplete = $state(false);
	let newSlug = $state('');

	// Initialize form with tenant data
	$effect(() => {
		if (tenant) {
			companyName = tenant.companyName || '';
			primaryContactEmail = tenant.primaryContactEmail || '';
			primaryContactPhone = tenant.primaryContactPhone || '';
			address = tenant.address || '';
			city = tenant.city || '';
		}
	});

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 5000);
	}

	async function handleMigrate() {
		if (!companyName.trim()) {
			showToastMessage('Company name is required', 'error');
			return;
		}

		isMigrating = true;
		try {
			const result = await client.mutation(api.migration.migrateDefaultTenant, {
				companyName: companyName.trim(),
				plan,
				billingCycle,
				primaryContactEmail: primaryContactEmail || undefined,
				primaryContactPhone: primaryContactPhone || undefined,
				address: address || undefined,
				city: city || undefined
			});

			if (result.success) {
				migrationComplete = true;
				newSlug = result.newSlug;
				showToastMessage(`Successfully migrated to ${companyName}!`, 'success');
			}
		} catch (err) {
			console.error('Migration failed:', err);
			showToastMessage(err instanceof Error ? err.message : 'Migration failed', 'error');
		} finally {
			isMigrating = false;
		}
	}

	function handleGoToDashboard() {
		// Force reload to get new session data
		window.location.href = '/';
	}
</script>

<svelte:head>
	<title>Migrate Default Tenant | Admin | RouteWise</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
	<div class="max-w-4xl mx-auto space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Tenant Migration</h1>
				<p class="text-gray-600 dark:text-gray-400 mt-1">
					Convert the default tenant to your company organization
				</p>
			</div>
			<Button color="light" href="/">Back to Dashboard</Button>
		</div>

		{#if isLoading}
			<div class="flex justify-center py-12">
				<Spinner size="8" />
			</div>
		{:else if migrationComplete}
			<!-- Migration Success -->
			<Card class="max-w-none">
				<div class="text-center py-8">
					<CheckCircleOutline class="w-16 h-16 mx-auto mb-4 text-green-500" />
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
						Migration Complete!
					</h2>
					<p class="text-gray-600 dark:text-gray-400 mb-6">
						Your organization <span class="font-semibold">{companyName}</span> has been created successfully.
					</p>
					<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 inline-block">
						<p class="text-sm text-gray-500">New Organization Slug</p>
						<p class="text-lg font-mono font-semibold text-primary-600">{newSlug}</p>
					</div>
					<div class="flex justify-center gap-4">
						<Button color="blue" onclick={handleGoToDashboard}>
							Go to Dashboard
							<ArrowRightOutline class="w-4 h-4 ml-2" />
						</Button>
					</div>
				</div>
			</Card>
		{:else if !hasDefaultTenant}
			<!-- No Default Tenant -->
			<Alert color="yellow">
				<ExclamationCircleOutline slot="icon" class="w-5 h-5" />
				<span class="font-medium">No default tenant found.</span>
				The default tenant has already been migrated or doesn't exist.
				<Button size="xs" color="yellow" class="ml-2" href="/">Go to Dashboard</Button>
			</Alert>
		{:else}
			<!-- Migration Form -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Current Data Stats -->
				<Card class="lg:col-span-1">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Data</h3>
					<p class="text-sm text-gray-500 mb-4">
						This data will be preserved during migration:
					</p>
					<div class="space-y-3">
						<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div class="flex items-center gap-2">
								<UsersOutline class="w-4 h-4 text-gray-500" />
								<span class="text-sm text-gray-700 dark:text-gray-300">Users</span>
							</div>
							<Badge color="blue">{stats?.usersCount || 0}</Badge>
						</div>
						<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div class="flex items-center gap-2">
								<TruckOutline class="w-4 h-4 text-gray-500" />
								<span class="text-sm text-gray-700 dark:text-gray-300">Vehicles</span>
							</div>
							<Badge color="blue">{stats?.vehiclesCount || 0}</Badge>
						</div>
						<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div class="flex items-center gap-2">
								<UserOutline class="w-4 h-4 text-gray-500" />
								<span class="text-sm text-gray-700 dark:text-gray-300">Drivers</span>
							</div>
							<Badge color="blue">{stats?.driversCount || 0}</Badge>
						</div>
						<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div class="flex items-center gap-2">
								<UsersOutline class="w-4 h-4 text-gray-500" />
								<span class="text-sm text-gray-700 dark:text-gray-300">Clients</span>
							</div>
							<Badge color="blue">{stats?.clientsCount || 0}</Badge>
						</div>
						<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div class="flex items-center gap-2">
								<DocumentTextOutline class="w-4 h-4 text-gray-500" />
								<span class="text-sm text-gray-700 dark:text-gray-300">Quotations</span>
							</div>
							<Badge color="blue">{stats?.quotationsCount || 0}</Badge>
						</div>
					</div>
				</Card>

				<!-- Migration Form -->
				<Card class="lg:col-span-2">
					<div class="flex items-center gap-2 mb-6">
						<BuildingOutline class="w-5 h-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Organization Details</h3>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); handleMigrate(); }} class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="md:col-span-2">
								<Label for="companyName">Company Name *</Label>
								<Input
									id="companyName"
									bind:value={companyName}
									placeholder="Your Company Name"
									required
								/>
							</div>

							<div>
								<Label for="plan">Subscription Plan</Label>
								<Select id="plan" bind:value={plan}>
									<option value="professional">Professional</option>
									<option value="business">Business</option>
									<option value="founder">Founder (Lifetime)</option>
								</Select>
							</div>

							<div>
								<Label for="billingCycle">Billing Cycle</Label>
								<Select id="billingCycle" bind:value={billingCycle} disabled={plan === 'founder'}>
									{#if plan === 'founder'}
										<option value="lifetime">Lifetime</option>
									{:else}
										<option value="monthly">Monthly</option>
										<option value="yearly">Yearly</option>
									{/if}
								</Select>
							</div>

							<div>
								<Label for="primaryEmail">Primary Contact Email</Label>
								<Input
									id="primaryEmail"
									type="email"
									bind:value={primaryContactEmail}
									placeholder="admin@company.com"
								/>
							</div>

							<div>
								<Label for="primaryPhone">Primary Contact Phone</Label>
								<Input
									id="primaryPhone"
									bind:value={primaryContactPhone}
									placeholder="+504 9999-9999"
								/>
							</div>

							<div>
								<Label for="address">Address</Label>
								<Input
									id="address"
									bind:value={address}
									placeholder="Street address"
								/>
							</div>

							<div>
								<Label for="city">City</Label>
								<Input
									id="city"
									bind:value={city}
									placeholder="City"
								/>
							</div>
						</div>

						<Alert color="blue">
							<ExclamationCircleOutline slot="icon" class="w-5 h-5" />
							<span class="font-medium">Important:</span> This action will convert the default tenant to your organization.
							All existing data (vehicles, drivers, clients, quotations) will be preserved.
						</Alert>

						<div class="flex justify-end gap-4">
							<Button color="light" href="/">Cancel</Button>
							<Button type="submit" color="blue" disabled={isMigrating || !companyName.trim()}>
								{#if isMigrating}
									<Spinner size="4" class="mr-2" />
									Migrating...
								{:else}
									<ArrowRightOutline class="w-4 h-4 mr-2" />
									Migrate Organization
								{/if}
							</Button>
						</div>
					</form>
				</Card>
			</div>
		{/if}
	</div>
</div>

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
