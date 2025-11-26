<script lang="ts">
	import {
		Card,
		Button,
		Label,
		Input,
		Select,
		Toggle,
		Tabs,
		TabItem,
		Spinner,
		Toast
	} from 'flowbite-svelte';
	import { CheckCircleOutline, CloseCircleOutline, CogOutline } from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';

	const client = useConvexClient();

	// Query active parameters
	const parametersQuery = useQuery(
		api.parameters.getActive,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query tenant info
	const tenantQuery = useQuery(
		api.tenants.get,
		() => (tenantStore.tenantId ? { id: tenantStore.tenantId } : 'skip')
	);

	// Form state
	let formData = $state({
		fuelPrice: 110,
		mealCostPerDay: 250,
		hotelCostPerNight: 800,
		driverIncentivePerDay: 500,
		exchangeRate: 24.75,
		useCustomExchangeRate: false,
		preferredDistanceUnit: 'km',
		preferredCurrency: 'HNL'
	});

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Loading state
	let isSaving = $state(false);

	// Update form when data loads
	$effect(() => {
		const params = parametersQuery.data;
		if (params) {
			formData = {
				fuelPrice: params.fuelPrice,
				mealCostPerDay: params.mealCostPerDay,
				hotelCostPerNight: params.hotelCostPerNight,
				driverIncentivePerDay: params.driverIncentivePerDay,
				exchangeRate: params.exchangeRate,
				useCustomExchangeRate: params.useCustomExchangeRate,
				preferredDistanceUnit: params.preferredDistanceUnit,
				preferredCurrency: params.preferredCurrency
			};
		}
	});

	async function handleSave() {
		if (!tenantStore.tenantId) return;

		isSaving = true;
		try {
			const params = parametersQuery.data;
			if (params) {
				// Update existing
				await client.mutation(api.parameters.update, {
					id: params._id,
					...formData
				});
			} else {
				// Create new for current year
				await client.mutation(api.parameters.create, {
					tenantId: tenantStore.tenantId,
					year: new Date().getFullYear(),
					...formData,
					isActive: true
				});
			}
			showToastMessage($t('settings.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to save parameters:', error);
			showToastMessage($t('settings.saveFailed'), 'error');
		} finally {
			isSaving = false;
		}
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 2
		}).format(value);
	}

	const parameters = $derived(parametersQuery.data);
	const tenant = $derived(tenantQuery.data);
	const isLoading = $derived(parametersQuery.isLoading);
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('settings.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">{$t('settings.subtitle')}</p>
		</div>
		{#if parameters}
			<StatusBadge status="active" showIcon>
				{parameters.year} {$t('settings.parametersActive') || 'Parameters Active'}
			</StatusBadge>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else}
		<Tabs>
			<TabItem open title={$t('settings.tabs.costParameters')}>
				<Card class="max-w-none mt-4">
					<div class="flex items-center gap-2 mb-4">
						<CogOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
						<h5 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('settings.operatingCosts')}</h5>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<Label for="fuelPrice">{$t('settings.fields.fuelPrice')}</Label>
							<Input id="fuelPrice" type="number" bind:value={formData.fuelPrice} step="0.01" min="0" />
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{$t('settings.fields.fuelPriceHelp')}</p>
						</div>

						<div>
							<Label for="mealCost">{$t('settings.fields.mealCost')}</Label>
							<Input id="mealCost" type="number" bind:value={formData.mealCostPerDay} step="0.01" min="0" />
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{$t('settings.fields.mealCostHelp')}</p>
						</div>

						<div>
							<Label for="hotelCost">{$t('settings.fields.hotelCost')}</Label>
							<Input id="hotelCost" type="number" bind:value={formData.hotelCostPerNight} step="0.01" min="0" />
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{$t('settings.fields.hotelCostHelp')}</p>
						</div>

						<div>
							<Label for="driverIncentive">{$t('settings.fields.driverIncentive')}</Label>
							<Input id="driverIncentive" type="number" bind:value={formData.driverIncentivePerDay} step="0.01" min="0" />
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{$t('settings.fields.driverIncentiveHelp')}</p>
						</div>
					</div>

					<div class="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<h6 class="font-medium text-gray-900 dark:text-white mb-2">{$t('settings.costSummary')}</h6>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<p class="text-gray-500 dark:text-gray-400">{$t('settings.sections.fuel')}</p>
								<p class="font-semibold text-gray-900 dark:text-white">{formatCurrency(formData.fuelPrice)}/gal</p>
							</div>
							<div>
								<p class="text-gray-500 dark:text-gray-400">{$t('quotations.new.mealsCost')}</p>
								<p class="font-semibold text-gray-900 dark:text-white">{formatCurrency(formData.mealCostPerDay)}/{$t('units.days')}</p>
							</div>
							<div>
								<p class="text-gray-500 dark:text-gray-400">Hotel</p>
								<p class="font-semibold text-gray-900 dark:text-white">{formatCurrency(formData.hotelCostPerNight)}/night</p>
							</div>
							<div>
								<p class="text-gray-500 dark:text-gray-400">{$t('settings.fields.driverIncentive')}</p>
								<p class="font-semibold text-gray-900 dark:text-white">{formatCurrency(formData.driverIncentivePerDay)}/{$t('units.days')}</p>
							</div>
						</div>
					</div>
				</Card>

				<Card class="max-w-none mt-4">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('settings.currencyUnits')}</h5>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<Label for="exchangeRate">{$t('settings.fields.exchangeRate')}</Label>
							<Input id="exchangeRate" type="number" bind:value={formData.exchangeRate} step="0.01" min="0" />
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">1 USD = {formData.exchangeRate} HNL</p>
						</div>

						<div class="flex items-center gap-4">
							<Toggle bind:checked={formData.useCustomExchangeRate}>{$t('settings.useCustomExchangeRate')}</Toggle>
						</div>

						<div>
							<Label for="distanceUnit">{$t('settings.distanceUnit')}</Label>
							<Select id="distanceUnit" bind:value={formData.preferredDistanceUnit}>
								<option value="km">{$t('settings.kilometers')}</option>
								<option value="mile">{$t('settings.miles')}</option>
							</Select>
						</div>

						<div>
							<Label for="currency">{$t('settings.preferredCurrency')}</Label>
							<Select id="currency" bind:value={formData.preferredCurrency}>
								<option value="HNL">{$t('settings.hnl')}</option>
								<option value="USD">{$t('settings.usd')}</option>
							</Select>
						</div>
					</div>
				</Card>

				<div class="mt-6 flex justify-end">
					<Button onclick={handleSave} disabled={isSaving}>
						{#if isSaving}
							<Spinner size="4" class="mr-2" />
						{/if}
						{$t('settings.saveParameters')}
					</Button>
				</div>
			</TabItem>

			<TabItem title={$t('settings.tabs.organization')}>
				<Card class="max-w-none mt-4">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('settings.organization.title')}</h5>

					{#if tenant}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<Label>{$t('settings.organization.companyName')}</Label>
								<p class="text-lg font-medium text-gray-900 dark:text-white">{tenant.companyName}</p>
							</div>
							<div>
								<Label>{$t('settings.organization.plan')}</Label>
								<StatusBadge status={tenant.plan} variant="plan" showIcon />
							</div>
							<div>
								<Label>{$t('settings.organization.primaryContact')}</Label>
								<p class="text-gray-700 dark:text-gray-300">{tenant.primaryContactEmail}</p>
							</div>
							<div>
								<Label>{$t('settings.organization.timezone')}</Label>
								<p class="text-gray-700 dark:text-gray-300">{tenant.timezone}</p>
							</div>
							<div>
								<Label>{$t('settings.organization.status')}</Label>
								<StatusBadge status={tenant.status} showIcon />
							</div>
							<div>
								<Label>{$t('settings.organization.country')}</Label>
								<p class="text-gray-700 dark:text-gray-300">{tenant.country}</p>
							</div>
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400">{$t('settings.organization.notAvailable')}</p>
					{/if}
				</Card>
			</TabItem>

			<TabItem title={$t('settings.tabs.about')}>
				<Card class="max-w-none mt-4">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('settings.about.title')}</h5>

					<div class="space-y-4">
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-sm text-gray-600 dark:text-gray-400">{$t('settings.about.version')}</p>
							<p class="text-lg font-semibold text-gray-900 dark:text-white">1.0.0</p>
						</div>

						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-sm text-gray-600 dark:text-gray-400">{$t('settings.about.techStack')}</p>
							<p class="text-gray-900 dark:text-white">SvelteKit 2 + Svelte 5 + TailwindCSS 4 + Flowbite + Convex</p>
						</div>

						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-sm text-gray-600 dark:text-gray-400">{$t('settings.about.features')}</p>
							<ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
								<li>{$t('settings.about.featuresList.routeCalc')}</li>
								<li>{$t('settings.about.featuresList.pricing')}</li>
								<li>{$t('settings.about.featuresList.currency')}</li>
								<li>{$t('settings.about.featuresList.costs')}</li>
								<li>{$t('settings.about.featuresList.multiTenant')}</li>
								<li>{$t('settings.about.featuresList.darkMode')}</li>
							</ul>
						</div>
					</div>
				</Card>
			</TabItem>
		</Tabs>
	{/if}
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
