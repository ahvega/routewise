<script lang="ts">
	import '../app.css';
	import { setupConvex } from 'convex-svelte';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { Navbar, TenantProvider, HeroLanding, SessionTimeout, OnboardingWizard } from '$lib/components';
	import { initI18n } from '$lib/i18n';
	import { isLoading } from 'svelte-i18n';
	import { page } from '$app/stores';

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

	// Public routes that don't require authentication
	const isPublicRoute = $derived(
		$page.url.pathname.startsWith('/legal') ||
		$page.url.pathname.startsWith('/auth')
	);

	// Onboarding routes that need special handling
	const isOnboardingRoute = $derived($page.url.pathname.startsWith('/onboarding'));
</script>

{#if $isLoading}
	<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
		<div class="text-gray-500 dark:text-gray-400">Loading...</div>
	</div>
{:else if !isAuthenticated && !isPublicRoute}
	<!-- Non-authenticated users see the landing page -->
	<HeroLanding />
{:else if !isAuthenticated && isPublicRoute}
	<!-- Public pages (legal, auth) for non-authenticated users -->
	<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
		{@render children()}
	</div>
{:else if isOnboardingRoute}
	<!-- Onboarding pages for authenticated users setting up their organization -->
	<TenantProvider user={data.user} session={data.session}>
		{#snippet children()}
			<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
				{@render children()}
			</div>
		{/snippet}
	</TenantProvider>
{:else}
	<!-- Authenticated users with tenant see the main application -->
	<TenantProvider user={data.user} session={data.session}>
		{#snippet children()}
			<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
				<Navbar user={data.user} />
				<main class="container mx-auto px-4 py-8">
					{@render children()}
				</main>
			</div>
			<!-- Session timeout warning for authenticated users -->
			<SessionTimeout />
			<!-- Onboarding wizard for new users (feature tour, not org setup) -->
			<OnboardingWizard {userName} />
		{/snippet}
	</TenantProvider>
{/if}
