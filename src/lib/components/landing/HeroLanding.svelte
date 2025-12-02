<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { ArrowRightOutline, MapPinAltSolid, ChartPieSolid, CashOutline, TruckSolid } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	const features = $derived([
		{ icon: MapPinAltSolid, key: 'routes' },
		{ icon: ChartPieSolid, key: 'pricing' },
		{ icon: CashOutline, key: 'currency' },
		{ icon: TruckSolid, key: 'fleet' }
	]);

	// Always use fresh login from landing page to ensure clean authentication
	// This prevents cached SSO sessions from auto-logging in unwanted users
	const loginUrl = '/auth/login?fresh=true';
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
	<div class="flex-1 flex items-center">
	<div class="container mx-auto px-4 py-16">
		<div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
			<!-- Left Column: Info -->
			<div class="space-y-6">
				<!-- Pretitle -->
				<div>
					<span class="text-primary-400 text-xs font-light uppercase tracking-[0.2em] leading-tight">
						{$t('landing.pretitle')}
					</span>
				</div>

				<!-- Title -->
				<h1 class="text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight -mt-4">
					{$t('landing.title')}
				</h1>

				<!-- Subtitle -->
				<p class="text-l md:text-xl text-primary-300 font-medium leading-tight">
					{$t('landing.subtitle')}
				</p>

				<!-- Description -->
				<p class="text-lg text-gray-300 leading-relaxed max-w-xl">
					{$t('landing.description')}
				</p>

				<!-- Features Grid -->
				<div class="grid grid-cols-2 gap-4 pt-4">
					{#each features as feature}
						<div class="flex items-center gap-3 text-gray-300">
							<div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
								<feature.icon class="w-5 h-5 text-primary-400" />
							</div>
							<span class="text-sm">{$t(`landing.features.${feature.key}`)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Right Column: CTA -->
			<div class="lg:pl-8">
				<div class="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 lg:p-10 border border-gray-700/50 shadow-2xl">
					<!-- Closing Message -->
					<div class="mb-8">
						<h2 class="text-2xl lg:text-3xl font-bold text-white mb-4">
							{$t('common.appName')}
						</h2>
						<p class="text-gray-300 text-lg leading-relaxed">
							{$t('landing.closingMessage')}
						</p>
					</div>

					<!-- CTA Buttons -->
					<div class="space-y-4">
						<Button href={loginUrl} size="l" class="w-full justify-center text-lg py-4">
							{$t('landing.getStarted')}
							<ArrowRightOutline class="w-5 h-5 ml-2" />
						</Button>

						<div class="flex items-center justify-center gap-2 text-gray-400 text-sm">
							<span>{$t('landing.alreadyHaveAccount')}</span>
							<a href={loginUrl} class="text-primary-400 hover:text-primary-300 font-medium">
								{$t('landing.signIn')}
							</a>
						</div>
					</div>

					<!-- Trust Indicators -->
					<div class="mt-8 pt-8 border-t border-gray-700/50">
						<div class="flex items-center justify-center gap-8 text-gray-500 text-sm">
							<div class="flex items-center gap-2">
								<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
								<span>{$t('landing.freeTrial')}</span>
							</div>
							<div class="flex items-center gap-2">
								<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
								<span>{$t('landing.noCreditCard')}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	</div>

	<!-- Footer -->
	<footer class="py-6 border-t border-gray-800">
		<div class="container mx-auto px-4">
			<div class="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
				<p>&copy; {new Date().getFullYear()} {$t('common.appName')}. {$t('footer.allRightsReserved')}</p>
				<div class="flex items-center gap-6">
					<a href="/legal/terms" class="hover:text-gray-300 transition-colors">
						{$t('footer.termsOfService')}
					</a>
					<a href="/legal/privacy" class="hover:text-gray-300 transition-colors">
						{$t('footer.privacyPolicy')}
					</a>
				</div>
			</div>
		</div>
	</footer>
</div>
