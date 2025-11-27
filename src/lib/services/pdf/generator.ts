import puppeteer from 'puppeteer';
import type { QuotationPdfData, InvoicePdfData } from './templates';
import { generateQuotationHtml, generateInvoiceHtml } from './templates';

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
    top: '20mm',
    right: '15mm',
    bottom: '20mm',
    left: '15mm'
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

export { generateQuotationHtml, generateInvoiceHtml };
export type { QuotationPdfData, InvoicePdfData };
