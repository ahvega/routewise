/**
 * Location Service
 * Handles geocoding, reverse geocoding, and map URL generation
 * for trip pickup/dropoff locations
 */

export interface Coordinates {
	lat: number;
	lng: number;
}

export interface LocationDetails {
	address: string;
	coordinates: Coordinates;
	googleMapsUrl: string;
	wazeUrl: string;
	placeId?: string;
}

export interface GeocodeResult {
	address: string;
	coordinates: Coordinates;
	formattedAddress: string;
	placeId?: string;
}

/**
 * Location Service
 * Provides geocoding and map URL generation for navigation
 */
export class LocationService {
	private geocoder: google.maps.Geocoder | null = null;
	private placesService: google.maps.places.PlacesService | null = null;
	private isInitialized = false;

	/**
	 * Initialize Google Maps services
	 * Must be called after Google Maps script is loaded
	 */
	initialize(mapElement?: HTMLElement): boolean {
		if (typeof window !== 'undefined' && window.google?.maps) {
			this.geocoder = new google.maps.Geocoder();

			// PlacesService requires a map or div element
			if (mapElement) {
				this.placesService = new google.maps.places.PlacesService(mapElement);
			}

			this.isInitialized = true;
			return true;
		}
		return false;
	}

	/**
	 * Check if services are ready
	 */
	isReady(): boolean {
		return this.isInitialized && this.geocoder !== null;
	}

	/**
	 * Geocode an address to get coordinates
	 */
	async geocode(address: string): Promise<GeocodeResult | null> {
		if (!this.geocoder) {
			console.error('LocationService not initialized');
			return null;
		}

		return new Promise((resolve) => {
			this.geocoder!.geocode({ address }, (results, status) => {
				if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
					const result = results[0];
					const location = result.geometry.location;
					resolve({
						address,
						coordinates: {
							lat: location.lat(),
							lng: location.lng()
						},
						formattedAddress: result.formatted_address,
						placeId: result.place_id
					});
				} else {
					console.warn(`Geocoding failed for "${address}": ${status}`);
					resolve(null);
				}
			});
		});
	}

	/**
	 * Reverse geocode coordinates to get address
	 */
	async reverseGeocode(coordinates: Coordinates): Promise<string | null> {
		if (!this.geocoder) {
			console.error('LocationService not initialized');
			return null;
		}

		return new Promise((resolve) => {
			this.geocoder!.geocode(
				{ location: { lat: coordinates.lat, lng: coordinates.lng } },
				(results, status) => {
					if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
						resolve(results[0].formatted_address);
					} else {
						resolve(null);
					}
				}
			);
		});
	}

	/**
	 * Generate Google Maps URL for navigation
	 * Uses the universal maps URL format that works on all devices
	 */
	generateGoogleMapsUrl(coordinates: Coordinates, label?: string): string {
		const { lat, lng } = coordinates;

		// Use the universal Google Maps URL format
		// This opens in Google Maps app on mobile or web on desktop
		const baseUrl = 'https://www.google.com/maps/dir/?api=1';
		const destination = `${lat},${lng}`;

		// Build URL with optional label
		let url = `${baseUrl}&destination=${destination}`;

		if (label) {
			// Encode the label for URL
			url += `&destination_place_id=${encodeURIComponent(label)}`;
		}

		return url;
	}

	/**
	 * Generate Google Maps URL from address (for cases without coordinates)
	 */
	generateGoogleMapsUrlFromAddress(address: string): string {
		return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
	}

	/**
	 * Generate Waze URL for navigation
	 * Waze deep links work on mobile and redirect to web on desktop
	 */
	generateWazeUrl(coordinates: Coordinates): string {
		const { lat, lng } = coordinates;

		// Waze universal link format
		// This opens Waze app on mobile or Waze web on desktop
		return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
	}

	/**
	 * Generate Waze URL from address
	 */
	generateWazeUrlFromAddress(address: string): string {
		return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
	}

	/**
	 * Get complete location details including all map URLs
	 * Main method for processing trip locations
	 */
	async getLocationDetails(address: string): Promise<LocationDetails | null> {
		const geocodeResult = await this.geocode(address);

		if (!geocodeResult) {
			return null;
		}

		return {
			address: geocodeResult.formattedAddress,
			coordinates: geocodeResult.coordinates,
			googleMapsUrl: this.generateGoogleMapsUrl(geocodeResult.coordinates, address),
			wazeUrl: this.generateWazeUrl(geocodeResult.coordinates),
			placeId: geocodeResult.placeId
		};
	}

	/**
	 * Generate location details from coordinates (when we already have them)
	 */
	generateLocationDetailsFromCoordinates(
		address: string,
		coordinates: Coordinates
	): Omit<LocationDetails, 'placeId'> {
		return {
			address,
			coordinates,
			googleMapsUrl: this.generateGoogleMapsUrl(coordinates, address),
			wazeUrl: this.generateWazeUrl(coordinates)
		};
	}

	/**
	 * Generate a universal link that redirects to the appropriate map app
	 * This is for QR codes - the link goes to our server which then redirects
	 */
	generateUniversalLink(
		baseUrl: string,
		itineraryId: string,
		locationType: 'pickup' | 'dropoff'
	): string {
		return `${baseUrl}/go/${itineraryId}/${locationType}`;
	}

	/**
	 * Detect user's preferred map app based on user agent
	 * Used by the universal link redirect
	 */
	static detectPreferredMapApp(userAgent: string): 'google' | 'waze' | 'apple' {
		const ua = userAgent.toLowerCase();

		// Check for iOS - might prefer Apple Maps
		if (ua.includes('iphone') || ua.includes('ipad')) {
			// Default to Google Maps on iOS as it's more commonly used for navigation
			return 'google';
		}

		// Check for Android - Google Maps is default
		if (ua.includes('android')) {
			return 'google';
		}

		// Desktop or unknown - use Google Maps web
		return 'google';
	}

	/**
	 * Get redirect URL for universal link based on preference
	 */
	static getRedirectUrl(
		coordinates: Coordinates,
		preference: 'google' | 'waze' | 'apple'
	): string {
		const { lat, lng } = coordinates;

		switch (preference) {
			case 'waze':
				return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
			case 'apple':
				return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
			case 'google':
			default:
				return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
		}
	}
}

// Export singleton instance
export const locationService = new LocationService();

/**
 * Server-side utilities for location processing
 * These don't require Google Maps API
 */
export const serverLocationUtils = {
	/**
	 * Generate Google Maps URL from coordinates (no API needed)
	 */
	generateGoogleMapsUrl(lat: number, lng: number): string {
		return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
	},

	/**
	 * Generate Waze URL from coordinates (no API needed)
	 */
	generateWazeUrl(lat: number, lng: number): string {
		return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
	},

	/**
	 * Generate universal link URL
	 */
	generateUniversalLink(
		baseUrl: string,
		itineraryId: string,
		locationType: 'pickup' | 'dropoff'
	): string {
		return `${baseUrl}/go/${itineraryId}/${locationType}`;
	},

	/**
	 * Parse coordinates from string format "lat,lng"
	 */
	parseCoordinates(coordString: string): Coordinates | null {
		const parts = coordString.split(',').map((p) => parseFloat(p.trim()));
		if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
			return { lat: parts[0], lng: parts[1] };
		}
		return null;
	},

	/**
	 * Format coordinates to string
	 */
	formatCoordinates(coordinates: Coordinates): string {
		return `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(6)}`;
	}
};
