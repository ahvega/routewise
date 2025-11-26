<script lang="ts">
	import '../app.css';
	import { setupConvex } from 'convex-svelte';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { Navbar, TenantProvider, HeroLanding, SessionTimeout, OnboardingWizard } from '$lib/components';
	import { initI18n } from '$lib/i18n';
	import { isLoading } from 'svelte-i18n';

	let { children, data } = $props();

	// Initialize Convex client
	if (PUBLIC_CONVEX_URL) {
		setupConvex(PUBLIC_CONVEX_URL);
	}

	// Initialize i18n
	initI18n();

	// Check if user is authenticated
	const isAuthenticated = $derived(!!data.user);
	const userName = $derived(data.user?.firstName || data.user?.email?.split('@')[0] || 'there');
</script>

{#if $isLoading}
	<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
		<div class="text-gray-500 dark:text-gray-400">Loading...</div>
	</div>
{:else if !isAuthenticated}
	<!-- Non-authenticated users see the landing page -->
	<HeroLanding />
{:else}
	<!-- Authenticated users see the main application -->
	<TenantProvider user={data.user}>
		{#snippet children()}
			<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
				<Navbar user={data.user} />
				<main class="container mx-auto px-4 py-8">
					{@render children()}
				</main>
			</div>
			<!-- Session timeout warning for authenticated users -->
			<SessionTimeout />
			<!-- Onboarding wizard for new users -->
			<OnboardingWizard {userName} />
		{/snippet}
	</TenantProvider>
{/if}
