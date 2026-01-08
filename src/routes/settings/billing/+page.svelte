<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { t } from '$lib/i18n';
	import {
		Card,
		Button,
		Badge,
		Spinner,
		Alert,
		Progressbar,
		Table,
		TableHead,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		TableHeadCell
	} from 'flowbite-svelte';
	import {
		CreditCardOutline,
		CheckCircleOutline,
		ExclamationCircleOutline,
		ArrowUpOutline,
		CalendarMonthOutline,
		ChartOutline,
		UsersOutline,
		TruckOutline,
		UserOutline,
		DocumentTextOutline,
		EnvelopeOutline
	} from 'flowbite-svelte-icons';
	import { PLAN_CONFIG } from '$lib/config/plans';

	const client = useConvexClient();

	// Query tenant and subscription info
	const tenantQuery = useQuery(
		api.tenants.get,
		() => (tenantStore.tenantId ? { id: tenantStore.tenantId } : 'skip')
	);

	// Query current usage
	const usageQuery = useQuery(
		api.usageTracking.getCurrentUsage,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query usage history
	const historyQuery = useQuery(
		api.usageTracking.getHistory,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId, limit: 6 } : 'skip')
	);

	// Derived values
	const tenant = $derived(tenantQuery.data);
	const usage = $derived(usageQuery.data);
	const history = $derived(historyQuery.data || []);
	const isLoading = $derived(tenantQuery.isLoading);

	// Current plan info
	const currentPlan = $derived(tenant?.plan || 'trial');
	const planConfig = $derived(PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.trial);
	const billingCycle = $derived(tenant?.billingCycle || 'monthly');
	const subscriptionStatus = $derived(tenant?.subscriptionStatus || 'inactive');

	// Usage percentages
	const usersPercent = $derived(
		tenant?.maxUsers === -1 ? 0 : Math.min(100, ((usage?.resourceCounts?.users || 0) / (tenant?.maxUsers || 1)) * 100)
	);
	const vehiclesPercent = $derived(
		tenant?.maxVehicles === -1 ? 0 : Math.min(100, ((usage?.resourceCounts?.vehicles || 0) / (tenant?.maxVehicles || 1)) * 100)
	);
	const driversPercent = $derived(
		tenant?.maxDrivers === -1 ? 0 : Math.min(100, ((usage?.resourceCounts?.drivers || 0) / (tenant?.maxDrivers || 1)) * 100)
	);
	const quotationsPercent = $derived(
		tenant?.maxQuotationsPerMonth === -1 ? 0 : Math.min(100, ((usage?.quotationsCreated || 0) / (tenant?.maxQuotationsPerMonth || 1)) * 100)
	);
	const emailsPercent = $derived(
		tenant?.maxEmailsPerMonth === -1 ? 0 : Math.min(100, ((usage?.emailsSent || 0) / (tenant?.maxEmailsPerMonth || 1)) * 100)
	);

	// Format dates
	function formatDate(timestamp: number | undefined): string {
		if (!timestamp) return '-';
		return new Date(timestamp).toLocaleDateString('es-HN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Days remaining in billing period
	const daysRemaining = $derived(() => {
		if (!tenant?.currentPeriodEnd) return null;
		const now = Date.now();
		const diff = tenant.currentPeriodEnd - now;
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	});

	// Handle upgrade click
	function handleUpgrade() {
		// In production, this would redirect to Stripe checkout
		alert('Stripe checkout coming soon! Contact support to upgrade your plan.');
	}

	// Handle manage subscription click
	function handleManageSubscription() {
		// In production, this would redirect to Stripe customer portal
		alert('Stripe customer portal coming soon! Contact support to manage your subscription.');
	}

	// Get status badge color
	function getStatusColor(status: string): 'green' | 'yellow' | 'red' | 'dark' {
		switch (status) {
			case 'active':
				return 'green';
			case 'past_due':
				return 'yellow';
			case 'cancelled':
			case 'expired':
				return 'red';
			default:
				return 'dark';
		}
	}

	// Get progress bar color based on percentage
	function getProgressColor(percent: number): 'blue' | 'yellow' | 'red' {
		if (percent >= 90) return 'red';
		if (percent >= 70) return 'yellow';
		return 'blue';
	}
</script>

<svelte:head>
	<title>{$t('settings.billing.title')} | RouteWise</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('settings.billing.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">{$t('settings.billing.subtitle')}</p>
		</div>
		<Button href="/settings" color="light">
			{$t('common.back')}
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else if tenant}
		<!-- Current Plan Overview -->
		<Card class="max-w-none !p-6">
			<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
				<div class="flex items-start gap-4">
					<div class="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
						<CreditCardOutline class="w-8 h-8 text-primary-600 dark:text-primary-400" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-2xl font-bold text-gray-900 dark:text-white capitalize">
								{$t(`plans.${currentPlan}.name`)}
							</h2>
							<Badge color={getStatusColor(subscriptionStatus)}>
								{subscriptionStatus === 'active' ? $t('settings.billing.active') : subscriptionStatus}
							</Badge>
						</div>
						<p class="text-gray-600 dark:text-gray-400 mt-1">
							{$t(`plans.${currentPlan}.description`)}
						</p>
						{#if billingCycle !== 'lifetime'}
							<p class="text-sm text-gray-500 mt-2">
								<CalendarMonthOutline class="w-4 h-4 inline mr-1" />
								{$t('settings.billing.nextBilling')}: {formatDate(tenant.currentPeriodEnd)}
								{#if daysRemaining() !== null}
									<span class="text-gray-400">({daysRemaining()} {$t('settings.billing.daysRemaining')})</span>
								{/if}
							</p>
						{:else}
							<p class="text-sm text-green-600 dark:text-green-400 mt-2">
								<CheckCircleOutline class="w-4 h-4 inline mr-1" />
								{$t('settings.billing.lifetime')}
							</p>
						{/if}
					</div>
				</div>

				<div class="flex flex-col sm:flex-row gap-3">
					{#if currentPlan !== 'founder' && currentPlan !== 'enterprise'}
						<Button color="blue" onclick={handleUpgrade}>
							<ArrowUpOutline class="w-4 h-4 mr-2" />
							{$t('settings.billing.upgrade')}
						</Button>
					{/if}
					{#if subscriptionStatus === 'active' && billingCycle !== 'lifetime'}
						<Button color="light" onclick={handleManageSubscription}>
							{$t('settings.billing.manageSubscription')}
						</Button>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Usage Overview -->
		<Card class="max-w-none !p-6">
			<div class="flex items-center gap-2 mb-6">
				<ChartOutline class="w-5 h-5 text-gray-500" />
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('settings.billing.usage')}</h3>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Users -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UsersOutline class="w-4 h-4 text-gray-500" />
							<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('settings.billing.users')}</span>
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">
							{usage?.resourceCounts?.users || 0} / {tenant.maxUsers === -1 ? $t('settings.billing.unlimited') : tenant.maxUsers}
						</span>
					</div>
					{#if tenant.maxUsers !== -1}
						<Progressbar progress={usersPercent} color={getProgressColor(usersPercent)} />
					{:else}
						<div class="h-2 bg-green-100 dark:bg-green-900 rounded-full">
							<div class="h-full bg-green-500 rounded-full w-full"></div>
						</div>
					{/if}
				</div>

				<!-- Vehicles -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<TruckOutline class="w-4 h-4 text-gray-500" />
							<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('settings.billing.vehicles')}</span>
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">
							{usage?.resourceCounts?.vehicles || 0} / {tenant.maxVehicles === -1 ? $t('settings.billing.unlimited') : tenant.maxVehicles}
						</span>
					</div>
					{#if tenant.maxVehicles !== -1}
						<Progressbar progress={vehiclesPercent} color={getProgressColor(vehiclesPercent)} />
					{:else}
						<div class="h-2 bg-green-100 dark:bg-green-900 rounded-full">
							<div class="h-full bg-green-500 rounded-full w-full"></div>
						</div>
					{/if}
				</div>

				<!-- Drivers -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UserOutline class="w-4 h-4 text-gray-500" />
							<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('settings.billing.drivers')}</span>
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">
							{usage?.resourceCounts?.drivers || 0} / {tenant.maxDrivers === -1 ? $t('settings.billing.unlimited') : tenant.maxDrivers}
						</span>
					</div>
					{#if tenant.maxDrivers !== -1}
						<Progressbar progress={driversPercent} color={getProgressColor(driversPercent)} />
					{:else}
						<div class="h-2 bg-green-100 dark:bg-green-900 rounded-full">
							<div class="h-full bg-green-500 rounded-full w-full"></div>
						</div>
					{/if}
				</div>

				<!-- Quotations this month -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<DocumentTextOutline class="w-4 h-4 text-gray-500" />
							<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('settings.billing.quotationsThisMonth')}</span>
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">
							{usage?.quotationsCreated || 0} / {tenant.maxQuotationsPerMonth === -1 ? $t('settings.billing.unlimited') : tenant.maxQuotationsPerMonth}
						</span>
					</div>
					{#if tenant.maxQuotationsPerMonth !== -1}
						<Progressbar progress={quotationsPercent} color={getProgressColor(quotationsPercent)} />
					{:else}
						<div class="h-2 bg-green-100 dark:bg-green-900 rounded-full">
							<div class="h-full bg-green-500 rounded-full w-full"></div>
						</div>
					{/if}
				</div>

				<!-- Emails this month -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<EnvelopeOutline class="w-4 h-4 text-gray-500" />
							<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('settings.billing.emailsThisMonth')}</span>
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">
							{usage?.emailsSent || 0} / {tenant.maxEmailsPerMonth === -1 ? $t('settings.billing.unlimited') : tenant.maxEmailsPerMonth}
						</span>
					</div>
					{#if tenant.maxEmailsPerMonth !== -1}
						<Progressbar progress={emailsPercent} color={getProgressColor(emailsPercent)} />
					{:else}
						<div class="h-2 bg-green-100 dark:bg-green-900 rounded-full">
							<div class="h-full bg-green-500 rounded-full w-full"></div>
						</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Plan Features -->
		<Card class="max-w-none !p-6">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('settings.billing.planFeatures')}</h3>

			<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
				{#each Object.entries(tenant.features || {}) as [feature, enabled]}
					<div class="flex items-center gap-2">
						{#if enabled}
							<CheckCircleOutline class="w-5 h-5 text-green-500" />
						{:else}
							<ExclamationCircleOutline class="w-5 h-5 text-gray-400" />
						{/if}
						<span class="text-sm {enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400'}">
							{$t(`settings.billing.features.${feature}`)}
						</span>
					</div>
				{/each}
			</div>
		</Card>

		<!-- Usage History -->
		{#if history.length > 0}
			<Card class="max-w-none !p-6">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('settings.billing.usageHistory')}</h3>

				<Table striped>
					<TableHead>
						<TableHeadCell>{$t('settings.billing.period')}</TableHeadCell>
						<TableHeadCell>{$t('settings.billing.quotations')}</TableHeadCell>
						<TableHeadCell>{$t('settings.billing.emails')}</TableHeadCell>
						<TableHeadCell>{$t('settings.billing.pdfs')}</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each history as period}
							<TableBodyRow>
								<TableBodyCell>
									{formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
								</TableBodyCell>
								<TableBodyCell>{period.quotationsCreated}</TableBodyCell>
								<TableBodyCell>{period.emailsSent}</TableBodyCell>
								<TableBodyCell>{period.pdfGenerated}</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</Card>
		{/if}

		<!-- Trial Warning -->
		{#if currentPlan === 'trial' && tenant.trialEndsAt}
			<Alert color="yellow">
				{#snippet icon()}
					<ExclamationCircleOutline class="w-5 h-5" />
				{/snippet}
				<span class="font-medium">{$t('settings.billing.trialEnding')}</span>
				{$t('settings.billing.trialEndsOn')} {formatDate(tenant.trialEndsAt)}.
				<Button size="xs" color="yellow" class="ml-2" onclick={handleUpgrade}>
					{$t('settings.billing.upgradeNow')}
				</Button>
			</Alert>
		{/if}
	{:else}
		<Alert color="red">
			{#snippet icon()}
				<ExclamationCircleOutline class="w-5 h-5" />
			{/snippet}
			{$t('settings.billing.noTenantError')}
		</Alert>
	{/if}
</div>
