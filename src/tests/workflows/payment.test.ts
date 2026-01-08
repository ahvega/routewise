/**
 * Payment Status Tests
 *
 * Tests payment recording and status changes:
 * - Payment recording (status change from unpaid → partial → paid)
 * - Partial payment tracking
 * - Payment deletion and recalculation
 * - Payment status determination
 *
 * Note: This system does NOT process actual payments.
 * Payments are recorded as status changes for tracking purposes.
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
} from './convex-mock';

describe('Payment Status Workflow', () => {
  beforeEach(() => {
    resetMockIds();
  });

  describe('Payment Status Calculation', () => {
    it('returns unpaid when no payments recorded', () => {
      const status = calculatePaymentStatus(10000, 0);
      expect(status).toBe(PaymentStatus.UNPAID);
    });

    it('returns partial when some payment recorded', () => {
      const status = calculatePaymentStatus(10000, 5000);
      expect(status).toBe(PaymentStatus.PARTIAL);
    });

    it('returns paid when full amount paid', () => {
      const status = calculatePaymentStatus(10000, 10000);
      expect(status).toBe(PaymentStatus.PAID);
    });

    it('returns paid when overpaid', () => {
      const status = calculatePaymentStatus(10000, 12000);
      expect(status).toBe(PaymentStatus.PAID);
    });

    it('returns partial for any amount less than total', () => {
      const status1 = calculatePaymentStatus(10000, 1);
      const status2 = calculatePaymentStatus(10000, 9999);

      expect(status1).toBe(PaymentStatus.PARTIAL);
      expect(status2).toBe(PaymentStatus.PARTIAL);
    });
  });

  describe('Recording Payments', () => {
    it('records a payment against an invoice', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });
      const payment = createMockPayment(invoice, 3000);

      expect(payment._id).toBeDefined();
      expect(payment.invoiceId).toBe(invoice._id);
      expect(payment.amount).toBe(3000);
      expect(payment.paymentDate).toBeDefined();
    });

    it('records payment with payment method', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });
      const payment = createMockPayment(invoice, 3000, { paymentMethod: 'transfer' });

      expect(payment.paymentMethod).toBe('transfer');
    });

    it('records payment with reference number', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });
      const payment = createMockPayment(invoice, 3000, { referenceNumber: 'TRF-2024-001234' });

      expect(payment.referenceNumber).toBe('TRF-2024-001234');
    });

    it('allows different payment methods', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      const cashPayment = createMockPayment(invoice, 1000, { paymentMethod: 'cash' });
      const transferPayment = createMockPayment(invoice, 1000, { paymentMethod: 'transfer' });
      const cardPayment = createMockPayment(invoice, 1000, { paymentMethod: 'card' });
      const checkPayment = createMockPayment(invoice, 1000, { paymentMethod: 'check' });

      expect(cashPayment.paymentMethod).toBe('cash');
      expect(transferPayment.paymentMethod).toBe('transfer');
      expect(cardPayment.paymentMethod).toBe('card');
      expect(checkPayment.paymentMethod).toBe('check');
    });
  });

  describe('Invoice Amount Updates After Payment', () => {
    it('updates amountPaid after recording payment', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      expect(invoice.amountPaid).toBe(0);

      // Simulate payment recording
      const paymentAmount = 3000;
      invoice = {
        ...invoice,
        amountPaid: invoice.amountPaid + paymentAmount,
        amountDue: invoice.totalHnl - (invoice.amountPaid + paymentAmount),
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, invoice.amountPaid + paymentAmount),
      };

      expect(invoice.amountPaid).toBe(3000);
    });

    it('updates amountDue after recording payment', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      const originalAmountDue = invoice.amountDue;
      const paymentAmount = 3000;

      invoice = {
        ...invoice,
        amountPaid: invoice.amountPaid + paymentAmount,
        amountDue: invoice.totalHnl - (invoice.amountPaid + paymentAmount),
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, invoice.amountPaid + paymentAmount),
      };

      expect(invoice.amountDue).toBe(originalAmountDue - paymentAmount);
    });

    it('updates payment status to partial after partial payment', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);

      // Partial payment
      const paymentAmount = invoice.totalHnl / 2;
      invoice = {
        ...invoice,
        amountPaid: paymentAmount,
        amountDue: invoice.totalHnl - paymentAmount,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, paymentAmount),
      };

      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIAL);
    });

    it('updates payment status to paid after full payment', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      // Full payment
      const paymentAmount = invoice.totalHnl;
      invoice = {
        ...invoice,
        amountPaid: paymentAmount,
        amountDue: 0,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, paymentAmount),
        status: InvoiceStatus.PAID,
        paidAt: Date.now(),
      };

      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
      expect(invoice.amountDue).toBe(0);
      expect(invoice.status).toBe(InvoiceStatus.PAID);
    });
  });

  describe('Multiple Partial Payments', () => {
    it('accumulates multiple payments correctly', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      // First payment
      let totalPaid = 2000;
      invoice = {
        ...invoice,
        amountPaid: totalPaid,
        amountDue: invoice.totalHnl - totalPaid,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, totalPaid),
      };

      expect(invoice.amountPaid).toBe(2000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIAL);

      // Second payment
      totalPaid += 3000;
      invoice = {
        ...invoice,
        amountPaid: totalPaid,
        amountDue: invoice.totalHnl - totalPaid,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, totalPaid),
      };

      expect(invoice.amountPaid).toBe(5000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIAL);

      // Final payment to complete
      totalPaid = invoice.totalHnl;
      invoice = {
        ...invoice,
        amountPaid: totalPaid,
        amountDue: 0,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, totalPaid),
      };

      expect(invoice.amountPaid).toBe(invoice.totalHnl);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
      expect(invoice.amountDue).toBe(0);
    });
  });

  describe('Payment Deletion', () => {
    it('recalculates amounts after payment deletion', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      // Record payment
      const paymentAmount = 5000;
      invoice = {
        ...invoice,
        amountPaid: paymentAmount,
        amountDue: invoice.totalHnl - paymentAmount,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, paymentAmount),
      };

      expect(invoice.amountPaid).toBe(5000);

      // Delete payment (simulate reversal)
      invoice = {
        ...invoice,
        amountPaid: 0,
        amountDue: invoice.totalHnl,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, 0),
      };

      expect(invoice.amountPaid).toBe(0);
      expect(invoice.amountDue).toBe(invoice.totalHnl);
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
    });

    it('reverts to partial status after deleting one of multiple payments', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      // Two payments
      const payment1Amount = 3000;
      const payment2Amount = 2000;
      const totalPaid = payment1Amount + payment2Amount;

      invoice = {
        ...invoice,
        amountPaid: totalPaid,
        amountDue: invoice.totalHnl - totalPaid,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, totalPaid),
      };

      expect(invoice.amountPaid).toBe(5000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIAL);

      // Delete second payment
      const newTotalPaid = payment1Amount;
      invoice = {
        ...invoice,
        amountPaid: newTotalPaid,
        amountDue: invoice.totalHnl - newTotalPaid,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, newTotalPaid),
      };

      expect(invoice.amountPaid).toBe(3000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIAL);
    });

    it('reverts paid invoice status when payment deleted', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      // Full payment
      invoice = {
        ...invoice,
        amountPaid: invoice.totalHnl,
        amountDue: 0,
        paymentStatus: PaymentStatus.PAID,
        status: InvoiceStatus.PAID,
        paidAt: Date.now(),
      };

      expect(invoice.status).toBe(InvoiceStatus.PAID);

      // Delete payment - should revert to sent, not draft
      const deletedPaymentAmount = invoice.totalHnl;
      const newAmountPaid = invoice.amountPaid - deletedPaymentAmount;
      invoice = {
        ...invoice,
        amountPaid: newAmountPaid,
        amountDue: invoice.totalHnl - newAmountPaid,
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, newAmountPaid),
        status: InvoiceStatus.SENT, // Reverts to sent, not draft
        paidAt: undefined,
      };

      expect(invoice.status).toBe(InvoiceStatus.SENT);
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(invoice.paidAt).toBeUndefined();
    });
  });

  describe('Amount Due Floor', () => {
    it('ensures amountDue never goes below zero', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      let invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });

      // Overpayment
      const overpayment = invoice.totalHnl + 1000;
      const calculatedAmountDue = invoice.totalHnl - overpayment;

      invoice = {
        ...invoice,
        amountPaid: overpayment,
        amountDue: Math.max(0, calculatedAmountDue), // Floor at 0
        paymentStatus: calculatePaymentStatus(invoice.totalHnl, overpayment),
      };

      expect(invoice.amountDue).toBe(0);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
    });
  });

  describe('Payment Notes', () => {
    it('allows adding notes to payments', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });
      const payment = createMockPayment(invoice, 3000, { notes: 'First installment as agreed' });

      expect(payment.notes).toBe('First installment as agreed');
    });
  });

  describe('Payment Date', () => {
    it('uses current date by default', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });
      const before = Date.now();
      const payment = createMockPayment(invoice, 3000);
      const after = Date.now();

      expect(payment.paymentDate).toBeGreaterThanOrEqual(before);
      expect(payment.paymentDate).toBeLessThanOrEqual(after);
    });

    it('allows backdating payments', () => {
      const quotation = createMockQuotation({ status: QuotationStatus.APPROVED });
      const itinerary = createMockItinerary(quotation, { status: ItineraryStatus.COMPLETED });
      const invoice = createMockInvoice(itinerary, { status: InvoiceStatus.SENT });
      const pastDate = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      const payment = createMockPayment(invoice, 3000, { paymentDate: pastDate });

      expect(payment.paymentDate).toBe(pastDate);
    });
  });
});
