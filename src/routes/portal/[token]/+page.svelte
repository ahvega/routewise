<script lang="ts">
	import { Card, Button, Spinner, Alert, Input, Label, Badge } from 'flowbite-svelte';
	import {
		MapPinOutline,
		UserOutline,
		PhoneOutline,
		EnvelopeOutline,
		CalendarMonthOutline,
		TruckOutline,
		CheckCircleOutline,
		ExclamationCircleOutline,
		UsersOutline
	} from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { t } from '$lib/i18n';
	import { type Coordinates } from '$lib/services';
	import { PlacesAutocomplete } from '$lib/components';

	let { data } = $props();

	const client = useConvexClient();

	// Query itinerary by token
	const itineraryQuery = useQuery(
		api.itineraries.getByClientToken,
		() => ({ token: data.token })
	);

	const queryResult = $derived(itineraryQuery.data);
	const isLoading = $derived(itineraryQuery.isLoading);

	// Check if there's an error
	const hasError = $derived(queryResult && 'error' in queryResult);
	const errorMessage = $derived(hasError ? (queryResult as any).message : null);

	// Extract data when successful
	const itinerary = $derived(
		queryResult && 'success' in queryResult ? queryResult.itinerary : null
	);
	const clientInfo = $derived(
		queryResult && 'success' in queryResult ? queryResult.client : null
	);
	const vehicle = $derived(
		queryResult && 'success' in queryResult ? queryResult.vehicle : null
	);
	const tenant = $derived(
		queryResult && 'success' in queryResult ? queryResult.tenant : null
	);

	// Check if details are already completed
	const detailsAlreadyCompleted = $derived(!!itinerary?.detailsCompletedAt);

	// Form state
	let tripLeaderName = $state('');
	let tripLeaderPhone = $state('');
	let tripLeaderEmail = $state('');
	let pickupExactAddress = $state('');
	let dropoffExactAddress = $state('');

	// Coordinates (from Places API or manual geocoding)
	let pickupCoordinates = $state<Coordinates | null>(null);
	let dropoffCoordinates = $state<Coordinates | null>(null);

	// UI state
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);
	let submitSuccess = $state(false);

	// Pre-fill form with existing data
	$effect(() => {
		if (itinerary) {
			tripLeaderName = itinerary.tripLeaderName || '';
			tripLeaderPhone = itinerary.tripLeaderPhone || '';
			tripLeaderEmail = itinerary.tripLeaderEmail || '';
			pickupExactAddress = itinerary.pickupExactAddress || '';
			dropoffExactAddress = itinerary.dropoffExactAddress || '';
		}
	});

	// Form validation
	const isFormValid = $derived(
		tripLeaderName.trim().length > 0 &&
		tripLeaderPhone.trim().length > 0 &&
		pickupExactAddress.trim().length > 0 &&
		dropoffExactAddress.trim().length > 0
	);

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('es-HN', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!isFormValid || isSubmitting) return;

		isSubmitting = true;
		submitError = null;

		try {
			// Try to geocode addresses if we have coordinates input
			// The coordinates will be passed if available
			await client.mutation(api.itineraries.updateTripDetails, {
				token: data.token,
				tripLeaderName: tripLeaderName.trim(),
				tripLeaderPhone: tripLeaderPhone.trim(),
				tripLeaderEmail: tripLeaderEmail.trim() || undefined,
				pickupExactAddress: pickupExactAddress.trim(),
				dropoffExactAddress: dropoffExactAddress.trim(),
				pickupCoordinates: pickupCoordinates || undefined,
				dropoffCoordinates: dropoffCoordinates || undefined
			});

			submitSuccess = true;
		} catch (error) {
			console.error('Failed to submit trip details:', error);
			submitError = error instanceof Error ? error.message : 'Error al enviar los detalles';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{tenant?.companyName || 'RouteWise'} - Detalles del Viaje</title>
</svelte:head>

<div class="min-h-screen py-8 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Header with company branding -->
		<div class="text-center mb-8">
			{#if tenant?.logoUrl}
				<img src={tenant.logoUrl} alt={tenant.companyName} class="h-16 mx-auto mb-4" />
			{/if}
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
				{tenant?.companyName || 'RouteWise'}
			</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				Portal del Cliente - Detalles del Viaje
			</p>
		</div>

		{#if isLoading}
			<Card class="max-w-none !p-8">
				<div class="flex flex-col items-center justify-center py-8">
					<Spinner size="10" />
					<p class="mt-4 text-gray-500 dark:text-gray-400">Cargando información del viaje...</p>
				</div>
			</Card>
		{:else if hasError}
			<Card class="max-w-none !p-8">
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<ExclamationCircleOutline class="w-16 h-16 text-red-500 mb-4" />
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
						Enlace No Válido
					</h2>
					<p class="text-gray-600 dark:text-gray-400">
						{errorMessage}
					</p>
					<p class="text-sm text-gray-500 dark:text-gray-500 mt-4">
						Por favor contacte a la empresa para obtener un nuevo enlace.
					</p>
				</div>
			</Card>
		{:else if submitSuccess}
			<Card class="max-w-none !p-8">
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<CheckCircleOutline class="w-16 h-16 text-green-500 mb-4" />
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
						Detalles Enviados
					</h2>
					<p class="text-gray-600 dark:text-gray-400">
						Gracias por proporcionar los detalles del viaje. El equipo de {tenant?.companyName || 'la empresa'} ha sido notificado.
					</p>
					<div class="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-left w-full max-w-md">
						<h3 class="font-semibold text-green-800 dark:text-green-200 mb-2">Resumen:</h3>
						<ul class="text-sm text-green-700 dark:text-green-300 space-y-1">
							<li><strong>Líder del grupo:</strong> {tripLeaderName}</li>
							<li><strong>Teléfono:</strong> {tripLeaderPhone}</li>
							<li><strong>Recogida:</strong> {pickupExactAddress}</li>
							<li><strong>Destino:</strong> {dropoffExactAddress}</li>
						</ul>
					</div>
				</div>
			</Card>
		{:else if itinerary}
			<!-- Trip Summary Card -->
			<Card class="max-w-none !p-6 mb-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						{itinerary.itineraryNumber}
					</h2>
					{#if detailsAlreadyCompleted}
						<Badge color="green">Detalles Completados</Badge>
					{:else}
						<Badge color="yellow">Pendiente de Detalles</Badge>
					{/if}
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Route -->
					<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
							<MapPinOutline class="w-4 h-4" />
							<span class="text-sm font-medium">Ruta</span>
						</div>
						<p class="text-gray-900 dark:text-white font-medium">{itinerary.origin}</p>
						<p class="text-gray-500 dark:text-gray-400">→</p>
						<p class="text-gray-900 dark:text-white font-medium">{itinerary.destination}</p>
					</div>

					<!-- Date -->
					<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
							<CalendarMonthOutline class="w-4 h-4" />
							<span class="text-sm font-medium">Fecha de Salida</span>
						</div>
						<p class="text-gray-900 dark:text-white font-medium">
							{formatDate(itinerary.startDate)}
						</p>
						{#if itinerary.pickupTime}
							<p class="text-gray-600 dark:text-gray-400 text-sm">
								Hora: {itinerary.pickupTime}
							</p>
						{/if}
					</div>

					<!-- Passengers -->
					<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
							<UsersOutline class="w-4 h-4" />
							<span class="text-sm font-medium">Pasajeros</span>
						</div>
						<p class="text-gray-900 dark:text-white font-medium">
							{itinerary.groupSize} personas
						</p>
						{#if itinerary.estimatedDays > 1}
							<p class="text-gray-600 dark:text-gray-400 text-sm">
								{itinerary.estimatedDays} días
							</p>
						{/if}
					</div>

					<!-- Vehicle -->
					{#if vehicle}
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
								<TruckOutline class="w-4 h-4" />
								<span class="text-sm font-medium">Vehículo</span>
							</div>
							<p class="text-gray-900 dark:text-white font-medium">{vehicle.name}</p>
							{#if vehicle.make || vehicle.model}
								<p class="text-gray-600 dark:text-gray-400 text-sm">
									{[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</Card>

			<!-- Trip Details Form -->
			<Card class="max-w-none !p-6">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
					Detalles del Viaje
				</h2>

				{#if detailsAlreadyCompleted}
					<Alert color="green" class="mb-6">
						<span class="font-medium">Los detalles ya fueron proporcionados.</span> Puede actualizar la información si es necesario.
					</Alert>
				{:else}
					<Alert color="blue" class="mb-6">
						<span class="font-medium">Por favor complete los siguientes datos</span> para que podamos coordinar su viaje de manera efectiva.
					</Alert>
				{/if}

				{#if submitError}
					<Alert color="red" class="mb-6">
						<span class="font-medium">Error:</span> {submitError}
					</Alert>
				{/if}

				<form onsubmit={handleSubmit} class="space-y-6">
					<!-- Trip Leader Section -->
					<div class="border-b border-gray-200 dark:border-gray-700 pb-6">
						<h3 class="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<UserOutline class="w-5 h-5 text-blue-500" />
							Líder del Grupo
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
							Persona de contacto durante el viaje que estará pendiente del grupo.
						</p>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label for="tripLeaderName" class="mb-2">Nombre Completo *</Label>
								<Input
									id="tripLeaderName"
									type="text"
									bind:value={tripLeaderName}
									placeholder="Juan Pérez"
									required
								/>
							</div>
							<div>
								<Label for="tripLeaderPhone" class="mb-2">Teléfono *</Label>
								<Input
									id="tripLeaderPhone"
									type="tel"
									bind:value={tripLeaderPhone}
									placeholder="+504 9999-9999"
									required
								/>
							</div>
							<div class="md:col-span-2">
								<Label for="tripLeaderEmail" class="mb-2">Correo Electrónico (opcional)</Label>
								<Input
									id="tripLeaderEmail"
									type="email"
									bind:value={tripLeaderEmail}
									placeholder="juan@ejemplo.com"
								/>
							</div>
						</div>
					</div>

					<!-- Pickup Location Section -->
					<div class="border-b border-gray-200 dark:border-gray-700 pb-6">
						<h3 class="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<MapPinOutline class="w-5 h-5 text-green-500" />
							Lugar de Recogida
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
							Dirección exacta donde el chofer debe recoger al grupo.
						</p>

						<div>
							<Label for="pickupExactAddress" class="mb-2">Dirección Exacta de Recogida *</Label>
							<PlacesAutocomplete
								id="pickupExactAddress"
								bind:value={pickupExactAddress}
								placeholder="Hotel Real Intercontinental, Blvd. Juan Pablo II, Tegucigalpa"
								required
								onCoordinatesChange={(coords) => { pickupCoordinates = coords; }}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Comience a escribir para ver sugerencias de Google Maps
							</p>
						</div>
					</div>

					<!-- Dropoff Location Section -->
					<div class="pb-6">
						<h3 class="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<MapPinOutline class="w-5 h-5 text-red-500" />
							Lugar de Destino
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
							Dirección exacta del destino final.
						</p>

						<div>
							<Label for="dropoffExactAddress" class="mb-2">Dirección Exacta de Destino *</Label>
							<PlacesAutocomplete
								id="dropoffExactAddress"
								bind:value={dropoffExactAddress}
								placeholder="Roatán Dive Center, West End, Roatán"
								required
								onCoordinatesChange={(coords) => { dropoffCoordinates = coords; }}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Comience a escribir para ver sugerencias de Google Maps
							</p>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="flex justify-end">
						<Button
							type="submit"
							color="blue"
							size="lg"
							disabled={!isFormValid || isSubmitting}
						>
							{#if isSubmitting}
								<Spinner size="5" class="mr-2" />
								Enviando...
							{:else}
								<CheckCircleOutline class="w-5 h-5 mr-2" />
								{detailsAlreadyCompleted ? 'Actualizar Detalles' : 'Enviar Detalles'}
							{/if}
						</Button>
					</div>
				</form>
			</Card>

			<!-- Contact Info -->
			<div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
				<p>
					¿Tiene preguntas? Contacte a {tenant?.companyName || 'la empresa'} para asistencia.
				</p>
			</div>
		{/if}
	</div>
</div>
