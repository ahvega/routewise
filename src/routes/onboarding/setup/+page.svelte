<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { Button, Input, Label, Select, Card, Progressbar, Alert, Spinner } from 'flowbite-svelte';
	import {
		BuildingOutline,
		GlobeOutline,
		EnvelopeOutline,
		PhoneOutline,
		MapPinAltOutline,
		CheckOutline,
		ArrowRightOutline,
		ArrowLeftOutline,
		RocketOutline
	} from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	let { data } = $props();

	const client = useConvexClient();

	// Wizard state
	let currentStep = $state(0);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Form data
	let companyName = $state('');
	let country = $state('HN');
	let city = $state('');
	let address = $state('');
	let phone = $state('');
	let timezone = $state('America/Tegucigalpa');

	const steps = [
		{ key: 'company', title: $t('onboarding.setup.companyInfo'), icon: BuildingOutline },
		{ key: 'location', title: $t('onboarding.setup.location'), icon: MapPinAltOutline },
		{ key: 'confirm', title: $t('onboarding.setup.confirm'), icon: CheckOutline }
	];

	// All Latin American Spanish/English speaking countries
	const countries = [
		// Central America
		{ value: 'HN', name: 'Honduras' },
		{ value: 'GT', name: 'Guatemala' },
		{ value: 'SV', name: 'El Salvador' },
		{ value: 'NI', name: 'Nicaragua' },
		{ value: 'CR', name: 'Costa Rica' },
		{ value: 'PA', name: 'Panamá' },
		{ value: 'BZ', name: 'Belize' },
		// North America
		{ value: 'MX', name: 'México' },
		{ value: 'US', name: 'United States' },
		// Caribbean
		{ value: 'DO', name: 'República Dominicana' },
		{ value: 'PR', name: 'Puerto Rico' },
		{ value: 'CU', name: 'Cuba' },
		// South America
		{ value: 'CO', name: 'Colombia' },
		{ value: 'VE', name: 'Venezuela' },
		{ value: 'EC', name: 'Ecuador' },
		{ value: 'PE', name: 'Perú' },
		{ value: 'BO', name: 'Bolivia' },
		{ value: 'CL', name: 'Chile' },
		{ value: 'AR', name: 'Argentina' },
		{ value: 'UY', name: 'Uruguay' },
		{ value: 'PY', name: 'Paraguay' },
		{ value: 'BR', name: 'Brasil' },
		{ value: 'GY', name: 'Guyana' },
		{ value: 'OTHER', name: 'Otro / Other' }
	];

	const timezones = [
		{ value: 'America/Tegucigalpa', name: 'Central Time (Honduras)' },
		{ value: 'America/Guatemala', name: 'Central Time (Guatemala)' },
		{ value: 'America/El_Salvador', name: 'Central Time (El Salvador)' },
		{ value: 'America/Managua', name: 'Central Time (Nicaragua)' },
		{ value: 'America/Costa_Rica', name: 'Central Time (Costa Rica)' },
		{ value: 'America/Panama', name: 'Eastern Time (Panama)' },
		{ value: 'America/Mexico_City', name: 'Central Time (Mexico)' },
		{ value: 'America/Bogota', name: 'Colombia Time' },
		{ value: 'America/New_York', name: 'Eastern Time (US)' },
		{ value: 'America/Los_Angeles', name: 'Pacific Time (US)' }
	];

	const totalSteps = steps.length;
	const progress = $derived(((currentStep + 1) / totalSteps) * 100);
	const isLastStep = $derived(currentStep === totalSteps - 1);
	const isFirstStep = $derived(currentStep === 0);

	// Validation
	const canProceed = $derived(() => {
		if (currentStep === 0) {
			return companyName.trim().length >= 2;
		}
		if (currentStep === 1) {
			return country && timezone;
		}
		return true;
	});

	function nextStep() {
		if (currentStep < totalSteps - 1 && canProceed()) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	async function handleSubmit() {
		if (isSubmitting) return;

		isSubmitting = true;
		errorMessage = '';

		try {
			// Create the organization with trial
			const result = await client.mutation(api.tenants.createWithTrial, {
				companyName: companyName.trim(),
				primaryContactEmail: data.user?.email || '',
				primaryContactPhone: phone || undefined,
				address: address || undefined,
				city: city || undefined,
				country,
				timezone,
				ownerWorkosUserId: data.user?.id || '',
				ownerFullName: [data.user?.firstName, data.user?.lastName].filter(Boolean).join(' ') || data.user?.email || 'User'
			});

			console.log('Organization created:', result);

			// Update session cookie with new tenant info via API
			const response = await fetch('/api/auth/update-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tenantId: result.tenantId,
					tenantSlug: result.slug,
					tenantName: companyName.trim(),
					needsOnboarding: false
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update session');
			}

			// Use window.location for a full page reload to ensure session is properly set
			// This avoids issues with Vite HMR reloading the page during SPA navigation
			window.location.href = '/';
		} catch (err) {
			console.error('Failed to create organization:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to create organization. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('onboarding.setup.title')} | RouteWise</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<Card size="lg" class="w-full max-w-2xl">
		<div class="p-6">
			<!-- Header -->
			<div class="text-center mb-8">
				<div class="flex justify-center mb-4">
					<div class="p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
						<RocketOutline class="w-8 h-8 text-primary-600 dark:text-primary-400" />
					</div>
				</div>
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
					{$t('onboarding.setup.welcome')}
				</h1>
				<p class="text-gray-600 dark:text-gray-400 mt-2">
					{$t('onboarding.setup.subtitle')}
				</p>
			</div>

			<!-- Progress bar -->
			<div class="mb-8">
				<Progressbar progress={progress} size="h-2" color="blue" />
				<div class="flex justify-between mt-2">
					{#each steps as step, i}
						<div class="flex items-center text-xs {i <= currentStep ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}">
							<span class="w-6 h-6 rounded-full flex items-center justify-center mr-1 {i < currentStep ? 'bg-primary-600 text-white' : i === currentStep ? 'bg-primary-100 dark:bg-primary-900 text-primary-600' : 'bg-gray-200 dark:bg-gray-700'}">
								{#if i < currentStep}
									<CheckOutline class="w-3 h-3" />
								{:else}
									{i + 1}
								{/if}
							</span>
							<span class="hidden sm:inline">{step.title}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Error message -->
			{#if errorMessage}
				<Alert color="red" class="mb-4">
					{errorMessage}
				</Alert>
			{/if}

			<!-- Step content -->
			<div class="space-y-6">
				{#if currentStep === 0}
					<!-- Company Info -->
					<div class="space-y-4">
						<div>
							<Label for="companyName" class="mb-2">{$t('onboarding.setup.companyName')} *</Label>
							<Input
								id="companyName"
								bind:value={companyName}
								placeholder={$t('onboarding.setup.companyNamePlaceholder')}
								required
								class="pl-10"
							>
								{#snippet left()}
									<BuildingOutline class="w-5 h-5 text-gray-500" />
								{/snippet}
							</Input>
							<p class="text-xs text-gray-500 mt-1">{$t('onboarding.setup.companyNameHelp')}</p>
						</div>

						<div>
							<Label for="phone" class="mb-2">{$t('onboarding.setup.phone')}</Label>
							<Input
								id="phone"
								bind:value={phone}
								placeholder="+504 9999-1234"
								type="tel"
								class="pl-10"
							>
								{#snippet left()}
									<PhoneOutline class="w-5 h-5 text-gray-500" />
								{/snippet}
							</Input>
						</div>
					</div>
				{:else if currentStep === 1}
					<!-- Location -->
					<div class="space-y-4">
						<div>
							<Label for="country" class="mb-2">{$t('onboarding.setup.country')} *</Label>
							<Select id="country" bind:value={country} items={countries} />
						</div>

						<div>
							<Label for="city" class="mb-2">{$t('onboarding.setup.city')}</Label>
							<Input
								id="city"
								bind:value={city}
								placeholder={$t('onboarding.setup.cityPlaceholder')}
								class="pl-10"
							>
								{#snippet left()}
									<MapPinAltOutline class="w-5 h-5 text-gray-500" />
								{/snippet}
							</Input>
						</div>

						<div>
							<Label for="address" class="mb-2">{$t('onboarding.setup.address')}</Label>
							<Input
								id="address"
								bind:value={address}
								placeholder={$t('onboarding.setup.addressPlaceholder')}
								class="pl-10"
							>
								{#snippet left()}
									<MapPinAltOutline class="w-5 h-5 text-gray-500" />
								{/snippet}
							</Input>
						</div>

						<div>
							<Label for="timezone" class="mb-2">{$t('onboarding.setup.timezone')} *</Label>
							<Select id="timezone" bind:value={timezone} items={timezones} />
						</div>
					</div>
				{:else if currentStep === 2}
					<!-- Confirmation -->
					<div class="space-y-4">
						<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
							<h3 class="font-semibold text-gray-900 dark:text-white">
								{$t('onboarding.setup.reviewInfo')}
							</h3>

							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span class="text-gray-500">{$t('onboarding.setup.companyName')}:</span>
									<p class="font-medium text-gray-900 dark:text-white">{companyName}</p>
								</div>
								<div>
									<span class="text-gray-500">{$t('onboarding.setup.email')}:</span>
									<p class="font-medium text-gray-900 dark:text-white">{data.user?.email}</p>
								</div>
								<div>
									<span class="text-gray-500">{$t('onboarding.setup.country')}:</span>
									<p class="font-medium text-gray-900 dark:text-white">
										{countries.find(c => c.value === country)?.name || country}
									</p>
								</div>
								{#if city}
									<div>
										<span class="text-gray-500">{$t('onboarding.setup.city')}:</span>
										<p class="font-medium text-gray-900 dark:text-white">{city}</p>
									</div>
								{/if}
								<div>
									<span class="text-gray-500">{$t('onboarding.setup.timezone')}:</span>
									<p class="font-medium text-gray-900 dark:text-white">
										{timezones.find(t => t.value === timezone)?.name || timezone}
									</p>
								</div>
							</div>
						</div>

						<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<h4 class="font-medium text-blue-800 dark:text-blue-300 mb-2">
								{$t('onboarding.setup.trialInfo')}
							</h4>
							<ul class="text-sm text-blue-700 dark:text-blue-400 space-y-1">
								<li>• {$t('onboarding.setup.trialDays')}</li>
								<li>• {$t('onboarding.setup.trialFeatures')}</li>
								<li>• {$t('onboarding.setup.noCardRequired')}</li>
							</ul>
						</div>
					</div>
				{/if}
			</div>

			<!-- Navigation buttons -->
			<div class="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
				<div>
					{#if !isFirstStep}
						<Button type="button" color="light" onclick={prevStep} disabled={isSubmitting}>
							<ArrowLeftOutline class="w-4 h-4 mr-2" />
							{$t('onboarding.back')}
						</Button>
					{/if}
				</div>

				<div>
					{#if isLastStep}
						<Button type="button" color="blue" onclick={handleSubmit} disabled={isSubmitting}>
							{#if isSubmitting}
								<Spinner size="4" class="mr-2" />
								{$t('onboarding.setup.creating')}
							{:else}
								<RocketOutline class="w-4 h-4 mr-2" />
								{$t('onboarding.setup.startTrial')}
							{/if}
						</Button>
					{:else}
						<Button type="button" color="blue" onclick={nextStep} disabled={!canProceed()}>
							{$t('onboarding.next')}
							<ArrowRightOutline class="w-4 h-4 ml-2" />
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</Card>
</div>
