import { describe, it, expect, beforeEach } from 'vitest';
import { QRCodeService, qrCodeService } from '$lib/services/QRCodeService';

describe('QRCodeService', () => {
	let service: QRCodeService;

	beforeEach(() => {
		service = new QRCodeService();
	});

	describe('generateDataUrl', () => {
		it('should generate a valid data URL for a simple string', async () => {
			const dataUrl = await service.generateDataUrl('https://example.com');
			expect(dataUrl).toMatch(/^data:image\/png;base64,/);
		});

		it('should generate different QR codes for different content', async () => {
			const url1 = await service.generateDataUrl('https://example.com/1');
			const url2 = await service.generateDataUrl('https://example.com/2');
			expect(url1).not.toBe(url2);
		});

		it('should respect custom width option', async () => {
			const smallQR = await service.generateDataUrl('test', { width: 100 });
			const largeQR = await service.generateDataUrl('test', { width: 400 });
			// Larger QR should have more data
			expect(largeQR.length).toBeGreaterThan(smallQR.length);
		});
	});

	describe('generateSvg', () => {
		it('should generate valid SVG string', async () => {
			const svg = await service.generateSvg('https://example.com');
			expect(svg).toContain('<svg');
			expect(svg).toContain('</svg>');
		});
	});

	describe('generateItineraryQRCodes', () => {
		it('should generate QR codes for both pickup and dropoff', async () => {
			const result = await service.generateItineraryQRCodes(
				'https://app.example.com',
				'itinerary-123'
			);

			expect(result.pickupQrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
			expect(result.dropoffQrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
			// They should be different (different URLs encoded)
			expect(result.pickupQrCodeDataUrl).not.toBe(result.dropoffQrCodeDataUrl);
		});
	});

	describe('generateGoogleMapsQR', () => {
		it('should generate QR code for Google Maps coordinates', async () => {
			const qr = await service.generateGoogleMapsQR(14.0818, -87.2068);
			expect(qr).toMatch(/^data:image\/png;base64,/);
		});
	});

	describe('generateWazeQR', () => {
		it('should generate QR code for Waze coordinates', async () => {
			const qr = await service.generateWazeQR(14.0818, -87.2068);
			expect(qr).toMatch(/^data:image\/png;base64,/);
		});
	});

	describe('generateClientPortalQR', () => {
		it('should generate QR code for client portal link', async () => {
			const qr = await service.generateClientPortalQR(
				'https://app.example.com',
				'abc123token'
			);
			expect(qr).toMatch(/^data:image\/png;base64,/);
		});
	});

	describe('validateContent', () => {
		it('should return true for content within limits', () => {
			const shortContent = 'https://example.com';
			expect(service.validateContent(shortContent)).toBe(true);
		});

		it('should return false for content exceeding limits', () => {
			const longContent = 'a'.repeat(5000);
			expect(service.validateContent(longContent, 'H')).toBe(false);
		});
	});

	describe('singleton instance', () => {
		it('should export a singleton instance', () => {
			expect(qrCodeService).toBeInstanceOf(QRCodeService);
		});
	});
});
