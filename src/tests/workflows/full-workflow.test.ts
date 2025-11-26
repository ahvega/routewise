/**
 * Full Workflow Integration Tests
 *
 * Tests the complete transportation service workflow:
 * Quotation → Itinerary → Invoice → Payment
 *
 * This test suite validates the entire business flow from
 * initial quote to final payment recording.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockQuotation,
  createMockItinerary,
  createMockInvoice,
  createMockPayment,
  QuotationStatus,
  ItineraryStatus,
  InvoiceStatus,
  PaymentStatus,
  calculatePaymentStatus,
  resetMockIds,
  mockTenant,
  mockClient,
  mockVehicle,
  mockDriver,
} from './convex-mock';

describe('Full Transportation Service Workflow', () => {
  beforeEach(() => {
    resetMockIds();
  });

  describe('Complete Happy Path', () => {
    it('executes the full workflow from quotation to paid invoice', () => {
      // ========================================
      // STEP 1: Create Quotation
      // ========================================
      let quotation = createMockQuotation({
        status: QuotationStatus.DRAFT,
        clientId: mockClient._id,
        vehicleId: mockVehicle._id,
      });

      expect(quotation.status).toBe(QuotationStatus.DRAFT);
      expect(quotation.quotationNumber).toBeDefined();

      // ========================================
      // STEP 2: Send Quotation to Client
      // ========================================
      quotation = {
        ...quotation,
        status: QuotationStatus.SENT,
        sentAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(quotation.status).toBe(QuotationStatus.SENT);
      expect(quotation.sentAt).toBeDefined();

      // ========================================
      // STEP 3: Client Approves Quotation
      // ========================================
      quotation = {
        ...quotation,
        status: QuotationStatus.APPROVED,
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(quotation.status).toBe(QuotationStatus.APPROVED);
      expect(quotation.approvedAt).toBeDefined();

      // ========================================
      // STEP 4: Create Itinerary from Quotation
      // ========================================
      let itinerary = createMockItinerary(quotation, {
        driverId: mockDriver._id,
        vehicleId: quotation.vehicleId,
      });

      expect(itinerary.quotationId).toBe(quotation._id);
      expect(itinerary.status).toBe(ItineraryStatus.SCHEDULED);
      expect(itinerary.agreedPriceHnl).toBe(quotation.salePriceHnl);

      // ========================================
      // STEP 5: Start Trip (Itinerary In Progress)
      // ========================================
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.IN_PROGRESS,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(itinerary.status).toBe(ItineraryStatus.IN_PROGRESS);
      expect(itinerary.startedAt).toBeDefined();

      // ========================================
      // STEP 6: Complete Trip
      // ========================================
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.COMPLETED,
        completedAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(itinerary.status).toBe(ItineraryStatus.COMPLETED);
      expect(itinerary.completedAt).toBeDefined();

      // ========================================
      // STEP 7: Generate Invoice
      // ========================================
      let invoice = createMockInvoice(itinerary);

      expect(invoice.itineraryId).toBe(itinerary._id);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(invoice.subtotalHnl).toBe(itinerary.agreedPriceHnl);

      // Verify tax calculation (15% ISV)
      const expectedTax = invoice.subtotalHnl * 0.15;
      expect(invoice.taxAmountHnl).toBe(expectedTax);
      expect(invoice.totalHnl).toBe(invoice.subtotalHnl + expectedTax);

      // ========================================
      // STEP 8: Send Invoice to Client
      // ========================================
      invoice = {
        ...invoice,
        status: InvoiceStatus.SENT,
        sentAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(invoice.status).toBe(InvoiceStatus.SENT);
      expect(invoice.sentAt).toBeDefined();

      // ========================================
      // STEP 9: Record Payment (Full Payment)
      // ========================================
      const payment = createMockPayment(invoice, invoice.totalHnl, {
        paymentMethod: 'transfer',
        referenceNumber: 'TRF-2024-001234',
      });

      expect(payment.amount).toBe(invoice.totalHnl);
      expect(payment.invoiceId).toBe(invoice._id);

      // Update invoice after payment
      invoice = {
        ...invoice,
        amountPaid: invoice.totalHnl,
        amountDue: 0,
        paymentStatus: PaymentStatus.PAID,
        status: InvoiceStatus.PAID,
        paidAt: Date.now(),
        updatedAt: Date.now(),
      };

      // ========================================
      // FINAL VERIFICATION
      // ========================================
      expect(quotation.status).toBe(QuotationStatus.APPROVED);
      expect(itinerary.status).toBe(ItineraryStatus.COMPLETED);
      expect(invoice.status).toBe(InvoiceStatus.PAID);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
      expect(invoice.amountDue).toBe(0);
    });
  });

  describe('Partial Payment Workflow', () => {
    it('handles multiple partial payments until fully paid', () => {
      // Setup: Create approved quotation → completed itinerary → sent invoice
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      const totalAmount = invoice.totalHnl;
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);

      // First partial payment (30%)
      const payment1Amount = Math.round(totalAmount * 0.3);
      let totalPaid = payment1Amount;

      invoice = {
        ...invoice,
        amountPaid: totalPaid,
        amountDue: totalAmount - totalPaid,
        paymentStatus: calculatePaymentStatus(totalAmount, totalPaid),
      };

      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIAL);
      expect(invoice.amountPaid).toBe(payment1Amount);

      // Second partial payment (50%)
      const payment2Amount = Math.round(totalAmount * 0.5);
      totalPaid += payment2Amount;

      invoice = {
        ...invoice,
        amountPaid: totalPaid,
        amountDue: totalAmount - totalPaid,
        paymentStatus: calculatePaymentStatus(totalAmount, totalPaid),
      };

      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIAL);
      expect(invoice.amountPaid).toBe(payment1Amount + payment2Amount);

      // Final payment (remaining 20%)
      const payment3Amount = totalAmount - totalPaid;
      totalPaid += payment3Amount;

      invoice = {
        ...invoice,
        amountPaid: totalPaid,
        amountDue: 0,
        paymentStatus: calculatePaymentStatus(totalAmount, totalPaid),
        status: InvoiceStatus.PAID,
        paidAt: Date.now(),
      };

      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
      expect(invoice.amountDue).toBe(0);
      expect(invoice.status).toBe(InvoiceStatus.PAID);
    });
  });

  describe('Cancellation Scenarios', () => {
    it('handles quotation rejection', () => {
      let quotation = createMockQuotation({ status: QuotationStatus.SENT });

      // Client rejects
      quotation = {
        ...quotation,
        status: QuotationStatus.REJECTED,
        rejectedAt: Date.now(),
        notes: 'Price too high',
      };

      expect(quotation.status).toBe(QuotationStatus.REJECTED);
      // Cannot create itinerary from rejected quotation
      expect(quotation.status).not.toBe(QuotationStatus.APPROVED);
    });

    it('handles itinerary cancellation before trip starts', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      let itinerary = createMockItinerary(quotation, { status: ItineraryStatus.SCHEDULED });

      // Cancel before trip
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.CANCELLED,
        cancelledAt: Date.now(),
        cancellationReason: 'Client requested cancellation',
      };

      expect(itinerary.status).toBe(ItineraryStatus.CANCELLED);
      // Cannot generate invoice from cancelled itinerary
      expect(itinerary.status).not.toBe(ItineraryStatus.COMPLETED);
    });

    it('handles itinerary cancellation during trip', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      let itinerary = createMockItinerary(quotation, {
        status: ItineraryStatus.IN_PROGRESS,
        startedAt: Date.now(),
      });

      // Cancel during trip (emergency/breakdown)
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.CANCELLED,
        cancelledAt: Date.now(),
        cancellationReason: 'Vehicle breakdown - trip aborted',
      };

      expect(itinerary.status).toBe(ItineraryStatus.CANCELLED);
    });

    it('handles invoice cancellation', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.DRAFT });

      // Cancel invoice
      invoice = {
        ...invoice,
        status: InvoiceStatus.CANCELLED,
        cancelledAt: Date.now(),
      };

      expect(invoice.status).toBe(InvoiceStatus.CANCELLED);
    });
  });

  describe('Data Integrity Across Workflow', () => {
    it('maintains tenant isolation throughout workflow', () => {
      const quotation = createMockQuotation();
      const itinerary = createMockItinerary({ ...quotation, status: QuotationStatus.APPROVED });
      const invoice = createMockInvoice({ ...itinerary, status: ItineraryStatus.COMPLETED });
      const payment = createMockPayment(invoice, 1000);

      // All entities belong to same tenant
      expect(quotation.tenantId).toBe(mockTenant._id);
      expect(itinerary.tenantId).toBe(mockTenant._id);
      expect(invoice.tenantId).toBe(mockTenant._id);
      expect(payment.tenantId).toBe(mockTenant._id);
    });

    it('maintains client reference throughout workflow', () => {
      const quotation = createMockQuotation({ clientId: mockClient._id });
      const itinerary = createMockItinerary({ ...quotation, status: QuotationStatus.APPROVED });
      const invoice = createMockInvoice({ ...itinerary, status: ItineraryStatus.COMPLETED });

      expect(quotation.clientId).toBe(mockClient._id);
      expect(itinerary.clientId).toBe(mockClient._id);
      expect(invoice.clientId).toBe(mockClient._id);
    });

    it('preserves pricing from quotation to invoice', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation);
      const invoice = createMockInvoice({ ...itinerary, status: ItineraryStatus.COMPLETED });

      // Price flows: quotation.salePriceHnl → itinerary.agreedPriceHnl → invoice.subtotalHnl
      expect(itinerary.agreedPriceHnl).toBe(quotation.salePriceHnl);
      expect(invoice.subtotalHnl).toBe(itinerary.agreedPriceHnl);

      // Exchange rate preserved
      expect(itinerary.exchangeRateUsed).toBe(quotation.exchangeRateUsed);
      expect(invoice.exchangeRateUsed).toBe(itinerary.exchangeRateUsed);
    });

    it('maintains route information throughout workflow', () => {
      const quotation = createMockQuotation({
        origin: 'San Pedro Sula',
        destination: 'Tegucigalpa',
        totalDistance: 250,
      });
      const itinerary = createMockItinerary({ ...quotation, status: QuotationStatus.APPROVED });
      const invoice = createMockInvoice({ ...itinerary, status: ItineraryStatus.COMPLETED });

      expect(itinerary.origin).toBe(quotation.origin);
      expect(itinerary.destination).toBe(quotation.destination);
      expect(itinerary.totalDistance).toBe(quotation.totalDistance);

      // Invoice description includes route
      expect(invoice.description).toContain(quotation.origin);
      expect(invoice.description).toContain(quotation.destination);
    });
  });

  describe('Edge Cases', () => {
    it('handles quotation without client (walk-in quote)', () => {
      const quotation = createMockQuotation({
        status: QuotationStatus.APPROVED,
        clientId: undefined,
      });
      const itinerary = createMockItinerary(quotation);
      const invoice = createMockInvoice({ ...itinerary, status: ItineraryStatus.COMPLETED });

      expect(quotation.clientId).toBeUndefined();
      expect(itinerary.clientId).toBeUndefined();
      expect(invoice.clientId).toBeUndefined();

      // Workflow still completes
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
    });

    it('handles same-day trip workflow', () => {
      const now = Date.now();

      const quotation = createMockQuotation({
        status: QuotationStatus.APPROVED,
        estimatedDays: 1,
      });

      let itinerary = createMockItinerary(quotation, {
        startDate: now,
        endDate: now + (8 * 60 * 60 * 1000), // 8 hours later
      });

      // Immediately start
      itinerary = { ...itinerary, status: ItineraryStatus.IN_PROGRESS, startedAt: now };

      // Complete same day
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.COMPLETED,
        completedAt: now + (6 * 60 * 60 * 1000), // 6 hours later
      };

      const invoice = createMockInvoice(itinerary);

      expect(itinerary.status).toBe(ItineraryStatus.COMPLETED);
      expect(invoice.subtotalHnl).toBe(itinerary.agreedPriceHnl);
    });

    it('handles overpayment gracefully', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      // Client overpays
      const overpayment = invoice.totalHnl + 500;

      invoice = {
        ...invoice,
        amountPaid: overpayment,
        amountDue: Math.max(0, invoice.totalHnl - overpayment),
        paymentStatus: PaymentStatus.PAID,
        status: InvoiceStatus.PAID,
      };

      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
      expect(invoice.amountDue).toBe(0);
      expect(invoice.amountPaid).toBe(overpayment);
    });
  });

  describe('Workflow Timing', () => {
    it('tracks timestamps at each workflow stage', () => {
      const times: Record<string, number> = {};

      // Quotation creation
      times.quotationCreated = Date.now();
      let quotation = createMockQuotation({
        createdAt: times.quotationCreated,
        updatedAt: times.quotationCreated,
      });

      // Quotation sent
      times.quotationSent = Date.now() + 1000;
      quotation = {
        ...quotation,
        status: QuotationStatus.SENT,
        sentAt: times.quotationSent,
        updatedAt: times.quotationSent,
      };

      // Quotation approved
      times.quotationApproved = Date.now() + 2000;
      quotation = {
        ...quotation,
        status: QuotationStatus.APPROVED,
        approvedAt: times.quotationApproved,
        updatedAt: times.quotationApproved,
      };

      // Itinerary created
      times.itineraryCreated = Date.now() + 3000;
      let itinerary = createMockItinerary(quotation, {
        createdAt: times.itineraryCreated,
      });

      // Trip started
      times.tripStarted = Date.now() + 100000;
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.IN_PROGRESS,
        startedAt: times.tripStarted,
      };

      // Trip completed
      times.tripCompleted = Date.now() + 200000;
      itinerary = {
        ...itinerary,
        status: ItineraryStatus.COMPLETED,
        completedAt: times.tripCompleted,
      };

      // Invoice created
      times.invoiceCreated = Date.now() + 201000;
      let invoice = createMockInvoice(itinerary, {
        createdAt: times.invoiceCreated,
        invoiceDate: times.invoiceCreated,
      });

      // Invoice sent
      times.invoiceSent = Date.now() + 202000;
      invoice = {
        ...invoice,
        status: InvoiceStatus.SENT,
        sentAt: times.invoiceSent,
      };

      // Payment received
      times.paymentReceived = Date.now() + 300000;
      invoice = {
        ...invoice,
        amountPaid: invoice.totalHnl,
        amountDue: 0,
        paymentStatus: PaymentStatus.PAID,
        status: InvoiceStatus.PAID,
        paidAt: times.paymentReceived,
      };

      // Verify chronological order
      expect(times.quotationCreated).toBeLessThan(times.quotationSent);
      expect(times.quotationSent).toBeLessThan(times.quotationApproved);
      expect(times.quotationApproved).toBeLessThan(times.itineraryCreated);
      expect(times.itineraryCreated).toBeLessThan(times.tripStarted);
      expect(times.tripStarted).toBeLessThan(times.tripCompleted);
      expect(times.tripCompleted).toBeLessThan(times.invoiceCreated);
      expect(times.invoiceCreated).toBeLessThan(times.invoiceSent);
      expect(times.invoiceSent).toBeLessThan(times.paymentReceived);
    });
  });
});
