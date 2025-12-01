/**
 * Service Description Generator
 * Generates natural language descriptions for transportation services
 * Used in quotations, invoices, and itineraries
 */

export interface ServiceDescriptionData {
	// Trip locations
	origin: string;
	destination: string;
	baseLocation?: string;

	// Trip type
	isRoundTrip: boolean;

	// Group info
	groupSize: number;

	// Vehicle info
	vehicleName?: string;
	vehicleCapacity?: number;

	// Duration and dates
	estimatedDays: number;
	startDate?: number; // timestamp
	endDate?: number; // timestamp

	// Distance info
	totalDistance: number;
	mainTripDistance?: number;
	deadheadDistance?: number;
	extraMileage?: number;
	distanceUnit?: 'km' | 'mi';

	// Costs (optional, for detailed descriptions)
	costs?: {
		fuel?: number;
		meals?: number;
		lodging?: number;
		incentive?: number;
		vehicleDistance?: number;
		vehicleDaily?: number;
		tolls?: number;
		total?: number;
	};

	// Options
	includeFuel?: boolean;
	includeMeals?: boolean;
	includeTolls?: boolean;
	includeDriverIncentive?: boolean;
}

export interface DescriptionOptions {
	language?: 'es' | 'en';
	format?: 'short' | 'medium' | 'detailed';
	includeVehicle?: boolean;
	includeDates?: boolean;
	includeDistance?: boolean;
	includeCosts?: boolean;
}

const defaultOptions: DescriptionOptions = {
	language: 'es',
	format: 'medium',
	includeVehicle: true,
	includeDates: true,
	includeDistance: true,
	includeCosts: false
};

/**
 * Service Description Generator
 */
export class ServiceDescriptionService {
	/**
	 * Format date in Spanish format (dd/mm/yyyy)
	 */
	private formatDateSpanish(timestamp: number): string {
		const date = new Date(timestamp);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}

	/**
	 * Format date in English format (mm/dd/yyyy)
	 */
	private formatDateEnglish(timestamp: number): string {
		const date = new Date(timestamp);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		return `${month}/${day}/${year}`;
	}

	/**
	 * Format number with thousands separator
	 */
	private formatNumber(value: number, locale: string = 'es-HN'): string {
		return Math.round(value).toLocaleString(locale);
	}

	/**
	 * Generate Spanish description
	 */
	private generateSpanishDescription(
		data: ServiceDescriptionData,
		options: DescriptionOptions
	): string {
		const parts: string[] = [];

		// Main service line
		const tripType = data.isRoundTrip ? 'ida y vuelta' : 'solo ida';
		parts.push(`Servicios de Transporte desde ${data.origin} hacia ${data.destination}, ${tripType}`);

		// Group size
		parts.push(`para grupo de ${data.groupSize} persona${data.groupSize > 1 ? 's' : ''}`);

		// Vehicle (if available and requested)
		if (options.includeVehicle && data.vehicleName) {
			parts.push(`en vehículo: ${data.vehicleName}`);
		}

		// Duration and dates
		if (options.includeDates) {
			const dayLabel = data.estimatedDays > 1 ? 'Días' : 'Día';
			if (data.startDate) {
				const startDateStr = this.formatDateSpanish(data.startDate);
				if (data.endDate && data.endDate !== data.startDate) {
					const endDateStr = this.formatDateSpanish(data.endDate);
					parts.push(`${data.estimatedDays} ${dayLabel}: ${startDateStr} - ${endDateStr}`);
				} else {
					parts.push(`${data.estimatedDays} ${dayLabel}: ${startDateStr}`);
				}
			} else {
				parts.push(`${data.estimatedDays} ${dayLabel}`);
			}
		}

		// Distance
		if (options.includeDistance) {
			const unit = data.distanceUnit === 'mi' ? 'Mi' : 'Km';
			const distance = this.formatNumber(data.totalDistance);
			parts.push(`total ${distance} ${unit}`);
		}

		return parts.join(', ') + '.';
	}

	/**
	 * Generate English description
	 */
	private generateEnglishDescription(
		data: ServiceDescriptionData,
		options: DescriptionOptions
	): string {
		const parts: string[] = [];

		// Main service line
		const tripType = data.isRoundTrip ? 'round trip' : 'one way';
		parts.push(`Transportation Services from ${data.origin} to ${data.destination}, ${tripType}`);

		// Group size
		parts.push(`for a group of ${data.groupSize} person${data.groupSize > 1 ? 's' : ''}`);

		// Vehicle (if available and requested)
		if (options.includeVehicle && data.vehicleName) {
			parts.push(`in vehicle: ${data.vehicleName}`);
		}

		// Duration and dates
		if (options.includeDates) {
			const dayLabel = data.estimatedDays > 1 ? 'Days' : 'Day';
			if (data.startDate) {
				const startDateStr = this.formatDateEnglish(data.startDate);
				if (data.endDate && data.endDate !== data.startDate) {
					const endDateStr = this.formatDateEnglish(data.endDate);
					parts.push(`${data.estimatedDays} ${dayLabel}: ${startDateStr} - ${endDateStr}`);
				} else {
					parts.push(`${data.estimatedDays} ${dayLabel}: ${startDateStr}`);
				}
			} else {
				parts.push(`${data.estimatedDays} ${dayLabel}`);
			}
		}

		// Distance
		if (options.includeDistance) {
			const unit = data.distanceUnit === 'mi' ? 'Mi' : 'Km';
			const distance = this.formatNumber(data.totalDistance, 'en-US');
			parts.push(`total ${distance} ${unit}`);
		}

		return parts.join(', ') + '.';
	}

