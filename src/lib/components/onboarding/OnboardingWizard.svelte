<script lang="ts">
	import { Modal, Button, Progressbar } from 'flowbite-svelte';
	import {
		FileLinesOutline,
		UsersOutline,
		TruckOutline,
		UserOutline,
		ChartPieOutline,
		ArrowRightOutline,
		ArrowLeftOutline,
		CheckOutline,
		RocketOutline
	} from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';
	import { browser } from '$app/environment';

	interface Props {
		userName?: string;
	}

	let { userName = 'there' }: Props = $props();

	const ONBOARDING_KEY = 'routewise_onboarding_completed';

	// Check if onboarding was already completed
	let showOnboarding = $state(false);

	$effect(() => {
		if (browser) {
			const completed = localStorage.getItem(ONBOARDING_KEY);
			if (!completed) {
				// Small delay to let the page render first
				setTimeout(() => {
					showOnboarding = true;
				}, 500);
			}
		}
	});

	let currentStep = $state(0);

	const steps = [
		{
			title: 'Welcome to RouteWise!',
			description: 'Your complete transportation quotation and fleet management platform. Let\'s take a quick tour of the key features.',
			icon: RocketOutline,
			color: 'text-primary-500'
		},
		{
			title: 'Create Quotations',
			description: 'Generate professional transportation quotes with automatic cost calculation, route planning via Google Maps, and multiple pricing options.',
			icon: FileLinesOutline,
			color: 'text-blue-500',
			tip: 'Start by clicking "New Quotation" on the dashboard or navigation bar.'
		},
		{
			title: 'Manage Your Fleet',
			description: 'Track all your vehicles, their costs, capacity, and availability. Set fuel consumption rates and daily costs for accurate pricing.',
			icon: TruckOutline,
			color: 'text-purple-500',
			tip: 'Go to Vehicles to add your fleet with their specifications.'
		},
		{
			title: 'Driver Management',
			description: 'Keep track of your drivers, their license expiry dates, and availability. Get alerts before licenses expire.',
			icon: UserOutline,
			color: 'text-orange-500',
			tip: 'Add drivers in the Drivers section with their license information.'
		},
		{
			title: 'Client Database',
			description: 'Maintain a database of your clients with contact info, discounts, and quotation history. Support for both individuals and companies.',
			icon: UsersOutline,
			color: 'text-green-500',
			tip: 'Add clients before creating quotations for a streamlined workflow.'
		},
		{
			title: 'Reports & Analytics',
			description: 'Monitor your business with comprehensive dashboards, sales reports, receivables aging, and utilization metrics. Export data to CSV anytime.',
			icon: ChartPieOutline,
			color: 'text-cyan-500',
			tip: 'Check the Dashboard daily and explore detailed Reports weekly.'
		}
	];

	const totalSteps = steps.length;
	const progress = $derived(((currentStep + 1) / totalSteps) * 100);
	const isLastStep = $derived(currentStep === totalSteps - 1);
	const isFirstStep = $derived(currentStep === 0);

	function nextStep() {
		if (currentStep < totalSteps - 1) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function completeOnboarding() {
		if (browser) {
			localStorage.setItem(ONBOARDING_KEY, 'true');
		}
		showOnboarding = false;
	}

	function skipOnboarding() {
		completeOnboarding();
	}
</script>

<Modal bind:open={showOnboarding} size="lg" dismissable={false} class="!bg-white dark:!bg-gray-800">
	<div class="p-2">
		<!-- Progress bar -->
		<div class="mb-6">
			<Progressbar progress={progress} size="h-1.5" color="blue" />
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
				{currentStep + 1} / {totalSteps}
			</p>
		</div>

		<!-- Step content -->
		{#each steps as step, i}
			{#if i === currentStep}
				<div class="text-center">
					<!-- Icon -->
					<div class="flex justify-center mb-6">
						<div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
							<svelte:component this={step.icon} class="w-12 h-12 {step.color}" />
						</div>
					</div>

					<!-- Title -->
					<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
						{#if i === 0}
							{step.title.replace('!', `, ${userName}!`)}
						{:else}
							{step.title}
						{/if}
					</h3>

					<!-- Description -->
					<p class="text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">
						{step.description}
					</p>

					<!-- Tip -->
					{#if step.tip}
						<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-md mx-auto">
							<p class="text-sm text-blue-700 dark:text-blue-300">
								<strong>Tip:</strong> {step.tip}
							</p>
						</div>
					{/if}
				</div>
			{/if}
		{/each}

		<!-- Navigation buttons -->
		<div class="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
			<div>
				{#if !isFirstStep}
					<Button color="light" onclick={prevStep}>
						<ArrowLeftOutline class="w-4 h-4 mr-2" />
						Back
					</Button>
				{:else}
					<Button color="light" onclick={skipOnboarding}>
						Skip tour
					</Button>
				{/if}
			</div>

			<div>
				{#if isLastStep}
					<Button color="blue" onclick={completeOnboarding}>
						<CheckOutline class="w-4 h-4 mr-2" />
						Get Started
					</Button>
				{:else}
					<Button color="blue" onclick={nextStep}>
						Next
						<ArrowRightOutline class="w-4 h-4 ml-2" />
					</Button>
				{/if}
			</div>
		</div>
	</div>
</Modal>
