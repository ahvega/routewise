<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		id?: string;
		value: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
		onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void;
	}

	let {
		id = '',
		value = $bindable(''),
		placeholder = '',
		required = false,
		disabled = false,
		class: className = '',
		onPlaceSelect,
		onCoordinatesChange
	}: Props = $props();

	let inputElement: HTMLInputElement | null = null;
	let autocomplete: google.maps.places.Autocomplete | null = null;
	let checkInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		if (!browser) return;

		// Check if Google Maps is already loaded
		if (window.google?.maps?.places && inputElement) {
			initAutocomplete();
		} else {
			// Wait for Google Maps to load
			checkInterval = setInterval(() => {
				if (window.google?.maps?.places && inputElement) {
					clearInterval(checkInterval!);
					checkInterval = null;
					initAutocomplete();
				}
			}, 100);

			// Stop checking after 10 seconds
			setTimeout(() => {
				if (checkInterval) {
					clearInterval(checkInterval);
					checkInterval = null;
				}
			}, 10000);
		}
	});

	onDestroy(() => {
		if (checkInterval) {
			clearInterval(checkInterval);
		}
		if (autocomplete) {
			google.maps.event.clearInstanceListeners(autocomplete);
		}
	});

	function initAutocomplete() {
		if (!inputElement || !window.google?.maps?.places) return;

		autocomplete = new google.maps.places.Autocomplete(inputElement, {
			types: ['establishment', 'geocode'],
			fields: ['formatted_address', 'geometry', 'name', 'place_id']
		});

		autocomplete.addListener('place_changed', () => {
			const place = autocomplete?.getPlace();
			if (!place) return;

			// Update value with formatted address or name
			if (place.formatted_address) {
				value = place.formatted_address;
			} else if (place.name) {
				value = place.name;
			}

			// Extract coordinates if available
			if (place.geometry?.location) {
				const coords = {
					lat: place.geometry.location.lat(),
					lng: place.geometry.location.lng()
				};
				onCoordinatesChange?.(coords);
			} else {
				onCoordinatesChange?.(null);
			}

			// Notify parent of place selection
			onPlaceSelect?.(place);
		});
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		// Clear coordinates when user types manually
		onCoordinatesChange?.(null);
	}
</script>

<input
	bind:this={inputElement}
	{id}
	type="text"
	{value}
	{placeholder}
	{required}
	{disabled}
	class="block w-full border disabled:cursor-not-allowed disabled:opacity-50 bg-gray-50 border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500 p-2.5 text-sm rounded-lg {className}"
	oninput={handleInput}
/>

<style>
	/* Style the Google Places autocomplete dropdown */
	:global(.pac-container) {
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		border: 1px solid #e5e7eb;
		margin-top: 4px;
		z-index: 9999;
	}

	:global(.pac-item) {
		padding: 0.5rem 1rem;
		cursor: pointer;
		line-height: 1.5;
	}

	:global(.pac-item:hover) {
		background-color: #f3f4f6;
	}

	:global(.pac-item-selected) {
		background-color: #eff6ff;
	}

	:global(.pac-icon) {
		margin-right: 0.5rem;
	}

	:global(.pac-item-query) {
		font-weight: 500;
		color: #111827;
	}

	/* Dark mode support */
	:global(.dark .pac-container) {
		background-color: #1f2937;
		border-color: #374151;
	}

	:global(.dark .pac-item) {
		color: #e5e7eb;
	}

	:global(.dark .pac-item:hover) {
		background-color: #374151;
	}

	:global(.dark .pac-item-selected) {
		background-color: #1e3a8a;
	}

	:global(.dark .pac-item-query) {
		color: #f9fafb;
	}
</style>