	/**
	 * Generate a detailed breakdown description (Spanish)
	 */
	private generateDetailedSpanish(data: ServiceDescriptionData): string {
		const lines: string[] = [];

		// Header
		const tripType = data.isRoundTrip ? 'Ida y Vuelta' : 'Solo Ida';
		lines.push(`SERVICIOS DE TRANSPORTE - ${tripType.toUpperCase()}`);
		lines.push('');

		// Route
		lines.push(`RUTA:`);
		lines.push(`  • Origen: ${data.origin}`);
		lines.push(`  • Destino: ${data.destination}`);
		if (data.baseLocation && data.baseLocation !== data.origin) {
			lines.push(`  • Base del vehículo: ${data.baseLocation}`);
		}
		lines.push('');

		// Trip details
		lines.push(`DETALLES DEL VIAJE:`);
		lines.push(`  • Tipo: ${tripType}`);
		lines.push(`  • Pasajeros: ${data.groupSize}`);
		lines.push(`  • Duración: ${data.estimatedDays} día${data.estimatedDays > 1 ? 's' : ''}`);
		if (data.startDate) {
			const startStr = this.formatDateSpanish(data.startDate);
			const endStr = data.endDate ? this.formatDateSpanish(data.endDate) : startStr;
			lines.push(`  • Fechas: ${startStr}${data.endDate && data.endDate !== data.startDate ? ` - ${endStr}` : ''}`);
		}
		lines.push('');

		// Vehicle
		if (data.vehicleName) {
			lines.push(`VEHÍCULO:`);
			lines.push(`  • ${data.vehicleName}${data.vehicleCapacity ? ` (${data.vehicleCapacity} pasajeros)` : ''}`);
			lines.push('');
		}

		// Distance breakdown
		const unit = data.distanceUnit === 'mi' ? 'Mi' : 'Km';
		lines.push(`DISTANCIAS:`);
		if (data.mainTripDistance !== undefined) {
			lines.push(`  • Viaje principal: ${this.formatNumber(data.mainTripDistance)} ${unit}`);
		}
		if (data.deadheadDistance && data.deadheadDistance > 0) {
			lines.push(`  • Reposicionamiento: ${this.formatNumber(data.deadheadDistance)} ${unit}`);
		}
		if (data.extraMileage && data.extraMileage > 0) {
			lines.push(`  • Kms extra: ${this.formatNumber(data.extraMileage)} ${unit}`);
		}
		lines.push(`  • TOTAL: ${this.formatNumber(data.totalDistance)} ${unit}`);

		// Costs breakdown (if provided)
		if (data.costs) {
			lines.push('');
			lines.push(`COSTOS INCLUIDOS:`);
			if (data.includeFuel && data.costs.fuel) {
				lines.push(`  • Combustible: L ${this.formatNumber(data.costs.fuel)}`);
			}
			if (data.includeMeals) {
				if (data.costs.meals) lines.push(`  • Viáticos: L ${this.formatNumber(data.costs.meals)}`);
				if (data.costs.lodging) lines.push(`  • Hospedaje: L ${this.formatNumber(data.costs.lodging)}`);
			}
			if (data.includeDriverIncentive && data.costs.incentive) {
				lines.push(`  • Incentivo conductor: L ${this.formatNumber(data.costs.incentive)}`);
			}
			if (data.costs.vehicleDistance) {
				lines.push(`  • Costo por km: L ${this.formatNumber(data.costs.vehicleDistance)}`);
			}
			if (data.costs.vehicleDaily) {
				lines.push(`  • Costo diario: L ${this.formatNumber(data.costs.vehicleDaily)}`);
			}
			if (data.includeTolls && data.costs.tolls) {
				lines.push(`  • Peajes: L ${this.formatNumber(data.costs.tolls)}`);
			}
			if (data.costs.total) {
				lines.push(`  • SUBTOTAL: L ${this.formatNumber(data.costs.total)}`);
			}
		}

		return lines.join('\n');
	}

	/**
	 * Generate service description
	 */
	generate(data: ServiceDescriptionData, options?: Partial<DescriptionOptions>): string {
		const opts = { ...defaultOptions, ...options };

		if (opts.format === 'detailed') {
			return opts.language === 'en'
				? this.generateDetailedSpanish(data) // TODO: Add English detailed version
				: this.generateDetailedSpanish(data);
		}

		return opts.language === 'en'
			? this.generateEnglishDescription(data, opts)
			: this.generateSpanishDescription(data, opts);
	}

	/**
	 * Generate a short one-line summary
	 */
	generateShort(data: ServiceDescriptionData, language: 'es' | 'en' = 'es'): string {
		const tripType = data.isRoundTrip
			? (language === 'es' ? 'I/V' : 'RT')
			: (language === 'es' ? 'Ida' : 'OW');

		return `${data.origin} → ${data.destination} (${tripType}, ${data.groupSize} pax, ${data.estimatedDays}d)`;
	}
}

// Export singleton instance
export const serviceDescriptionService = new ServiceDescriptionService();

/**
 * Helper function to generate invoice description
 */
export function generateInvoiceDescription(
	data: ServiceDescriptionData,
	language: 'es' | 'en' = 'es'
): string {
	return serviceDescriptionService.generate(data, {
		language,
		format: 'medium',
		includeVehicle: true,
		includeDates: true,
		includeDistance: true,
		includeCosts: false
	});
}

/**
 * Helper function to generate quotation description
 */
export function generateQuotationDescription(
	data: ServiceDescriptionData,
	language: 'es' | 'en' = 'es'
): string {
	return serviceDescriptionService.generate(data, {
		language,
		format: 'detailed',
		includeVehicle: true,
		includeDates: true,
		includeDistance: true,
		includeCosts: true
	});
}
