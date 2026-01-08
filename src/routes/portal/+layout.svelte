<script lang="ts">
	import '../../app.css';
	import { setupConvex } from 'convex-svelte';
	import { PUBLIC_CONVEX_URL, PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';
	import { initI18n } from '$lib/i18n';
	import { isLoading } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	let googleMapsLoaded = $state(false);

	// Initialize Convex client (needed for public queries)
	if (PUBLIC_CONVEX_URL) {
		setupConvex(PUBLIC_CONVEX_URL);
	}

	// Initialize i18n
	initI18n();

	// Load Google Maps script for Places autocomplete
	onMount(() => {
		if (!browser || !PUBLIC_GOOGLE_MAPS_API_KEY) return;

		// Check if already loaded
		if (window.google?.maps?.places) {
			googleMapsLoaded = true;
			return;
		}

		// Create script element
		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			googleMapsLoaded = true;
		};
		document.head.appendChild(script);
	});
</script>

{#if $isLoading}
	<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
		<div class="text-gray-500 dark:text-gray-400">Loading...</div>
	</div>
{:else}
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
		{@render children()}
	</div>
{/if}
