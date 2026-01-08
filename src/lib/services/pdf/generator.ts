import puppeteer from 'puppeteer';
import type { QuotationPdfData, InvoicePdfData, ExpenseAdvancePdfData, ItineraryPdfData } from './templates';
import { generateQuotationHtml, generateInvoiceHtml, generateExpenseAdvanceHtml, generateItineraryHtml } from './templates';

export interface PdfOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

const defaultOptions: PdfOptions = {
  format: 'A4',
  landscape: false,
  margin: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in'
  }
};

export async function generatePdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  const opts = { ...defaultOptions, ...options };

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: opts.format,
      landscape: opts.landscape,
      margin: opts.margin,
      printBackground: true
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
  const html = generateQuotationHtml(data);
  return generatePdf(html);
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const html = generateInvoiceHtml(data);
  return generatePdf(html);
}

export async function generateExpenseAdvancePdf(data: ExpenseAdvancePdfData): Promise<Buffer> {
  const html = generateExpenseAdvanceHtml(data);
  return generatePdf(html);
}

export async function generateItineraryPdf(data: ItineraryPdfData): Promise<Buffer> {
  const html = generateItineraryHtml(data);
  return generatePdf(html);
}

export { generateQuotationHtml, generateInvoiceHtml, generateExpenseAdvanceHtml, generateItineraryHtml };
export type { QuotationPdfData, InvoicePdfData, ExpenseAdvancePdfData, ItineraryPdfData };
