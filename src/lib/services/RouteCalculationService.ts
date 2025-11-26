/**
 * Route Calculation Service
 * Handles Google Maps Distance Matrix and Directions API integration
 * for calculating distances, durations, and route segments
 */

// Route segment representing one leg of the journey
export interface RouteSegment {
	origin: string;
	destination: string;
	distance: number; // in km
	duration: number; // in minutes
	polyline?: string; // encoded polyline for map display
}

// Complete route result with all segments
export interface RouteResult {
	segments: RouteSegment[];
	totalDistance: number; // in km
	totalTime: number; // in minutes
	// Individual leg distances for breakdown
	baseToOrigin: number;
	originToDestination: number;
	destinationToBase: number;
	// Deadhead (repositioning) totals
	deadheadDistance: number;
	mainTripDistance: number;
}

// Distance Matrix API response types
interface DistanceMatrixElement {
	distance: { value: number; text: string };
	duration: { value: number; text: string };
	status: string;
}

interface DistanceMatrixRow {
	elements: DistanceMatrixElement[];
}

/**
 * Route Calculation Service
 * Uses Google Maps APIs to calculate multi-leg routes
 */
export class RouteCalculationService {
	private distanceMatrixService: google.maps.DistanceMatrixService | null = null;
	private directionsService: google.maps.DirectionsService | null = null;
	private isInitialized = false;

	/**
	 * Initialize Google Maps services
	 * Must be called after Google Maps script is loaded
	 */
	initialize(): boolean {
		if (typeof window !== 'undefined' && window.google?.maps) {
			this.distanceMatrixService = new google.maps.DistanceMatrixService();
			this.directionsService = new google.maps.DirectionsService();
			this.isInitialized = true;
			return true;
		}
		return false;
	}

	/**
	 * Check if services are ready
	 */
	isReady(): boolean {
		return this.isInitialized && this.distanceMatrixService !== null;
	}

	/**
	 * Calculate a complete round-trip route:
	 * BASE -> ORIGIN -> DESTINATION -> BASE
	 *
	 * @param origin - Trip pickup location
	 * @param destination - Trip dropoff location
	 * @param baseLocation - Vehicle's home base location
	 * @returns Complete route information with all segments
	 */
	async calculateRoute(
		origin: string,
		destination: string,
		baseLocation: string
	): Promise<RouteResult> {
		if (!this.isReady()) {
			throw new Error('RouteCalculationService not initialized. Call initialize() first.');
		}

		// Calculate all required distances using Distance Matrix API
		// We need: base->origin, origin->destination, destination->base
		const matrixResult = await this.getDistanceMatrix(
			[baseLocation, origin, destination],
			[baseLocation, origin, destination]
		);

		// Extract the specific distances we need from the 3x3 matrix:
		// Row 0 = from baseLocation: [base->base, base->origin, base->destination]
		// Row 1 = from origin: [origin->base, origin->origin, origin->destination]
		// Row 2 = from destination: [dest->base, dest->origin, dest->destination]

		const baseToOrigin = matrixResult.distances[0][1]; // base -> origin
		const baseToOriginTime = matrixResult.durations[0][1];

		const originToDestination = matrixResult.distances[1][2]; // origin -> destination
		const originToDestinationTime = matrixResult.durations[1][2];

		const destinationToBase = matrixResult.distances[2][0]; // destination -> base
		const destinationToBaseTime = matrixResult.durations[2][0];

		// Build route segments
		const segments: RouteSegment[] = [
			{
				origin: baseLocation,
				destination: origin,
				distance: baseToOrigin,
				duration: baseToOriginTime
			},
			{
				origin: origin,
				destination: destination,
				distance: originToDestination,
				duration: originToDestinationTime
			},
			{
				origin: destination,
				destination: baseLocation,
				distance: destinationToBase,
				duration: destinationToBaseTime
			}
		];

		// Calculate totals
		const deadheadDistance = baseToOrigin + destinationToBase;
		const mainTripDistance = originToDestination;
		const totalDistance = deadheadDistance + mainTripDistance;
		const totalTime = baseToOriginTime + originToDestinationTime + destinationToBaseTime;

		return {
			segments,
			totalDistance,
			totalTime,
			baseToOrigin,
			originToDestination,
			destinationToBase,
			deadheadDistance,
			mainTripDistance
		};
	}

