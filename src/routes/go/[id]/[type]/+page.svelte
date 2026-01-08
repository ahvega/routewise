<script lang="ts">
	import { Spinner, Alert, Button, Card } from 'flowbite-svelte';
	import { MapPinOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { LocationService } from '$lib/services';
	import { browser } from '$app/environment';
	import type { Id } from '$convex/_generated/dataModel';

	let { data } = $props();

	// Query itinerary
	const itineraryQuery = useQuery(
		api.itineraries.get,
		() => ({ id: data.itineraryId as Id<'itineraries'> })
	);

	const itinerary = $derived(itineraryQuery.data);
	const isLoading = $derived(itineraryQuery.isLoading);

	// Auto-redirect when coordinates are available
	$effect(() => {
		if (!browser || !itinerary) return;

		let coordinates: { lat: number; lng: number } | null = null;
		let address: string = '';

		if (data.locationType === 'pickup') {
			coordinates = itinerary.pickupCoordinates || null;
			address = itinerary.pickupExactAddress || itinerary.origin;
		} else {
			coordinates = itinerary.dropoffCoordinates || null;
			address = itinerary.dropoffExactAddress || itinerary.destination;
		}

		// Get user agent for preference detection
		const userAgent = navigator.userAgent;
		const preference = LocationService.detectPreferredMapApp(userAgent);

		if (coordinates) {
			// Redirect with coordinates
			const redirectUrl = LocationService.getRedirectUrl(coordinates, preference);
			window.location.href = redirectUrl;
		} else if (address) {
			// Redirect with address search
			const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
			window.location.href = mapUrl;
		}
	});

	// Manual redirect options
	function openGoogleMaps() {
		if (!itinerary) return;

		let coordinates = data.locationType === 'pickup'
			? itinerary.pickupCoordinates
			: itinerary.dropoffCoordinates;
		let address = data.locationType === 'pickup'
			? itinerary.pickupExactAddress || itinerary.origin
			: itinerary.dropoffExactAddress || itinerary.destination;

		if (coordinates) {
			window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`;
		} else {
			window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
		}
	}

	function openWaze() {
		if (!itinerary) return;

		let coordinates = data.locationType === 'pickup'
			? itinerary.pickupCoordinates
			: itinerary.dropoffCoordinates;
		let address = data.locationType === 'pickup'
			? itinerary.pickupExactAddress || itinerary.origin
			: itinerary.dropoffExactAddress || itinerary.destination;

		if (coordinates) {
			window.location.href = `https://waze.com/ul?ll=${coordinates.lat},${coordinates.lng}&navigate=yes`;
		} else {
			window.location.href = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
		}
	}

	function openAppleMaps() {
		if (!itinerary) return;

		let coordinates = data.locationType === 'pickup'
			? itinerary.pickupCoordinates
			: itinerary.dropoffCoordinates;
		let address = data.locationType === 'pickup'
			? itinerary.pickupExactAddress || itinerary.origin
			: itinerary.dropoffExactAddress || itinerary.destination;

		if (coordinates) {
			window.location.href = `https://maps.apple.com/?daddr=${coordinates.lat},${coordinates.lng}&dirflg=d`;
		} else {
			window.location.href = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
		}
	}

	const locationLabel = $derived(
		data.locationType === 'pickup' ? 'Punto de Recogida' : 'Destino'
	);

	const address = $derived(
		itinerary
			? data.locationType === 'pickup'
				? itinerary.pickupExactAddress || itinerary.origin
				: itinerary.dropoffExactAddress || itinerary.destination
			: ''
	);
</script>

<svelte:head>
	<title>Navegación - {locationLabel}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
	<Card class="max-w-md w-full !p-6">
		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-8">
				<Spinner size="10" />
				<p class="mt-4 text-gray-600 dark:text-gray-400">Cargando ubicación...</p>
				<p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
					Redirigiendo a la aplicación de mapas...
				</p>
			</div>
		{:else if !itinerary}
			<div class="flex flex-col items-center justify-center py-8 text-center">
				<ExclamationCircleOutline class="w-16 h-16 text-red-500 mb-4" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
					Itinerario No Encontrado
				</h2>
				<p class="text-gray-600 dark:text-gray-400">
					No se pudo cargar la información del viaje.
				</p>
			</div>
		{:else}
			<div class="text-center mb-6">
				<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
					<MapPinOutline class="w-8 h-8 text-blue-600 dark:text-blue-400" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
					{locationLabel}
				</h2>
				<p class="text-gray-600 dark:text-gray-400 mt-2">
					{address}
				</p>
			</div>

			<Alert color="blue" class="mb-6">
				<span class="font-medium">Redirigiendo automáticamente...</span>
				<p class="text-sm mt-1">
					Si no se abre la aplicación de mapas, seleccione una opción abajo.
				</p>
			</Alert>

			<div class="space-y-3">
				<Button color="blue" class="w-full" onclick={openGoogleMaps}>
					<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
					</svg>
					Abrir en Google Maps
				</Button>

				<Button color="light" class="w-full" onclick={openWaze}>
					<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C6.5 2 2 6.5 2 12c0 4.5 3 8.3 7 9.5-.1-.5-.1-1.3 0-1.8.1-.5.8-3.3.8-3.3s-.2-.4-.2-1c0-.9.5-1.6 1.2-1.6.6 0 .9.4.9 1 0 .6-.4 1.5-.6 2.3-.2.7.3 1.3 1 1.3 1.2 0 2.2-1.3 2.2-3.1 0-1.6-1.2-2.7-2.8-2.7-1.9 0-3.1 1.5-3.1 3 0 .6.2 1.2.5 1.5.1.1.1.1.1.2l-.2.7c0 .1-.1.2-.3.1-1-.5-1.6-1.9-1.6-3 0-2.5 1.8-4.8 5.2-4.8 2.7 0 4.8 2 4.8 4.6 0 2.7-1.7 4.9-4.1 4.9-.8 0-1.5-.4-1.8-.9l-.5 1.8c-.2.7-.6 1.5-1 2 .8.2 1.6.4 2.4.4 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
					</svg>
					Abrir en Waze
				</Button>

				<Button color="dark" class="w-full" onclick={openAppleMaps}>
					<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
						<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
					</svg>
					Abrir en Apple Maps
				</Button>
			</div>

			<p class="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
				Viaje: {itinerary.itineraryNumber}
			</p>
		{/if}
	</Card>
</div>
