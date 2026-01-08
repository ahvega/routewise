import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  sendQuotationEmail,
  sendInvoiceEmail,
  sendPaymentReminderEmail,
  type SendEmailResult
} from '$lib/services/email';

export interface SendQuotationEmailRequest {
  type: 'quotation';
  to: string;
  data: {
    recipientName: string;
    quotationNumber: string;
    origin: string;
    destination: string;
    departureDate: string;
    totalPrice: string;
    validUntil: string;
    companyName: string;
    companyPhone?: string;
    companyEmail?: string;
  };
  pdfBase64?: string;
}

export interface SendInvoiceEmailRequest {
  type: 'invoice';
  to: string;
  data: {
    recipientName: string;
    invoiceNumber: string;
    totalAmount: string;
    dueDate: string;
    companyName: string;
    companyPhone?: string;
    companyEmail?: string;
    paymentInstructions?: string;
  };
  pdfBase64?: string;
}

export interface SendPaymentReminderEmailRequest {
  type: 'payment_reminder';
  to: string;
  data: {
    recipientName: string;
    invoiceNumber: string;
    amountDue: string;
    dueDate: string;
    daysOverdue: number;
    companyName: string;
    companyPhone?: string;
    companyEmail?: string;
  };
}

type EmailRequest = SendQuotationEmailRequest | SendInvoiceEmailRequest | SendPaymentReminderEmailRequest;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: EmailRequest = await request.json();

    if (!body.to || !body.type || !body.data) {
      throw error(400, 'Missing required fields: to, type, data');
    }

    let result: SendEmailResult;

    switch (body.type) {
      case 'quotation': {
        const req = body as SendQuotationEmailRequest;
        const pdfBuffer = req.pdfBase64 ? Buffer.from(req.pdfBase64, 'base64') : undefined;
        result = await sendQuotationEmail(req.to, req.data, pdfBuffer);
        break;
      }

      case 'invoice': {
        const req = body as SendInvoiceEmailRequest;
        const pdfBuffer = req.pdfBase64 ? Buffer.from(req.pdfBase64, 'base64') : undefined;
        result = await sendInvoiceEmail(req.to, req.data, pdfBuffer);
        break;
      }

      case 'payment_reminder': {
        const req = body as SendPaymentReminderEmailRequest;
        result = await sendPaymentReminderEmail(req.to, req.data);
        break;
      }

      default:
        throw error(400, `Invalid email type: ${(body as { type: string }).type}`);
    }

    if (!result.success) {
      throw error(500, result.error || 'Failed to send email');
    }

    return json({
      success: true,
      messageId: result.messageId
    });
  } catch (err) {
    console.error('Email send error:', err);
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    throw error(500, 'Failed to send email');
  }
};
