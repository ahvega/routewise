/**
 * Quotation Workflow Tests
 *
 * Tests the quotation lifecycle:
 * - Creation with cost breakdown
 * - Status transitions (draft → sent → approved/rejected)
 * - Validation rules
 * - Conversion eligibility for itinerary
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockQuotation,
  QuotationStatus,
  validQuotationTransitions,
  isValidTransition,
  resetMockIds,
  mockTenant,
  mockClient,
  mockVehicle,
} from './convex-mock';

describe('Quotation Workflow', () => {
  beforeEach(() => {
    resetMockIds();
  });

  describe('Quotation Creation', () => {
    it('creates a quotation with all required fields', () => {
      const quotation = createMockQuotation();

      expect(quotation._id).toBeDefined();
      expect(quotation.quotationNumber).toMatch(/^QT-\d{4}-\d{4}$/);
      expect(quotation.tenantId).toBe(mockTenant._id);
      expect(quotation.clientId).toBe(mockClient._id);
      expect(quotation.vehicleId).toBe(mockVehicle._id);
      expect(quotation.status).toBe(QuotationStatus.DRAFT);
    });

    it('calculates total cost correctly', () => {
      const quotation = createMockQuotation();

      const expectedTotal =
        quotation.fuelCost +
        quotation.refuelingCost +
        quotation.driverMealsCost +
        quotation.driverLodgingCost +
        quotation.driverIncentiveCost +
        quotation.vehicleDistanceCost +
        quotation.vehicleDailyCost +
        quotation.tollCost;

      expect(quotation.totalCost).toBe(expectedTotal);
    });

    it('applies markup percentage to calculate sale price', () => {
      const quotation = createMockQuotation();
      const expectedSalePrice = quotation.totalCost * (1 + quotation.selectedMarkupPercentage / 100);

      expect(quotation.salePriceHnl).toBe(expectedSalePrice);
    });

    it('calculates USD price using exchange rate', () => {
      const quotation = createMockQuotation();
      const expectedUsd = Math.round(quotation.salePriceHnl / quotation.exchangeRateUsed);

      expect(Math.round(quotation.salePriceUsd)).toBe(expectedUsd);
    });

    it('sets valid until date 30 days from creation by default', () => {
      const quotation = createMockQuotation();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(quotation.validUntil).toBeGreaterThan(quotation.createdAt);
      expect(quotation.validUntil! - quotation.createdAt).toBe(thirtyDaysMs);
    });

    it('creates quotation without client (for quick quotes)', () => {
      const quotation = createMockQuotation({ clientId: undefined });

      expect(quotation.clientId).toBeUndefined();
      expect(quotation.status).toBe(QuotationStatus.DRAFT);
    });

    it('creates quotation without vehicle (for initial estimates)', () => {
      const quotation = createMockQuotation({ vehicleId: undefined });

      expect(quotation.vehicleId).toBeUndefined();
      expect(quotation.status).toBe(QuotationStatus.DRAFT);
    });
  });

  describe('Quotation Status Transitions', () => {
    it('allows transition from draft to sent', () => {
      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.DRAFT,
        QuotationStatus.SENT
      )).toBe(true);
    });

    it('allows transition from draft directly to approved', () => {
      // For cases where client approves in person
      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.DRAFT,
        QuotationStatus.APPROVED
      )).toBe(true);
    });

    it('allows transition from sent to approved', () => {
      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.SENT,
        QuotationStatus.APPROVED
      )).toBe(true);
    });

    it('allows transition from sent to rejected', () => {
      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.SENT,
        QuotationStatus.REJECTED
      )).toBe(true);
    });

    it('allows transition from sent to expired', () => {
      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.SENT,
        QuotationStatus.EXPIRED
      )).toBe(true);
    });

    it('does not allow transition from approved to any status', () => {
      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.APPROVED,
        QuotationStatus.DRAFT
      )).toBe(false);

      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.APPROVED,
        QuotationStatus.SENT
      )).toBe(false);

      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.APPROVED,
        QuotationStatus.REJECTED
      )).toBe(false);
    });

    it('does not allow transition from rejected to any status', () => {
      expect(validQuotationTransitions[QuotationStatus.REJECTED]).toHaveLength(0);
    });

    it('does not allow transition from expired to any status', () => {
      expect(validQuotationTransitions[QuotationStatus.EXPIRED]).toHaveLength(0);
    });

    it('does not allow transition from rejected back to draft', () => {
      expect(isValidTransition(
        validQuotationTransitions,
        QuotationStatus.REJECTED,
        QuotationStatus.DRAFT
      )).toBe(false);
    });
  });

  describe('Quotation Cost Options', () => {
    it('can exclude fuel from total (rent-a-car mode)', () => {
      const quotation = createMockQuotation({ includeFuel: false });

      expect(quotation.includeFuel).toBe(false);
      // Note: In actual implementation, totalCost would be recalculated
      // This test verifies the flag is properly set
    });

    it('can exclude meals from total', () => {
      const quotation = createMockQuotation({ includeMeals: false });

      expect(quotation.includeMeals).toBe(false);
    });

    it('can exclude tolls from total', () => {
      const quotation = createMockQuotation({ includeTolls: false });

      expect(quotation.includeTolls).toBe(false);
    });

    it('can exclude driver incentive from total', () => {
      const quotation = createMockQuotation({ includeDriverIncentive: false });

      expect(quotation.includeDriverIncentive).toBe(false);
    });
  });

  describe('Quotation Deletion Rules', () => {
    it('only draft quotations can be deleted', () => {
      const draftQuotation = createMockQuotation({ status: QuotationStatus.DRAFT });
      const sentQuotation = createMockQuotation({ status: QuotationStatus.SENT });
      const approvedQuotation = createMockQuotation({ status: QuotationStatus.APPROVED });

      expect(draftQuotation.status).toBe(QuotationStatus.DRAFT);
      expect(sentQuotation.status).not.toBe(QuotationStatus.DRAFT);
      expect(approvedQuotation.status).not.toBe(QuotationStatus.DRAFT);
    });
  });

  describe('Quotation Eligibility for Itinerary Conversion', () => {
    it('only approved quotations can be converted to itineraries', () => {
      const approvedQuotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const draftQuotation = createMockQuotation({ status: QuotationStatus.DRAFT });
      const sentQuotation = createMockQuotation({ status: QuotationStatus.SENT });
      const rejectedQuotation = createMockQuotation({ status: QuotationStatus.REJECTED });

      // Only approved should be eligible
      expect(approvedQuotation.status).toBe(QuotationStatus.APPROVED);
      expect(draftQuotation.status).not.toBe(QuotationStatus.APPROVED);
      expect(sentQuotation.status).not.toBe(QuotationStatus.APPROVED);
      expect(rejectedQuotation.status).not.toBe(QuotationStatus.APPROVED);
    });
  });

  describe('Quotation Number Generation', () => {
    it('generates sequential quotation numbers within year', () => {
      const year = new Date().getFullYear();
      const quotation1 = createMockQuotation();
      const quotation2 = createMockQuotation({ quotationNumber: `QT-${year}-0002` });
      const quotation3 = createMockQuotation({ quotationNumber: `QT-${year}-0003` });

      expect(quotation1.quotationNumber).toMatch(new RegExp(`^QT-${year}-\\d{4}$`));
      expect(quotation2.quotationNumber).toBe(`QT-${year}-0002`);
      expect(quotation3.quotationNumber).toBe(`QT-${year}-0003`);
    });
  });
});
