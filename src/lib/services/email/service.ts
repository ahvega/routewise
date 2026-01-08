import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import type {
  QuotationEmailData,
  InvoiceEmailData,
  PaymentReminderEmailData
} from './templates';
import {
  generateQuotationEmail,
  generateInvoiceEmail,
  generatePaymentReminderEmail
} from './templates';

// Initialize Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Default from address - use RESEND_FROM_EMAIL env var or Resend's test domain for dev
const DEFAULT_FROM = env.RESEND_FROM_EMAIL || 'RouteWise <onboarding@resend.dev>';

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: options.from || DEFAULT_FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        contentType: att.contentType
      }))
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Email send error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email'
    };
  }
}

export async function sendQuotationEmail(
  to: string,
  data: QuotationEmailData,
  pdfBuffer?: Buffer
): Promise<SendEmailResult> {
  const { subject, html } = generateQuotationEmail(data);

  const attachments: EmailAttachment[] = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `cotizacion-${data.quotationNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  }

  return sendEmail({
    to,
    subject,
    html,
    attachments
  });
}

export async function sendInvoiceEmail(
  to: string,
  data: InvoiceEmailData,
  pdfBuffer?: Buffer
): Promise<SendEmailResult> {
  const { subject, html } = generateInvoiceEmail(data);

  const attachments: EmailAttachment[] = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `factura-${data.invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  }

  return sendEmail({
    to,
    subject,
    html,
    attachments
  });
}

export async function sendPaymentReminderEmail(
  to: string,
  data: PaymentReminderEmailData
): Promise<SendEmailResult> {
  const { subject, html } = generatePaymentReminderEmail(data);

  return sendEmail({
    to,
    subject,
    html
  });
}
