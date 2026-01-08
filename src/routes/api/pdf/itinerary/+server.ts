import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateItineraryPdf, type ItineraryPdfData } from '$lib/services/pdf';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: ItineraryPdfData = await request.json();

    // Validate required fields
    if (!data.itineraryCode || !data.vehicles?.length || !data.days?.length) {
      throw error(400, 'Missing required itinerary data');
    }

    const pdfBuffer = await generateItineraryPdf(data);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="itinerario-${data.itineraryCode}.pdf"`,
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
