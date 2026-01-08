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
		Toast,
		Helper,
		Fileupload,
		Alert
	} from 'flowbite-svelte';
	import { CheckCircleOutline, CloseCircleOutline, CogOutline, UsersOutline, CreditCardOutline, ChevronRightOutline, UploadOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';
	import {
		LATIN_AMERICAN_CURRENCIES,
		getCurrencySymbol,
		getDefaultExchangeRate,
		formatCurrency,
		convertCurrency
	} from '$lib/services/currency';

	const client = useConvexClient();

	// Query exchange rates from Convex (updated daily automatically)
	const exchangeRatesQuery = useQuery(api.exchangeRates.getLatest, {});

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

	// Pricing level type
	type PricingLevel = {
		key: string;
		name: string;
		discountPercentage: number;
		isDefault?: boolean;
	};

	// License category type
	type LicenseCategory = {
		key: string;
		name: string;
		description?: string;
	};

	// Form state for parameters
	let formData = $state({
		// Currency configuration
		localCurrency: 'HNL',
		exchangeRate: 24.75,
		useCustomExchangeRate: true,
		preferredDistanceUnit: 'km',
		preferredCurrency: 'HNL',
		// Operating costs
		fuelPrice: 110,
		fuelPriceCurrency: 'HNL',
		mealCostPerDay: 250,
		mealCostCurrency: 'HNL',
		hotelCostPerNight: 800,
		hotelCostCurrency: 'HNL',
		driverIncentivePerDay: 500,
		driverIncentiveCurrency: 'HNL',
		// Rounding
		roundingLocal: 100,
		roundingUsd: 5,
		// Terms
		quotationValidityDays: 30,
		// Pricing levels
		pricingLevels: [
			{ key: 'standard', name: 'Estándar', discountPercentage: 0, isDefault: true },
			{ key: 'preferred', name: 'Preferencial', discountPercentage: 5 },
			{ key: 'vip', name: 'VIP', discountPercentage: 10 }
		] as PricingLevel[],
		// License categories
		licenseCategories: [
			{ key: 'comercial_a', name: 'Comercial A', description: 'Vehículos comerciales pesados' },
			{ key: 'comercial_b', name: 'Comercial B', description: 'Vehículos comerciales livianos' },
			{ key: 'particular', name: 'Particular', description: 'Vehículos particulares' }
		] as LicenseCategory[]
	});

	// Form state for organization
	let orgFormData = $state({
		companyName: '',
		primaryContactEmail: '',
		primaryContactPhone: '',
		address: '',
		city: '',
		country: '',
		timezone: ''
	});

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Loading states
	let isSaving = $state(false);
	let isSavingOrg = $state(false);
	let isUploadingLogo = $state(false);
	let isDeletingLogo = $state(false);

	// Logo upload state
	let logoError = $state<string | null>(null);
	const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
	const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

	// Default pricing levels
	const defaultPricingLevels: PricingLevel[] = [
		{ key: 'standard', name: 'Estándar', discountPercentage: 0, isDefault: true },
		{ key: 'preferred', name: 'Preferencial', discountPercentage: 5 },
		{ key: 'vip', name: 'VIP', discountPercentage: 10 }
	];

	// Default license categories
	const defaultLicenseCategories: LicenseCategory[] = [
		{ key: 'comercial_a', name: 'Comercial A', description: 'Vehículos comerciales pesados' },
		{ key: 'comercial_b', name: 'Comercial B', description: 'Vehículos comerciales livianos' },
		{ key: 'particular', name: 'Particular', description: 'Vehículos particulares' }
	];

	// Update form when parameters data loads
	$effect(() => {
		const params = parametersQuery.data;
		if (params) {
			const localCurr = params.localCurrency || 'HNL';
			formData = {
				localCurrency: localCurr,
				exchangeRate: params.exchangeRate,
				useCustomExchangeRate: params.useCustomExchangeRate,
				preferredDistanceUnit: params.preferredDistanceUnit,
				preferredCurrency: params.preferredCurrency,
				fuelPrice: params.fuelPrice,
				fuelPriceCurrency: params.fuelPriceCurrency || localCurr,
				mealCostPerDay: params.mealCostPerDay,
				mealCostCurrency: params.mealCostCurrency || localCurr,
				hotelCostPerNight: params.hotelCostPerNight,
				hotelCostCurrency: params.hotelCostCurrency || localCurr,
				driverIncentivePerDay: params.driverIncentivePerDay,
				driverIncentiveCurrency: params.driverIncentiveCurrency || localCurr,
				roundingLocal: params.roundingLocal || 100,
				roundingUsd: params.roundingUsd || 5,
				quotationValidityDays: params.quotationValidityDays || 30,
				pricingLevels: (params.pricingLevels as PricingLevel[]) || defaultPricingLevels,
				licenseCategories: (params.licenseCategories as LicenseCategory[]) || defaultLicenseCategories
			};
		}
	});

	// Update org form when tenant data loads
	$effect(() => {
		const tenant = tenantQuery.data;
		if (tenant) {
			orgFormData = {
				companyName: tenant.companyName,
				primaryContactEmail: tenant.primaryContactEmail,
				primaryContactPhone: tenant.primaryContactPhone || '',
				address: tenant.address || '',
				city: tenant.city || '',
				country: tenant.country,
				timezone: tenant.timezone
			};
		}
	});

	// Derived values
	const parameters = $derived(parametersQuery.data);
	const tenant = $derived(tenantQuery.data);
	const exchangeRates = $derived(exchangeRatesQuery.data);
	const isLoading = $derived(parametersQuery.isLoading);
	const localCurrencySymbol = $derived(getCurrencySymbol(formData.localCurrency));
	const localCurrencyInfo = $derived(LATIN_AMERICAN_CURRENCIES.find(c => c.code === formData.localCurrency));

	// Exchange rate info
	const liveExchangeRate = $derived(
		exchangeRates?.rates?.[formData.localCurrency as keyof typeof exchangeRates.rates] || getDefaultExchangeRate(formData.localCurrency)
	);
	const exchangeRateLastUpdate = $derived(exchangeRates?.fetchedAt);
	const exchangeRateSource = $derived(exchangeRates?.source || 'default');

	// Currency options for cost fields
	const currencyOptions = $derived([
		{ value: 'USD', name: 'USD ($)' },
		{ value: formData.localCurrency, name: `${formData.localCurrency} (${localCurrencySymbol})` }
	]);

	// Derived converted values for display
	const fuelConverted = $derived(getConvertedValue(formData.fuelPrice, formData.fuelPriceCurrency));
	const mealConverted = $derived(getConvertedValue(formData.mealCostPerDay, formData.mealCostCurrency));
	const hotelConverted = $derived(getConvertedValue(formData.hotelCostPerNight, formData.hotelCostCurrency));
	const driverConverted = $derived(getConvertedValue(formData.driverIncentivePerDay, formData.driverIncentiveCurrency));

	async function handleSave() {
		if (!tenantStore.tenantId) return;

		isSaving = true;
		try {
			const params = parametersQuery.data;
			if (params) {
				await client.mutation(api.parameters.update, {
					id: params._id,
					localCurrency: formData.localCurrency,
					exchangeRate: formData.exchangeRate,
					useCustomExchangeRate: formData.useCustomExchangeRate,
					preferredDistanceUnit: formData.preferredDistanceUnit,
					preferredCurrency: formData.preferredCurrency,
					fuelPrice: formData.fuelPrice,
					fuelPriceCurrency: formData.fuelPriceCurrency,
					mealCostPerDay: formData.mealCostPerDay,
					mealCostCurrency: formData.mealCostCurrency,
					hotelCostPerNight: formData.hotelCostPerNight,
					hotelCostCurrency: formData.hotelCostCurrency,
					driverIncentivePerDay: formData.driverIncentivePerDay,
					driverIncentiveCurrency: formData.driverIncentiveCurrency,
					roundingLocal: formData.roundingLocal,
					roundingUsd: formData.roundingUsd,
					quotationValidityDays: formData.quotationValidityDays,
					pricingLevels: formData.pricingLevels,
					licenseCategories: formData.licenseCategories
				});
			} else {
				await client.mutation(api.parameters.create, {
					tenantId: tenantStore.tenantId,
					year: new Date().getFullYear(),
					localCurrency: formData.localCurrency,
					exchangeRate: formData.exchangeRate,
					useCustomExchangeRate: formData.useCustomExchangeRate,
					preferredDistanceUnit: formData.preferredDistanceUnit,
					preferredCurrency: formData.preferredCurrency,
					fuelPrice: formData.fuelPrice,
					fuelPriceCurrency: formData.fuelPriceCurrency,
					mealCostPerDay: formData.mealCostPerDay,
					mealCostCurrency: formData.mealCostCurrency,
					hotelCostPerNight: formData.hotelCostPerNight,
					hotelCostCurrency: formData.hotelCostCurrency,
					driverIncentivePerDay: formData.driverIncentivePerDay,
					driverIncentiveCurrency: formData.driverIncentiveCurrency,
					roundingLocal: formData.roundingLocal,
					roundingUsd: formData.roundingUsd,
					quotationValidityDays: formData.quotationValidityDays,
					pricingLevels: formData.pricingLevels,
					licenseCategories: formData.licenseCategories,
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

	async function handleSaveOrg() {
		if (!tenantStore.tenantId) return;

		isSavingOrg = true;
		try {
			await client.mutation(api.tenants.update, {
				id: tenantStore.tenantId,
				companyName: orgFormData.companyName,
				primaryContactEmail: orgFormData.primaryContactEmail,
				primaryContactPhone: orgFormData.primaryContactPhone || undefined,
				address: orgFormData.address || undefined,
				city: orgFormData.city || undefined,
				country: orgFormData.country,
				timezone: orgFormData.timezone
			});
			showToastMessage($t('settings.updateSuccess'), 'success');
		} catch (error) {
			console.error('Failed to save organization:', error);
			showToastMessage($t('settings.saveFailed'), 'error');
		} finally {
			isSavingOrg = false;
		}
	}

	async function handleLogoUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file || !tenantStore.tenantId) return;

		// Validate file type
		if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
			logoError = 'Formato no válido. Use PNG, JPG o SVG.';
			return;
		}

		// Validate file size
		if (file.size > MAX_LOGO_SIZE) {
			logoError = 'El archivo es muy grande. Máximo 5MB.';
			return;
		}

		logoError = null;
		isUploadingLogo = true;

		try {
			// Get upload URL from Convex
			const uploadUrl = await client.mutation(api.tenants.generateLogoUploadUrl, {});

			// Upload file to Convex storage
			const response = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});

			if (!response.ok) {
				throw new Error('Failed to upload file');
			}

			const { storageId } = await response.json();

			// Save logo reference to tenant
			await client.mutation(api.tenants.saveLogo, {
				tenantId: tenantStore.tenantId,
				storageId
			});

			showToastMessage('Logo actualizado exitosamente', 'success');
		} catch (error) {
			console.error('Failed to upload logo:', error);
			logoError = 'Error al subir el logo. Intente nuevamente.';
			showToastMessage('Error al subir el logo', 'error');
		} finally {
			isUploadingLogo = false;
			// Reset file input
			input.value = '';
		}
	}

	async function handleDeleteLogo() {
		if (!tenantStore.tenantId) return;

		isDeletingLogo = true;
		try {
			await client.mutation(api.tenants.deleteLogo, {
				tenantId: tenantStore.tenantId
			});
			showToastMessage('Logo eliminado', 'success');
		} catch (error) {
			console.error('Failed to delete logo:', error);
			showToastMessage('Error al eliminar el logo', 'error');
		} finally {
			isDeletingLogo = false;
		}
	}

	function handleLocalCurrencyChange() {
		// Update all currency fields to use the new local currency
		formData.fuelPriceCurrency = formData.localCurrency;
		formData.mealCostCurrency = formData.localCurrency;
		formData.hotelCostCurrency = formData.localCurrency;
		formData.driverIncentiveCurrency = formData.localCurrency;
		formData.preferredCurrency = formData.localCurrency;
		// Auto-apply live exchange rate when not using custom rate
		if (!formData.useCustomExchangeRate) {
			const rate = exchangeRates?.rates?.[formData.localCurrency as keyof typeof exchangeRates.rates];
			formData.exchangeRate = rate ? Math.round(rate * 100) / 100 : getDefaultExchangeRate(formData.localCurrency);
		} else {
			formData.exchangeRate = getDefaultExchangeRate(formData.localCurrency);
		}
	}

	// Auto-update exchange rate when useCustomExchangeRate is toggled off
	$effect(() => {
		if (!formData.useCustomExchangeRate && exchangeRates?.rates) {
			const rate = exchangeRates.rates[formData.localCurrency as keyof typeof exchangeRates.rates];
			if (rate) {
				formData.exchangeRate = Math.round(rate * 100) / 100;
			}
		}
	});

	// Format last update time
	function formatLastUpdate(timestamp: number | undefined): string {
		if (!timestamp) return 'Nunca';
		const date = new Date(timestamp);
		const now = new Date();
		const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

		if (diffHours < 1) return 'Hace menos de 1 hora';
		if (diffHours < 24) return `Hace ${diffHours} horas`;
		return date.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	function formatLocalCurrency(value: number): string {
		return formatCurrency(value, formData.localCurrency);
	}

	// Convert cost to display in both currencies
	function getConvertedValue(value: number, fromCurrency: string): { local: number; usd: number } {
		if (fromCurrency === 'USD') {
			return {
				usd: value,
				local: convertCurrency(value, 'USD', formData.localCurrency, formData.exchangeRate)
			};
		} else {
			return {
				local: value,
				usd: convertCurrency(value, formData.localCurrency, 'USD', formData.exchangeRate)
			};
		}
	}

	// Currency change handlers - convert value when currency changes
	function handleFuelCurrencyChange(event: Event) {
		const newCurrency = (event.target as HTMLSelectElement).value;
		const oldCurrency = formData.fuelPriceCurrency;
		if (newCurrency !== oldCurrency) {
			formData.fuelPrice = Math.round(convertCurrency(formData.fuelPrice, oldCurrency, newCurrency, formData.exchangeRate) * 100) / 100;
			formData.fuelPriceCurrency = newCurrency;
		}
	}

	function handleMealCurrencyChange(event: Event) {
		const newCurrency = (event.target as HTMLSelectElement).value;
		const oldCurrency = formData.mealCostCurrency;
		if (newCurrency !== oldCurrency) {
			formData.mealCostPerDay = Math.round(convertCurrency(formData.mealCostPerDay, oldCurrency, newCurrency, formData.exchangeRate) * 100) / 100;
			formData.mealCostCurrency = newCurrency;
		}
	}

	function handleHotelCurrencyChange(event: Event) {
		const newCurrency = (event.target as HTMLSelectElement).value;
		const oldCurrency = formData.hotelCostCurrency;
		if (newCurrency !== oldCurrency) {
			formData.hotelCostPerNight = Math.round(convertCurrency(formData.hotelCostPerNight, oldCurrency, newCurrency, formData.exchangeRate) * 100) / 100;
			formData.hotelCostCurrency = newCurrency;
		}
	}

	function handleDriverCurrencyChange(event: Event) {
		const newCurrency = (event.target as HTMLSelectElement).value;
		const oldCurrency = formData.driverIncentiveCurrency;
		if (newCurrency !== oldCurrency) {
			formData.driverIncentivePerDay = Math.round(convertCurrency(formData.driverIncentivePerDay, oldCurrency, newCurrency, formData.exchangeRate) * 100) / 100;
			formData.driverIncentiveCurrency = newCurrency;
		}
	}

	// Get currency label for display
	function getCurrencyLabel(currency: string): string {
		return currency === 'USD' ? 'USD' : formData.localCurrency;
	}
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

	<!-- Quick Navigation Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<a href="/settings/team" class="block h-full">
			<Card class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer h-full p-6">
				<div class="flex items-center justify-between h-full">
					<div class="flex items-center gap-4">
						<div class="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
							<UsersOutline class="w-7 h-7 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('settings.team.title')}</h3>
							<p class="text-sm text-gray-500">{$t('settings.team.subtitle')}</p>
						</div>
					</div>
					<ChevronRightOutline class="w-5 h-5 text-gray-400" />
				</div>
			</Card>
		</a>
		<a href="/settings/billing" class="block h-full">
			<Card class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer h-full p-6">
				<div class="flex items-center justify-between h-full">
					<div class="flex items-center gap-4">
						<div class="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
							<CreditCardOutline class="w-7 h-7 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('settings.billing.title')}</h3>
							<p class="text-sm text-gray-500">{$t('settings.billing.subtitle')}</p>
						</div>
					</div>
					<ChevronRightOutline class="w-5 h-5 text-gray-400" />
				</div>
			</Card>
		</a>
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else}
		<Tabs>
			<TabItem open title={$t('settings.tabs.costParameters')}>
				<!-- Currency Configuration -->
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuración de Moneda</h5>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<Label for="localCurrency">Moneda Local</Label>
							<Select id="localCurrency" bind:value={formData.localCurrency} onchange={handleLocalCurrencyChange}>
								{#each LATIN_AMERICAN_CURRENCIES as currency}
									<option value={currency.code}>{currency.code} - {currency.name} ({currency.country})</option>
								{/each}
							</Select>
							<Helper class="mt-1">Moneda principal para operaciones locales</Helper>
						</div>

						<div>
							<Label for="exchangeRate">Tasa de Cambio (1 USD = ?)</Label>
							<div class="flex gap-2">
								<Input
									id="exchangeRate"
									type="number"
									bind:value={formData.exchangeRate}
									step="0.01"
									min="0"
									disabled={!formData.useCustomExchangeRate}
									class="flex-1"
								/>
							</div>
							<Helper class="mt-1">
								{#if formData.useCustomExchangeRate}
									1 USD = {formData.exchangeRate} {formData.localCurrency} (manual)
								{:else}
									1 USD = {formData.exchangeRate} {formData.localCurrency}
									<span class="text-green-600 dark:text-green-400">
										• Actualizado {formatLastUpdate(exchangeRateLastUpdate)}
									</span>
								{/if}
							</Helper>
						</div>

						<div class="flex flex-col gap-2">
							<Toggle bind:checked={formData.useCustomExchangeRate}>
								Usar tasa manual
							</Toggle>
							<Helper class="text-xs">
								{#if formData.useCustomExchangeRate}
									Ingrese su tasa de cambio manualmente
								{:else}
									<span class="text-green-600 dark:text-green-400">✓</span> Tasa automática desde {exchangeRateSource === 'apilayer' ? 'API Layer' : exchangeRateSource === 'default' ? 'API Layer' : exchangeRateSource}
								{/if}
							</Helper>
						</div>
					</div>
				</Card>

				<!-- Operating Costs -->
				<Card class="max-w-none mt-4 !p-6">
					<div class="flex items-center gap-2 mb-4">
						<CogOutline class="w-5 h-5 text-gray-500 dark:text-gray-400" />
						<h5 class="text-lg font-semibold text-gray-900 dark:text-white">{$t('settings.operatingCosts')}</h5>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Fuel Price -->
						<div>
							<Label for="fuelPrice">Precio Combustible ({formData.fuelPriceCurrency})</Label>
							<div class="flex gap-2">
								<Input id="fuelPrice" type="number" bind:value={formData.fuelPrice} step="0.01" min="0" class="flex-1" />
								<Select value={formData.fuelPriceCurrency} onchange={handleFuelCurrencyChange} class="w-28">
									{#each currencyOptions as opt}
										<option value={opt.value}>{opt.value}</option>
									{/each}
								</Select>
							</div>
							<Helper class="mt-1">
								{formatCurrency(fuelConverted.local, formData.localCurrency)} / ${fuelConverted.usd.toFixed(2)} USD por galón
							</Helper>
						</div>

						<!-- Meal Cost -->
						<div>
							<Label for="mealCost">Costo de Comidas por Día ({formData.mealCostCurrency})</Label>
							<div class="flex gap-2">
								<Input id="mealCost" type="number" bind:value={formData.mealCostPerDay} step="0.01" min="0" class="flex-1" />
								<Select value={formData.mealCostCurrency} onchange={handleMealCurrencyChange} class="w-28">
									{#each currencyOptions as opt}
										<option value={opt.value}>{opt.value}</option>
									{/each}
								</Select>
							</div>
							<Helper class="mt-1">
								{formatCurrency(mealConverted.local, formData.localCurrency)} / ${mealConverted.usd.toFixed(2)} USD por día
							</Helper>
						</div>

						<!-- Hotel Cost -->
						<div>
							<Label for="hotelCost">Costo de Hotel por Noche ({formData.hotelCostCurrency})</Label>
							<div class="flex gap-2">
								<Input id="hotelCost" type="number" bind:value={formData.hotelCostPerNight} step="0.01" min="0" class="flex-1" />
								<Select value={formData.hotelCostCurrency} onchange={handleHotelCurrencyChange} class="w-28">
									{#each currencyOptions as opt}
										<option value={opt.value}>{opt.value}</option>
									{/each}
								</Select>
							</div>
							<Helper class="mt-1">
								{formatCurrency(hotelConverted.local, formData.localCurrency)} / ${hotelConverted.usd.toFixed(2)} USD por noche
							</Helper>
						</div>

						<!-- Driver Incentive -->
						<div>
							<Label for="driverIncentive">Incentivo Conductor por Día ({formData.driverIncentiveCurrency})</Label>
							<div class="flex gap-2">
								<Input id="driverIncentive" type="number" bind:value={formData.driverIncentivePerDay} step="0.01" min="0" class="flex-1" />
								<Select value={formData.driverIncentiveCurrency} onchange={handleDriverCurrencyChange} class="w-28">
									{#each currencyOptions as opt}
										<option value={opt.value}>{opt.value}</option>
									{/each}
								</Select>
							</div>
							<Helper class="mt-1">
								{formatCurrency(driverConverted.local, formData.localCurrency)} / ${driverConverted.usd.toFixed(2)} USD por día
							</Helper>
						</div>
					</div>
				</Card>

				<!-- Rounding & Terms -->
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Redondeo y Términos</h5>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<Label for="roundingLocal">Redondeo {formData.localCurrency}</Label>
							<Input id="roundingLocal" type="number" bind:value={formData.roundingLocal} step="1" min="1" />
							<Helper class="mt-1">Redondear a múltiplos de {formData.roundingLocal} {localCurrencySymbol}</Helper>
						</div>

						<div>
							<Label for="roundingUsd">Redondeo USD</Label>
							<Input id="roundingUsd" type="number" bind:value={formData.roundingUsd} step="1" min="1" />
							<Helper class="mt-1">Redondear a múltiplos de ${formData.roundingUsd}</Helper>
						</div>

						<div>
							<Label for="quotationValidity">Validez Cotización (días)</Label>
							<Input id="quotationValidity" type="number" bind:value={formData.quotationValidityDays} step="1" min="1" />
							<Helper class="mt-1">Días de validez para cotizaciones</Helper>
						</div>
					</div>
				</Card>

				<!-- Pricing Levels -->
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Niveles de Precios para Clientes</h5>
					<Helper class="mb-4">Define los niveles de precios y sus descuentos asociados para clientes</Helper>

					<div class="space-y-3">
						{#each formData.pricingLevels as level, index}
							<div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<div class="flex-1">
									<Label for="level-key-{index}" class="text-xs">Clave</Label>
									<Input
										id="level-key-{index}"
										bind:value={level.key}
										placeholder="ej: standard"
										size="sm"
									/>
								</div>
								<div class="flex-1">
									<Label for="level-name-{index}" class="text-xs">Nombre</Label>
									<Input
										id="level-name-{index}"
										bind:value={level.name}
										placeholder="ej: Estándar"
										size="sm"
									/>
								</div>
								<div class="w-32">
									<Label for="level-discount-{index}" class="text-xs">Descuento %</Label>
									<Input
										id="level-discount-{index}"
										type="number"
										bind:value={level.discountPercentage}
										min="0"
										max="100"
										step="1"
										size="sm"
									/>
								</div>
								<div class="w-28 flex items-end pb-1">
									<Toggle
										bind:checked={level.isDefault}
										size="small"
										onchange={() => {
											// Only one can be default
											if (level.isDefault) {
												formData.pricingLevels = formData.pricingLevels.map((l, i) => ({
													...l,
													isDefault: i === index
												}));
											}
										}}
									>
										<span class="text-xs">Preselec.</span>
									</Toggle>
								</div>
								<div class="flex items-end pb-1">
									<Button
										size="xs"
										color="red"
										outline
										disabled={formData.pricingLevels.length <= 1}
										onclick={() => {
											formData.pricingLevels = formData.pricingLevels.filter((_, i) => i !== index);
										}}
									>
										✕
									</Button>
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-4">
						<Button
							size="sm"
							color="light"
							onclick={() => {
								formData.pricingLevels = [
									...formData.pricingLevels,
									{ key: '', name: '', discountPercentage: 0 }
								];
							}}
						>
							+ Agregar Nivel
						</Button>
					</div>
				</Card>

				<!-- License Categories -->
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categorías de Licencia de Conducir</h5>
					<Helper class="mb-4">Define las categorías de licencia disponibles para los conductores</Helper>

					<div class="space-y-3">
						{#each formData.licenseCategories as category, index}
							<div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<div class="w-32">
									<Label for="cat-key-{index}" class="text-xs">Clave</Label>
									<Input
										id="cat-key-{index}"
										bind:value={category.key}
										placeholder="ej: comercial_a"
										size="sm"
									/>
								</div>
								<div class="flex-1">
									<Label for="cat-name-{index}" class="text-xs">Nombre</Label>
									<Input
										id="cat-name-{index}"
										bind:value={category.name}
										placeholder="ej: Comercial A"
										size="sm"
									/>
								</div>
								<div class="flex-1">
									<Label for="cat-desc-{index}" class="text-xs">Descripción</Label>
									<Input
										id="cat-desc-{index}"
										bind:value={category.description}
										placeholder="ej: Vehículos pesados"
										size="sm"
									/>
								</div>
								<div class="flex items-end pb-1">
									<Button
										size="xs"
										color="red"
										outline
										disabled={formData.licenseCategories.length <= 1}
										onclick={() => {
											formData.licenseCategories = formData.licenseCategories.filter((_, i) => i !== index);
										}}
									>
										✕
									</Button>
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-4">
						<Button
							size="sm"
							color="light"
							onclick={() => {
								formData.licenseCategories = [
									...formData.licenseCategories,
									{ key: '', name: '', description: '' }
								];
							}}
						>
							+ Agregar Categoría
						</Button>
					</div>
				</Card>

				<!-- Units -->
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unidades y Preferencias</h5>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<Label for="distanceUnit">{$t('settings.distanceUnit')}</Label>
							<Select id="distanceUnit" bind:value={formData.preferredDistanceUnit}>
								<option value="km">{$t('settings.kilometers')}</option>
								<option value="mile">{$t('settings.miles')}</option>
							</Select>
						</div>

						<div>
							<Label for="currency">Moneda de Visualización</Label>
							<Select id="currency" bind:value={formData.preferredCurrency}>
								<option value={formData.localCurrency}>{formData.localCurrency} ({localCurrencySymbol})</option>
								<option value="USD">USD ($)</option>
							</Select>
							<Helper class="mt-1">Moneda preferida para mostrar precios</Helper>
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
				<!-- Company Logo Upload -->
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Logo de la Empresa</h5>
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
						Este logo se mostrará en cotizaciones, facturas y documentos PDF.
					</p>

					{#if tenant}
						<div class="flex items-start gap-6">
							<!-- Logo Preview -->
							<div class="flex-shrink-0">
								<div class="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
									{#if tenant.logoUrl}
										<img
											src={tenant.logoUrl}
											alt="Logo de la empresa"
											class="max-w-full max-h-full object-contain"
										/>
									{:else}
										<div class="text-center text-gray-400 dark:text-gray-500 p-4">
											<UploadOutline class="w-8 h-8 mx-auto mb-2" />
											<span class="text-xs">Sin logo</span>
										</div>
									{/if}
								</div>
							</div>

							<!-- Upload Controls -->
							<div class="flex-1 space-y-4">
								<div>
									<Label for="logoUpload">Subir nuevo logo</Label>
									<input
										type="file"
										id="logoUpload"
										accept="image/png,image/jpeg,image/svg+xml"
										onchange={handleLogoUpload}
										disabled={isUploadingLogo}
										class="block w-full text-sm text-gray-500 dark:text-gray-400
											file:mr-4 file:py-2 file:px-4
											file:rounded-lg file:border-0
											file:text-sm file:font-semibold
											file:bg-primary-50 file:text-primary-700
											dark:file:bg-primary-900 dark:file:text-primary-300
											hover:file:bg-primary-100 dark:hover:file:bg-primary-800
											disabled:opacity-50 disabled:cursor-not-allowed"
									/>
									<Helper class="mt-1">PNG, JPG o SVG. Máximo 5MB.</Helper>
								</div>

								{#if logoError}
									<Alert color="red" class="!p-3">
										<span class="text-sm">{logoError}</span>
									</Alert>
								{/if}

								{#if isUploadingLogo}
									<div class="flex items-center gap-2 text-sm text-gray-500">
										<Spinner size="4" />
										<span>Subiendo logo...</span>
									</div>
								{/if}

								{#if tenant.logoUrl}
									<Button
										color="red"
										outline
										size="sm"
										onclick={handleDeleteLogo}
										disabled={isDeletingLogo}
									>
										{#if isDeletingLogo}
											<Spinner size="4" class="mr-2" />
										{:else}
											<TrashBinOutline class="w-4 h-4 mr-2" />
										{/if}
										Eliminar logo
									</Button>
								{/if}
							</div>
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400">Cargando...</p>
					{/if}
				</Card>

				<!-- Organization Info -->
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('settings.organization.title')}</h5>

					{#if tenant}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<Label for="companyName">{$t('settings.organization.companyName')}</Label>
								<Input id="companyName" bind:value={orgFormData.companyName} />
							</div>

							<div>
								<Label>{$t('settings.organization.plan')}</Label>
								<div class="mt-2">
									<StatusBadge status={tenant.plan} variant="plan" showIcon />
								</div>
							</div>

							<div>
								<Label for="primaryEmail">{$t('settings.organization.primaryContact')}</Label>
								<Input id="primaryEmail" type="email" bind:value={orgFormData.primaryContactEmail} />
							</div>

							<div>
								<Label for="primaryPhone">Teléfono</Label>
								<Input id="primaryPhone" bind:value={orgFormData.primaryContactPhone} />
							</div>

							<div>
								<Label for="address">Dirección</Label>
								<Input id="address" bind:value={orgFormData.address} />
							</div>

							<div>
								<Label for="city">Ciudad</Label>
								<Input id="city" bind:value={orgFormData.city} />
							</div>

							<div>
								<Label for="country">{$t('settings.organization.country')}</Label>
								<Input id="country" bind:value={orgFormData.country} />
							</div>

							<div>
								<Label for="timezone">{$t('settings.organization.timezone')}</Label>
								<Input id="timezone" bind:value={orgFormData.timezone} />
							</div>

							<div>
								<Label>{$t('settings.organization.status')}</Label>
								<div class="mt-2">
									<StatusBadge status={tenant.status} showIcon />
								</div>
							</div>
						</div>

						<div class="mt-6 flex justify-end">
							<Button onclick={handleSaveOrg} disabled={isSavingOrg}>
								{#if isSavingOrg}
									<Spinner size="4" class="mr-2" />
								{/if}
								Guardar Organización
							</Button>
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400">{$t('settings.organization.notAvailable')}</p>
					{/if}
				</Card>
			</TabItem>

			<TabItem title={$t('settings.tabs.about')}>
				<Card class="max-w-none mt-4 !p-6">
					<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{$t('settings.about.title')}</h5>

					<div class="space-y-4">
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<p class="text-sm text-gray-600 dark:text-gray-400">{$t('settings.about.version')}</p>
							<p class="text-lg font-semibold text-gray-900 dark:text-white">1.0.0</p>
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
