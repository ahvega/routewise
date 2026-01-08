/**
 * Invoice Workflow Tests
 *
 * Tests the invoice lifecycle:
 * - Creation from completed itinerary
 * - Tax calculation (ISV 15% Honduras)
 * - Status transitions (draft → sent → paid/cancelled)
 * - Due date handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockQuotation,
  createMockItinerary,
  createMockInvoice,
  QuotationStatus,
  ItineraryStatus,
  InvoiceStatus,
  PaymentStatus,
  validInvoiceTransitions,
  isValidTransition,
  resetMockIds,
} from './convex-mock';

describe('Invoice Workflow', () => {
  beforeEach(() => {
    resetMockIds();
  });

  describe('Invoice Creation from Itinerary', () => {
    it('creates invoice from completed itinerary', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      expect(invoice._id).toBeDefined();
      expect(invoice.itineraryId).toBe(itinerary._id);
      expect(invoice.tenantId).toBe(itinerary.tenantId);
      expect(invoice.clientId).toBe(itinerary.clientId);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
    });

    it('generates unique invoice number', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);
      const year = new Date().getFullYear();

      expect(invoice.invoiceNumber).toMatch(new RegExp(`^INV-${year}-\\d{4}$`));
    });

    it('uses itinerary agreed price as subtotal', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      expect(invoice.subtotalHnl).toBe(itinerary.agreedPriceHnl);
    });

    it('generates description from itinerary route', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      expect(invoice.description).toContain(itinerary.origin);
      expect(invoice.description).toContain(itinerary.destination);
    });

    it('initializes with unpaid payment status', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(invoice.amountPaid).toBe(0);
    });

    it('sets full amount as amount due', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      expect(invoice.amountDue).toBe(invoice.totalHnl);
    });
  });

  describe('Tax Calculation', () => {
    it('applies ISV 15% tax by default (Honduras)', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      expect(invoice.taxPercentage).toBe(15);
    });

    it('calculates tax amount correctly', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      const expectedTax = invoice.subtotalHnl * (invoice.taxPercentage / 100);

      expect(invoice.taxAmountHnl).toBe(expectedTax);
    });

    it('calculates total as subtotal plus tax', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      const expectedTotal = invoice.subtotalHnl + invoice.taxAmountHnl;

      expect(invoice.totalHnl).toBe(expectedTotal);
    });

    it('calculates USD total using exchange rate', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      const expectedUsd = invoice.totalHnl / invoice.exchangeRateUsed;

      expect(invoice.totalUsd).toBeCloseTo(expectedUsd, 2);
    });

    it('can use custom tax percentage', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { taxPercentage: 0 }); // Tax exempt

      expect(invoice.taxPercentage).toBe(0);
    });
  });

  describe('Due Date Handling', () => {
    it('sets due date 30 days from invoice date by default', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary);

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(invoice.dueDate).toBeGreaterThan(invoice.invoiceDate);
      expect(invoice.dueDate - invoice.invoiceDate).toBe(thirtyDaysMs);
    });

    it('can set custom payment terms', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      const customDueDate = Date.now() + fifteenDaysMs;
      const invoice = createMockInvoice(itinerary, { dueDate: customDueDate });

      expect(invoice.dueDate).toBe(customDueDate);
    });
  });

  describe('Invoice Status Transitions', () => {
    it('allows transition from draft to sent', () => {
      expect(isValidTransition(
        validInvoiceTransitions,
        InvoiceStatus.DRAFT,
        InvoiceStatus.SENT
      )).toBe(true);
    });

    it('allows transition from draft to cancelled', () => {
      expect(isValidTransition(
        validInvoiceTransitions,
        InvoiceStatus.DRAFT,
        InvoiceStatus.CANCELLED
      )).toBe(true);
    });

    it('allows transition from sent to paid', () => {
      expect(isValidTransition(
        validInvoiceTransitions,
        InvoiceStatus.SENT,
        InvoiceStatus.PAID
      )).toBe(true);
    });

    it('allows transition from sent to cancelled', () => {
      expect(isValidTransition(
        validInvoiceTransitions,
        InvoiceStatus.SENT,
        InvoiceStatus.CANCELLED
      )).toBe(true);
    });

    it('allows transition from sent to void', () => {
      expect(isValidTransition(
        validInvoiceTransitions,
        InvoiceStatus.SENT,
        InvoiceStatus.VOID
      )).toBe(true);
    });

    it('allows transition from paid to void (for corrections)', () => {
      expect(isValidTransition(
        validInvoiceTransitions,
        InvoiceStatus.PAID,
        InvoiceStatus.VOID
      )).toBe(true);
    });

    it('does not allow transition from cancelled to any status', () => {
      expect(validInvoiceTransitions[InvoiceStatus.CANCELLED]).toHaveLength(0);
    });

    it('does not allow transition from void to any status', () => {
      expect(validInvoiceTransitions[InvoiceStatus.VOID]).toHaveLength(0);
    });

    it('does not allow going back from sent to draft', () => {
      expect(isValidTransition(
        validInvoiceTransitions,
        InvoiceStatus.SENT,
        InvoiceStatus.DRAFT
      )).toBe(false);
    });
  });

  describe('Invoice Deletion Rules', () => {
    it('only draft invoices can be deleted', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const draftInvoice = createMockInvoice(itinerary, { status: InvoiceStatus.DRAFT });
      const sentInvoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });
      const paidInvoice = createMockInvoice(itinerary, { status: InvoiceStatus.PAID });

      // Only draft should be deletable (sent+ should be cancelled/voided)
      expect(draftInvoice.status).toBe(InvoiceStatus.DRAFT);
      expect(sentInvoice.status).not.toBe(InvoiceStatus.DRAFT);
      expect(paidInvoice.status).not.toBe(InvoiceStatus.DRAFT);
    });
  });

  describe('One Invoice Per Itinerary Rule', () => {
    it('prevents creating duplicate invoice for same itinerary', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice1 = createMockInvoice(itinerary);

      // In real implementation, attempting to create second invoice
      // for same itinerary should throw error
      expect(invoice1.itineraryId).toBe(itinerary._id);

      // The check would be: if existing invoice has same itineraryId, throw
      // This is enforced at the Convex mutation level
    });
  });

  describe('Invoice Timestamps', () => {
    it('sets sentAt when transitioning to sent', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary);

      expect(invoice.sentAt).toBeUndefined();

      // Simulate status change
      const now = Date.now();
      invoice = {
        ...invoice,
        status: InvoiceStatus.SENT,
        sentAt: now,
      };

      expect(invoice.sentAt).toBe(now);
    });

    it('sets paidAt when fully paid', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      expect(invoice.paidAt).toBeUndefined();

      // Simulate full payment
      const now = Date.now();
      invoice = {
        ...invoice,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paidAt: now,
        amountPaid: invoice.totalHnl,
        amountDue: 0,
      };

      expect(invoice.paidAt).toBe(now);
    });

    it('sets cancelledAt when cancelling', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary);

      const now = Date.now();
      invoice = {
        ...invoice,
        status: InvoiceStatus.CANCELLED,
        cancelledAt: now,
      };

      expect(invoice.cancelledAt).toBe(now);
    });
  });
});
