/**
 * QR Code Service
 * Generates QR codes for navigation links in itineraries
 */

import QRCode from 'qrcode';

export interface QRCodeOptions {
	width?: number;
	margin?: number;
	color?: {
		dark?: string;
		light?: string;
	};
	errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

const defaultOptions: QRCodeOptions = {
	width: 200,
	margin: 2,
	color: {
		dark: '#000000',
		light: '#FFFFFF'
	},
	errorCorrectionLevel: 'M'
};

/**
 * QR Code Service
 * Generates QR codes as data URLs or SVG strings
 */
export class QRCodeService {
	/**
	 * Generate a QR code as a data URL (base64 encoded PNG)
	 * Suitable for embedding in HTML img tags or PDFs
	 */
	async generateDataUrl(content: string, options?: QRCodeOptions): Promise<string> {
		const opts = { ...defaultOptions, ...options };

		try {
			const dataUrl = await QRCode.toDataURL(content, {
				width: opts.width,
				margin: opts.margin,
				color: opts.color,
				errorCorrectionLevel: opts.errorCorrectionLevel
			});

			return dataUrl;
		} catch (error) {
			console.error('Failed to generate QR code:', error);
			throw new Error(`QR code generation failed: ${error}`);
		}
	}

	/**
	 * Generate a QR code as an SVG string
	 * Suitable for embedding in HTML or generating crisp vector graphics
	 */
	async generateSvg(content: string, options?: QRCodeOptions): Promise<string> {
		const opts = { ...defaultOptions, ...options };

		try {
			const svg = await QRCode.toString(content, {
				type: 'svg',
				width: opts.width,
				margin: opts.margin,
				color: opts.color,
				errorCorrectionLevel: opts.errorCorrectionLevel
			});

			return svg;
		} catch (error) {
			console.error('Failed to generate QR code SVG:', error);
			throw new Error(`QR code SVG generation failed: ${error}`);
		}
	}

	/**
	 * Generate QR codes for an itinerary's pickup and dropoff locations
	 * Returns data URLs for both locations
	 */
	async generateItineraryQRCodes(
		baseUrl: string,
		itineraryId: string,
		options?: QRCodeOptions
	): Promise<{
		pickupQrCodeDataUrl: string;
		dropoffQrCodeDataUrl: string;
	}> {
		// Generate universal links that redirect to the appropriate map app
		const pickupUrl = `${baseUrl}/go/${itineraryId}/pickup`;
		const dropoffUrl = `${baseUrl}/go/${itineraryId}/dropoff`;

		// Generate QR codes in parallel
		const [pickupQrCodeDataUrl, dropoffQrCodeDataUrl] = await Promise.all([
			this.generateDataUrl(pickupUrl, options),
			this.generateDataUrl(dropoffUrl, options)
		]);

		return {
			pickupQrCodeDataUrl,
			dropoffQrCodeDataUrl
		};
	}

	/**
	 * Generate a QR code for a direct Google Maps link
	 */
	async generateGoogleMapsQR(
		lat: number,
		lng: number,
		options?: QRCodeOptions
	): Promise<string> {
		const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
		return this.generateDataUrl(url, options);
	}

	/**
	 * Generate a QR code for a direct Waze link
	 */
	async generateWazeQR(lat: number, lng: number, options?: QRCodeOptions): Promise<string> {
		const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
		return this.generateDataUrl(url, options);
	}

	/**
	 * Generate QR code for client portal magic link
	 */
	async generateClientPortalQR(
		baseUrl: string,
		accessToken: string,
		options?: QRCodeOptions
	): Promise<string> {
		const url = `${baseUrl}/portal/${accessToken}`;
		return this.generateDataUrl(url, options);
	}

	/**
	 * Generate VCard string for a contact
	 * VCard 3.0 format for maximum compatibility
	 */
	generateVCardString(contact: {
		name: string;
		phone?: string;
		email?: string;
		organization?: string;
		title?: string;
	}): string {
		const lines: string[] = [
			'BEGIN:VCARD',
			'VERSION:3.0',
			`FN:${contact.name}`
		];

		// Parse name into parts (simplified: assume "FirstName LastName" format)
		const nameParts = contact.name.trim().split(/\s+/);
		const lastName = nameParts.length > 1 ? nameParts.pop() : '';
		const firstName = nameParts.join(' ');
		lines.push(`N:${lastName};${firstName};;;`);

		if (contact.phone) {
			// Clean phone number and add as CELL
			const cleanPhone = contact.phone.replace(/[^\d+]/g, '');
			lines.push(`TEL;TYPE=CELL:${cleanPhone}`);
		}

		if (contact.email) {
			lines.push(`EMAIL:${contact.email}`);
		}

		if (contact.organization) {
			lines.push(`ORG:${contact.organization}`);
		}

		if (contact.title) {
			lines.push(`TITLE:${contact.title}`);
		}

		lines.push('END:VCARD');

		return lines.join('\r\n');
	}

	/**
	 * Generate QR code for a VCard contact
	 * When scanned, this allows adding the contact directly to the phone
	 */
	async generateVCardQR(
		contact: {
			name: string;
			phone?: string;
			email?: string;
			organization?: string;
			title?: string;
		},
		options?: QRCodeOptions
	): Promise<string> {
		const vcard = this.generateVCardString(contact);
		return this.generateDataUrl(vcard, options);
	}

	/**
	 * Validate that a string can be encoded as a QR code
	 * QR codes have character limits based on error correction level
	 */
	validateContent(content: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'): boolean {
		// Approximate character limits for alphanumeric content
		const limits: Record<string, number> = {
			L: 4296,
			M: 3391,
			Q: 2420,
			H: 1852
		};

		return content.length <= limits[errorCorrectionLevel];
	}
}

// Export singleton instance
export const qrCodeService = new QRCodeService();

/**
 * Helper function to generate QR code for any URL
 */
export async function generateQRCode(
	url: string,
	options?: QRCodeOptions
): Promise<string> {
	return qrCodeService.generateDataUrl(url, options);
}

/**
 * Helper to generate navigation QR codes for an address with coordinates
 */
export async function generateNavigationQRCodes(
	lat: number,
	lng: number,
	options?: QRCodeOptions
): Promise<{
	googleMapsQR: string;
	wazeQR: string;
}> {
	const [googleMapsQR, wazeQR] = await Promise.all([
		qrCodeService.generateGoogleMapsQR(lat, lng, options),
		qrCodeService.generateWazeQR(lat, lng, options)
	]);

	return { googleMapsQR, wazeQR };
}
