import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateExpenseAdvancePdf, type ExpenseAdvancePdfData } from '$lib/services/pdf';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: ExpenseAdvancePdfData = await request.json();

    // Validate required fields
    if (!data.advanceNumber || !data.clientName || !data.driverName) {
      throw error(400, 'Missing required expense advance data');
    }

    const pdfBuffer = await generateExpenseAdvancePdf(data);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="anticipo-${data.advanceNumber}.pdf"`,
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
