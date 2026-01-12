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

	const stepKeys = ['welcome', 'quotations', 'fleet', 'drivers', 'clients', 'reports'] as const;
	const stepIcons = [RocketOutline, FileLinesOutline, TruckOutline, UserOutline, UsersOutline, ChartPieOutline];
	const stepColors = ['text-primary-500', 'text-blue-500', 'text-purple-500', 'text-orange-500', 'text-green-500', 'text-cyan-500'];
	const stepsWithTips = ['quotations', 'fleet', 'drivers', 'clients', 'reports'];

	const totalSteps = stepKeys.length;
	const progress = $derived(((currentStep + 1) / totalSteps) * 100);
	const isLastStep = $derived(currentStep === totalSteps - 1);
	const isFirstStep = $derived(currentStep === 0);
	const currentStepKey = $derived(stepKeys[currentStep]);

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
		<div class="text-center">
			<!-- Icon -->
			<div class="flex justify-center mb-6">
				<div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
					{#if stepIcons[currentStep]}
						{@const StepIcon = stepIcons[currentStep]}
						<StepIcon class="w-12 h-12 {stepColors[currentStep]}" />
					{/if}
				</div>
			</div>

			<!-- Title -->
			<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
				{#if currentStep === 0}
					{$t(`onboarding.steps.${currentStepKey}.title`)}, {userName}!
				{:else}
					{$t(`onboarding.steps.${currentStepKey}.title`)}
				{/if}
			</h3>

			<!-- Description -->
			<p class="text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">
				{$t(`onboarding.steps.${currentStepKey}.description`)}
			</p>

			<!-- Tip -->
			{#if stepsWithTips.includes(currentStepKey)}
				<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-md mx-auto">
					<p class="text-sm text-blue-700 dark:text-blue-300">
						<strong>{$t('onboarding.tip')}</strong> {$t(`onboarding.steps.${currentStepKey}.tip`)}
					</p>
				</div>
			{/if}
		</div>

		<!-- Navigation buttons -->
		<div class="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
			<div>
				{#if !isFirstStep}
					<Button color="light" onclick={prevStep}>
						<ArrowLeftOutline class="w-4 h-4 mr-2" />
						{$t('onboarding.back')}
					</Button>
				{:else}
					<Button color="light" onclick={skipOnboarding}>
						{$t('onboarding.skipTour')}
					</Button>
				{/if}
			</div>

			<div>
				{#if isLastStep}
					<Button color="blue" onclick={completeOnboarding}>
						<CheckOutline class="w-4 h-4 mr-2" />
						{$t('onboarding.getStarted')}
					</Button>
				{:else}
					<Button color="blue" onclick={nextStep}>
						{$t('onboarding.next')}
						<ArrowRightOutline class="w-4 h-4 ml-2" />
					</Button>
				{/if}
			</div>
		</div>
	</div>
</Modal>
