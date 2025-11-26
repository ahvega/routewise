/**
 * Validation Utilities
 */

import { VALIDATION_LIMITS } from '$lib/types';

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Validate group size
 */
export function validateGroupSize(size: number): ValidationResult {
	const errors: string[] = [];

	if (!Number.isInteger(size)) {
		errors.push('Group size must be a whole number');
	}

	if (size < VALIDATION_LIMITS.groupSize.min) {
		errors.push(`Group size must be at least ${VALIDATION_LIMITS.groupSize.min}`);
	}

	if (size > VALIDATION_LIMITS.groupSize.max) {
		errors.push(`Group size cannot exceed ${VALIDATION_LIMITS.groupSize.max}`);
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate extra mileage
 */
export function validateExtraMileage(mileage: number): ValidationResult {
	const errors: string[] = [];

	if (mileage < VALIDATION_LIMITS.extraMileage.min) {
		errors.push(`Extra mileage cannot be negative`);
	}

	if (mileage > VALIDATION_LIMITS.extraMileage.max) {
		errors.push(`Extra mileage cannot exceed ${VALIDATION_LIMITS.extraMileage.max} km`);
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate fuel efficiency
 */
export function validateFuelEfficiency(efficiency: number): ValidationResult {
	const errors: string[] = [];

	if (efficiency < VALIDATION_LIMITS.fuelEfficiency.min) {
		errors.push(`Fuel efficiency must be at least ${VALIDATION_LIMITS.fuelEfficiency.min}`);
	}

	if (efficiency > VALIDATION_LIMITS.fuelEfficiency.max) {
		errors.push(`Fuel efficiency cannot exceed ${VALIDATION_LIMITS.fuelEfficiency.max}`);
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate passenger capacity
 */
export function validatePassengerCapacity(capacity: number): ValidationResult {
	const errors: string[] = [];

	if (!Number.isInteger(capacity)) {
		errors.push('Passenger capacity must be a whole number');
	}

	if (capacity < VALIDATION_LIMITS.passengerCapacity.min) {
		errors.push(`Passenger capacity must be at least ${VALIDATION_LIMITS.passengerCapacity.min}`);
	}

	if (capacity > VALIDATION_LIMITS.passengerCapacity.max) {
		errors.push(`Passenger capacity cannot exceed ${VALIDATION_LIMITS.passengerCapacity.max}`);
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
	const errors: string[] = [];
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!email || email.trim() === '') {
		errors.push('Email is required');
	} else if (!emailRegex.test(email)) {
		errors.push('Invalid email format');
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate phone number (Honduras format)
 */
export function validatePhone(phone: string): ValidationResult {
	const errors: string[] = [];
	// Honduras phone format: 8 digits, may start with +504
	const phoneRegex = /^(\+504)?[23489]\d{7}$/;

	if (!phone || phone.trim() === '') {
		errors.push('Phone number is required');
	} else {
		const cleanPhone = phone.replace(/[\s-]/g, '');
		if (!phoneRegex.test(cleanPhone)) {
			errors.push('Invalid phone number format');
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate required string field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
	const errors: string[] = [];

	if (!value || value.trim() === '') {
		errors.push(`${fieldName} is required`);
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(
	value: number,
	fieldName: string
): ValidationResult {
	const errors: string[] = [];

	if (typeof value !== 'number' || isNaN(value)) {
		errors.push(`${fieldName} must be a valid number`);
	} else if (value <= 0) {
		errors.push(`${fieldName} must be greater than zero`);
	}

	return { valid: errors.length === 0, errors };
}
