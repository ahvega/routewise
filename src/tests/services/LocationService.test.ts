import { describe, it, expect } from 'vitest';
import { LocationService, serverLocationUtils } from '$lib/services/LocationService';

describe('LocationService', () => {
	describe('serverLocationUtils', () => {
		describe('generateGoogleMapsUrl', () => {
			it('should generate correct Google Maps URL from coordinates', () => {
				const url = serverLocationUtils.generateGoogleMapsUrl(14.0818, -87.2068);
				expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=14.0818,-87.2068');
			});
		});

		describe('generateWazeUrl', () => {
			it('should generate correct Waze URL from coordinates', () => {
				const url = serverLocationUtils.generateWazeUrl(14.0818, -87.2068);
				expect(url).toBe('https://waze.com/ul?ll=14.0818,-87.2068&navigate=yes');
			});
		});

		describe('generateUniversalLink', () => {
			it('should generate correct universal link for pickup', () => {
				const url = serverLocationUtils.generateUniversalLink(
					'https://app.routewise.com',
					'itinerary-123',
					'pickup'
				);
				expect(url).toBe('https://app.routewise.com/go/itinerary-123/pickup');
			});

			it('should generate correct universal link for dropoff', () => {
				const url = serverLocationUtils.generateUniversalLink(
					'https://app.routewise.com',
					'itinerary-456',
					'dropoff'
				);
				expect(url).toBe('https://app.routewise.com/go/itinerary-456/dropoff');
			});
		});

		describe('parseCoordinates', () => {
			it('should parse valid coordinate string', () => {
				const coords = serverLocationUtils.parseCoordinates('14.0818,-87.2068');
				expect(coords).toEqual({ lat: 14.0818, lng: -87.2068 });
			});

			it('should parse coordinate string with spaces', () => {
				const coords = serverLocationUtils.parseCoordinates('14.0818, -87.2068');
				expect(coords).toEqual({ lat: 14.0818, lng: -87.2068 });
			});

			it('should return null for invalid coordinate string', () => {
				const coords = serverLocationUtils.parseCoordinates('invalid');
				expect(coords).toBeNull();
			});

			it('should return null for incomplete coordinates', () => {
				const coords = serverLocationUtils.parseCoordinates('14.0818');
				expect(coords).toBeNull();
			});
		});

		describe('formatCoordinates', () => {
			it('should format coordinates with 6 decimal places', () => {
				const formatted = serverLocationUtils.formatCoordinates({
					lat: 14.08184567,
					lng: -87.20683456
				});
				expect(formatted).toBe('14.081846,-87.206835');
			});
		});
	});

	describe('LocationService static methods', () => {
		describe('detectPreferredMapApp', () => {
			it('should return google for Android user agent', () => {
				const result = LocationService.detectPreferredMapApp(
					'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
				);
				expect(result).toBe('google');
			});

			it('should return google for iPhone user agent', () => {
				const result = LocationService.detectPreferredMapApp(
					'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
				);
				expect(result).toBe('google');
			});

			it('should return google for desktop user agent', () => {
				const result = LocationService.detectPreferredMapApp(
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
				);
				expect(result).toBe('google');
			});
		});

		describe('getRedirectUrl', () => {
			const coords = { lat: 14.0818, lng: -87.2068 };

			it('should return Google Maps URL for google preference', () => {
				const url = LocationService.getRedirectUrl(coords, 'google');
				expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=14.0818,-87.2068');
			});

			it('should return Waze URL for waze preference', () => {
				const url = LocationService.getRedirectUrl(coords, 'waze');
				expect(url).toBe('https://waze.com/ul?ll=14.0818,-87.2068&navigate=yes');
			});

			it('should return Apple Maps URL for apple preference', () => {
				const url = LocationService.getRedirectUrl(coords, 'apple');
				expect(url).toBe('https://maps.apple.com/?daddr=14.0818,-87.2068&dirflg=d');
			});
		});
	});
});