	/**
	 * Calculate a simple point-to-point route (no base location)
	 * Used when vehicle base location is same as origin
	 */
	async calculateSimpleRoute(
		origin: string,
		destination: string
	): Promise<RouteResult> {
		if (!this.isReady()) {
			throw new Error('RouteCalculationService not initialized');
		}

		const matrixResult = await this.getDistanceMatrix([origin], [destination]);

		const distance = matrixResult.distances[0][0];
		const duration = matrixResult.durations[0][0];

		// For round trip, double the distance and time
		const roundTripDistance = distance * 2;
		const roundTripTime = duration * 2;

		const segments: RouteSegment[] = [
			{
				origin,
				destination,
				distance,
				duration
			},
			{
				origin: destination,
				destination: origin,
				distance,
				duration
			}
		];

		return {
			segments,
			totalDistance: roundTripDistance,
			totalTime: roundTripTime,
			baseToOrigin: 0,
			originToDestination: distance,
			destinationToBase: 0,
			deadheadDistance: 0,
			mainTripDistance: roundTripDistance
		};
	}

	/**
	 * Get distance matrix for multiple origins and destinations
	 */
	private async getDistanceMatrix(
		origins: string[],
		destinations: string[]
	): Promise<{
		distances: number[][];
		durations: number[][];
	}> {
		return new Promise((resolve, reject) => {
			if (!this.distanceMatrixService) {
				reject(new Error('Distance Matrix service not initialized'));
				return;
			}

			this.distanceMatrixService.getDistanceMatrix(
				{
					origins,
					destinations,
					travelMode: google.maps.TravelMode.DRIVING,
					unitSystem: google.maps.UnitSystem.METRIC,
					avoidHighways: false,
					avoidTolls: false
				},
				(response, status) => {
					if (status === google.maps.DistanceMatrixStatus.OK && response) {
						const distances: number[][] = [];
						const durations: number[][] = [];

						response.rows.forEach((row, i) => {
							distances[i] = [];
							durations[i] = [];

							row.elements.forEach((element, j) => {
								if (element.status === 'OK') {
									// Convert meters to km
									distances[i][j] = Math.round(element.distance.value / 1000);
									// Convert seconds to minutes
									durations[i][j] = Math.round(element.duration.value / 60);
								} else {
									// Route not found - use 0 or throw error
									distances[i][j] = 0;
									durations[i][j] = 0;
									console.warn(
										`No route found from ${origins[i]} to ${destinations[j]}`
									);
								}
							});
						});

						resolve({ distances, durations });
					} else {
						reject(new Error(`Distance Matrix API error: ${status}`));
					}
				}
			);
		});
	}

	/**
	 * Get detailed directions for a route segment (for map display)
	 */
	async getDirections(
		origin: string,
		destination: string,
		waypoints?: string[]
	): Promise<google.maps.DirectionsResult> {
		return new Promise((resolve, reject) => {
			if (!this.directionsService) {
				reject(new Error('Directions service not initialized'));
				return;
			}

			const request: google.maps.DirectionsRequest = {
				origin,
				destination,
				travelMode: google.maps.TravelMode.DRIVING,
				unitSystem: google.maps.UnitSystem.METRIC
			};

			if (waypoints && waypoints.length > 0) {
				request.waypoints = waypoints.map((wp) => ({
					location: wp,
					stopover: true
				}));
			}

			this.directionsService.route(request, (result, status) => {
				if (status === google.maps.DirectionsStatus.OK && result) {
					resolve(result);
				} else {
					reject(new Error(`Directions API error: ${status}`));
				}
			});
		});
	}

	/**
	 * Geocode an address to get coordinates
	 */
	async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
		if (typeof window === 'undefined' || !window.google?.maps) {
			return null;
		}

		return new Promise((resolve) => {
			const geocoder = new google.maps.Geocoder();
			geocoder.geocode({ address }, (results, status) => {
				if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
					const location = results[0].geometry.location;
					resolve({
						lat: location.lat(),
						lng: location.lng()
					});
				} else {
					resolve(null);
				}
			});
		});
	}
}

// Export singleton instance
export const routeCalculationService = new RouteCalculationService();

// Type for cost calculation integration
export interface RouteForCostCalculation {
	totalDistance: number;
	totalTime: number;
	segments: RouteSegment[];
	deadheadDistance: number;
	mainTripDistance: number;
}

/**
 * Helper function to format duration in human-readable format
 */
export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;

	if (hours === 0) {
		return `${mins} min`;
	} else if (mins === 0) {
		return `${hours}h`;
	} else {
		return `${hours}h ${mins}m`;
	}
}

/**
 * Helper function to format distance
 */
export function formatDistance(km: number, unit: 'km' | 'mi' = 'km'): string {
	if (unit === 'mi') {
		const miles = km * 0.621371;
		return `${Math.round(miles)} mi`;
	}
	return `${Math.round(km)} km`;
}
