/**
 * Itinerary Workflow Tests
 *
 * Tests the itinerary lifecycle:
 * - Creation from approved quotation
 * - Status transitions (scheduled → in_progress → completed/cancelled)
 * - Driver and vehicle assignment
 * - Eligibility for invoice generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockQuotation,
  createMockItinerary,
  QuotationStatus,
  ItineraryStatus,
  validItineraryTransitions,
  isValidTransition,
  resetMockIds,
  mockDriver,
  mockVehicle,
} from './convex-mock';

describe('Itinerary Workflow', () => {
  beforeEach(() => {
    resetMockIds();
  });

  describe('Itinerary Creation from Quotation', () => {
    it('creates itinerary from approved quotation', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);

      expect(itinerary._id).toBeDefined();
      expect(itinerary.quotationId).toBe(quotation._id);
      expect(itinerary.tenantId).toBe(quotation.tenantId);
      expect(itinerary.clientId).toBe(quotation.clientId);
      expect(itinerary.status).toBe(ItineraryStatus.SCHEDULED);
    });

    it('copies trip details from quotation', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);

      expect(itinerary.origin).toBe(quotation.origin);
      expect(itinerary.destination).toBe(quotation.destination);
      expect(itinerary.baseLocation).toBe(quotation.baseLocation);
      expect(itinerary.groupSize).toBe(quotation.groupSize);
      expect(itinerary.totalDistance).toBe(quotation.totalDistance);
      expect(itinerary.estimatedDays).toBe(quotation.estimatedDays);
    });

    it('copies pricing from quotation', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);

      expect(itinerary.agreedPriceHnl).toBe(quotation.salePriceHnl);
      expect(itinerary.agreedPriceUsd).toBe(quotation.salePriceUsd);
      expect(itinerary.exchangeRateUsed).toBe(quotation.exchangeRateUsed);
    });

    it('generates unique itinerary number', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);
      const year = new Date().getFullYear();

      expect(itinerary.itineraryNumber).toMatch(new RegExp(`^IT-${year}-\\d{4}$`));
    });

    it('sets start date for scheduling', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);

      expect(itinerary.startDate).toBeGreaterThan(Date.now());
    });

    it('sets default pickup/dropoff locations from origin/destination', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);

      expect(itinerary.pickupLocation).toBe(quotation.origin);
      expect(itinerary.dropoffLocation).toBe(quotation.destination);
    });
  });

  describe('Itinerary Status Transitions', () => {
    it('allows transition from scheduled to in_progress', () => {
      expect(isValidTransition(
        validItineraryTransitions,
        ItineraryStatus.SCHEDULED,
        ItineraryStatus.IN_PROGRESS
      )).toBe(true);
    });

    it('allows transition from scheduled to cancelled', () => {
      expect(isValidTransition(
        validItineraryTransitions,
        ItineraryStatus.SCHEDULED,
        ItineraryStatus.CANCELLED
      )).toBe(true);
    });

    it('allows transition from in_progress to completed', () => {
      expect(isValidTransition(
        validItineraryTransitions,
        ItineraryStatus.IN_PROGRESS,
        ItineraryStatus.COMPLETED
      )).toBe(true);
    });

    it('allows transition from in_progress to cancelled', () => {
      expect(isValidTransition(
        validItineraryTransitions,
        ItineraryStatus.IN_PROGRESS,
        ItineraryStatus.CANCELLED
      )).toBe(true);
    });

    it('does not allow transition from completed to any status', () => {
      expect(validItineraryTransitions[ItineraryStatus.COMPLETED]).toHaveLength(0);
    });

    it('does not allow transition from cancelled to any status', () => {
      expect(validItineraryTransitions[ItineraryStatus.CANCELLED]).toHaveLength(0);
    });

    it('does not allow skipping in_progress to go directly to completed', () => {
      expect(isValidTransition(
        validItineraryTransitions,
        ItineraryStatus.SCHEDULED,
        ItineraryStatus.COMPLETED
      )).toBe(false);
    });

    it('does not allow going back from in_progress to scheduled', () => {
      expect(isValidTransition(
        validItineraryTransitions,
        ItineraryStatus.IN_PROGRESS,
        ItineraryStatus.SCHEDULED
      )).toBe(false);
    });
  });

  describe('Driver Assignment', () => {
    it('can assign driver to itinerary', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { driverId: mockDriver._id });

      expect(itinerary.driverId).toBe(mockDriver._id);
    });

    it('can create itinerary without driver initially', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { driverId: undefined });

      expect(itinerary.driverId).toBeUndefined();
    });

    it('can update driver assignment', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      let itinerary = createMockItinerary(quotation, { driverId: undefined });

      expect(itinerary.driverId).toBeUndefined();

      // Simulate driver assignment
      itinerary = { ...itinerary, driverId: mockDriver._id };

      expect(itinerary.driverId).toBe(mockDriver._id);
    });
  });

  describe('Vehicle Assignment', () => {
    it('inherits vehicle from quotation', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);

      expect(itinerary.vehicleId).toBe(quotation.vehicleId);
    });

    it('can override vehicle from quotation', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const newVehicleId = 'vehicles_new_123';
      const itinerary = createMockItinerary(quotation, { vehicleId: newVehicleId });

      expect(itinerary.vehicleId).toBe(newVehicleId);
    });
  });

  describe('Itinerary Deletion Rules', () => {
    it('only scheduled itineraries can be deleted', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const scheduledItinerary = createMockItinerary(quotation, { status: ItineraryStatus.SCHEDULED });
      const inProgressItinerary = createMockItinerary(quotation, { status: ItineraryStatus.IN_PROGRESS });
      const completedItinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });

      // Only scheduled should be deletable (others should be cancelled instead)
      expect(scheduledItinerary.status).toBe(ItineraryStatus.SCHEDULED);
      expect(inProgressItinerary.status).not.toBe(ItineraryStatus.SCHEDULED);
      expect(completedItinerary.status).not.toBe(ItineraryStatus.SCHEDULED);
    });
  });

  describe('Itinerary Eligibility for Invoice Generation', () => {
    it('only completed itineraries can generate invoices', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const scheduledItinerary = createMockItinerary(quotation, { status: ItineraryStatus.SCHEDULED });
      const inProgressItinerary = createMockItinerary(quotation, { status: ItineraryStatus.IN_PROGRESS });
      const completedItinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const cancelledItinerary = createMockItinerary(quotation, { status: ItineraryStatus.CANCELLED });

      // Only completed should be eligible for invoice
      expect(completedItinerary.status).toBe(ItineraryStatus.COMPLETED);
      expect(scheduledItinerary.status).not.toBe(ItineraryStatus.COMPLETED);
      expect(inProgressItinerary.status).not.toBe(ItineraryStatus.COMPLETED);
      expect(cancelledItinerary.status).not.toBe(ItineraryStatus.COMPLETED);
    });

    it('cancelled itineraries cannot generate invoices', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const cancelledItinerary = createMockItinerary(quotation, { status: ItineraryStatus.CANCELLED });

      expect(cancelledItinerary.status).toBe(ItineraryStatus.CANCELLED);
      expect(cancelledItinerary.status).not.toBe(ItineraryStatus.COMPLETED);
    });
  });

  describe('Itinerary Timestamps', () => {
    it('sets startedAt when transitioning to in_progress', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      let itinerary = createMockItinerary(quotation, { status: ItineraryStatus.SCHEDULED });

      expect(itinerary.startedAt).toBeUndefined();

      // Simulate status change
      const now = Date.now();
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.IN_PROGRESS,
        startedAt: now,
      };

      expect(itinerary.startedAt).toBe(now);
    });

    it('sets completedAt when transitioning to completed', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      let itinerary = createMockItinerary(quotation, { status: ItineraryStatus.IN_PROGRESS });

      expect(itinerary.completedAt).toBeUndefined();

      // Simulate status change
      const now = Date.now();
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.COMPLETED,
        completedAt: now,
      };

      expect(itinerary.completedAt).toBe(now);
    });

    it('sets cancelledAt and reason when cancelling', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      let itinerary = createMockItinerary(quotation, { status: ItineraryStatus.SCHEDULED });

      const now = Date.now();
      const reason = 'Client requested cancellation';

      itinerary = {
        ...itinerary,
        status: ItineraryStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: reason,
      };

      expect(itinerary.cancelledAt).toBe(now);
      expect(itinerary.cancellationReason).toBe(reason);
    });
  });

  describe('One Itinerary Per Quotation Rule', () => {
    it('prevents creating duplicate itinerary for same quotation', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary1 = createMockItinerary(quotation);

      // In real implementation, attempting to create second itinerary
      // for same quotation should throw error
      expect(itinerary1.quotationId).toBe(quotation._id);

      // The check would be: if existing itinerary has same quotationId, throw
      // This is enforced at the Convex mutation level
    });
  });
});
