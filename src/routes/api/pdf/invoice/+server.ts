import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateInvoicePdf, type InvoicePdfData } from '$lib/services/pdf';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: InvoicePdfData = await request.json();

    // Validate required fields
    if (!data.invoiceNumber || !data.client?.name || !data.items?.length) {
      throw error(400, 'Missing required invoice data');
    }

    const pdfBuffer = await generateInvoicePdf(data);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${data.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    throw error(500, 'Failed to generate PDF');
  }
};
