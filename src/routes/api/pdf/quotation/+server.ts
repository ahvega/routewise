import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateQuotationPdf, type QuotationPdfData } from '$lib/services/pdf';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: QuotationPdfData = await request.json();

    // Validate required fields
    if (!data.quotationNumber || !data.client?.name || !data.trip?.origin) {
      throw error(400, 'Missing required quotation data');
    }

    const pdfBuffer = await generateQuotationPdf(data);

    // Use file-safe name for filename, fallback to quotation number
    const filename = data.quotationFileSafeName || data.quotationNumber;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cotizacion-${filename}.pdf"`,
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
