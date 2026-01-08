import { describe, it, expect } from 'vitest';
import {
  generateExpenseAdvanceHtml,
  generateItineraryHtml,
  type ExpenseAdvancePdfData,
  type ItineraryPdfData
} from '$lib/services/pdf/templates';

describe('PDF Templates', () => {
  describe('generateExpenseAdvanceHtml', () => {
    const baseExpenseAdvanceData: ExpenseAdvancePdfData = {
      advanceNumber: 'ANT-2024-001',
      clientName: 'Test Client',
      itineraryCode: '1603-Test Group x 40',
      route: 'SPS - Tegucigalpa - SPS',
      driverName: 'Juan Pérez',
      currency: 'HNL',
      totalAdvance: 15000,
      mode: 'advance',
      viaticos: [
        {
          date: 'lun.-01/ene.',
          location: 'Tegucigalpa',
          breakfast: 100,
          lunch: 150,
          dinner: 150,
          busOrHotel: 500,
          total: 900
        }
      ],
      gastosItinerario: [
        {
          date: 'lun.-01/ene.',
          location: 'SPS',
          concept: 'Combustible',
          quantity: 1,
          unitPrice: 5000,
          total: 5000
        }
      ],
      viaticosTotal: 900,
      gastosTotal: 5000,
      documentDate: '1 de enero de 2024',
      company: {
        name: 'LAT Tours & Travel'
      }
    };

    it('should generate valid HTML with required elements', () => {
      const html = generateExpenseAdvanceHtml(baseExpenseAdvanceData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="es">');
      expect(html).toContain('</html>');
    });

    it('should include the advance number', () => {
      const html = generateExpenseAdvanceHtml(baseExpenseAdvanceData);

      expect(html).toContain('ANT-2024-001');
    });

    it('should include client and driver information', () => {
      const html = generateExpenseAdvanceHtml(baseExpenseAdvanceData);

      expect(html).toContain('Test Client');
      expect(html).toContain('Juan Pérez');
      expect(html).toContain('SPS - Tegucigalpa - SPS');
    });

    it('should display viáticos section with daily allowances', () => {
      const html = generateExpenseAdvanceHtml(baseExpenseAdvanceData);

      expect(html).toContain('VIÁTICOS');
      expect(html).toContain('Tegucigalpa');
    });

    it('should display gastos itinerario section', () => {
      const html = generateExpenseAdvanceHtml(baseExpenseAdvanceData);

      expect(html).toContain('GASTOS ITINERARIO');
      expect(html).toContain('Combustible');
    });

    it('should display total advance amount', () => {
      const html = generateExpenseAdvanceHtml(baseExpenseAdvanceData);

      expect(html).toContain('15,000');
    });

    it('should include company name', () => {
      const html = generateExpenseAdvanceHtml(baseExpenseAdvanceData);

      expect(html).toContain('LAT Tours & Travel');
    });

    it('should handle settlement mode with liquidacion section', () => {
      const settlementData: ExpenseAdvancePdfData = {
        ...baseExpenseAdvanceData,
        mode: 'settlement',
        liquidacion: [
          {
            date: 'mar.-02/ene.',
            location: 'SPS',
            concept: 'Combustible adicional',
            currency: 'HNL',
            originalValue: 2000,
            totalInCurrency: 2000
          }
        ],
        liquidacionTotal: 2000,
        balanceCompanyFavor: 1000
      };

      const html = generateExpenseAdvanceHtml(settlementData);

      expect(html).toContain('LIQUIDACIÓN');
      expect(html).toContain('Combustible adicional');
    });

    it('should handle USD currency with exchange rate', () => {
      const usdData: ExpenseAdvancePdfData = {
        ...baseExpenseAdvanceData,
        currency: 'USD',
        totalAdvance: 500,
        exchangeRate: 24.75
      };

      const html = generateExpenseAdvanceHtml(usdData);

      // Check for USD currency format - the template uses Intl.NumberFormat
      expect(html).toContain('$');
      expect(html).toContain('500');
    });

    it('should handle empty viáticos array', () => {
      const noViaticosData: ExpenseAdvancePdfData = {
        ...baseExpenseAdvanceData,
        viaticos: [],
        viaticosTotal: 0
      };

      const html = generateExpenseAdvanceHtml(noViaticosData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('VIÁTICOS');
    });

    it('should handle empty gastos array', () => {
      const noGastosData: ExpenseAdvancePdfData = {
        ...baseExpenseAdvanceData,
        gastosItinerario: [],
        gastosTotal: 0
      };

      const html = generateExpenseAdvanceHtml(noGastosData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('GASTOS ITINERARIO');
    });
  });

  describe('generateItineraryHtml', () => {
    const baseItineraryData: ItineraryPdfData = {
      itineraryCode: 'C254-1607-ALTIA-Henry Gomez x 40 SAPMI 2C1D',
      shortDescription: 'Traslados en San Pedro Sula',
      mainDate: '27 de julio de 2024',
      clientName: 'ALTIA Group',
      groupLeaderName: 'Henry Gomez',
      groupLeaderPhone: '+504 9999-9999',
      groupSize: 40,
      vehicles: [
        {
          vehicleNumber: 1,
          vehicleName: 'Coaster C-02',
          licensePlate: 'PCS 6667',
          driverName: 'Carlos Mendez',
          driverPhone: '+504 8888-8888'
        }
      ],
      days: [
        {
          dayNumber: 1,
          date: 'miércoles 27 de julio de 2024',
          location: 'San Pedro Sula',
          activities: [
            {
              time: '7:00am',
              description: 'Recogida en hotel',
              location: 'Hotel Copantl'
            },
            {
              time: '9:00am',
              description: 'Inicio de tour'
            }
          ]
        }
      ],
      company: {
        name: 'LAT Tours & Travel',
        phone: '+504 2550-1234',
        email: 'info@lattours.com'
      }
    };

    it('should generate valid HTML with required elements', () => {
      const html = generateItineraryHtml(baseItineraryData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="es">');
      expect(html).toContain('</html>');
    });

    it('should include itinerary code', () => {
      const html = generateItineraryHtml(baseItineraryData);

      expect(html).toContain('C254-1607-ALTIA-Henry Gomez x 40 SAPMI 2C1D');
    });

    it('should include group leader information', () => {
      const html = generateItineraryHtml(baseItineraryData);

      // Group leader name is shown, client name may not appear in driver-facing itinerary
      expect(html).toContain('Henry Gomez');
    });

    it('should display vehicle assignments', () => {
      const html = generateItineraryHtml(baseItineraryData);

      expect(html).toContain('Coaster C-02');
      expect(html).toContain('PCS 6667');
      expect(html).toContain('Carlos Mendez');
    });

    it('should display day schedule with activities', () => {
      const html = generateItineraryHtml(baseItineraryData);

      expect(html).toContain('miércoles 27 de julio de 2024');
      expect(html).toContain('7:00am');
      expect(html).toContain('Recogida en hotel');
      // Location is displayed separately in the activity row
    });

    it('should include company contact information in footer', () => {
      const html = generateItineraryHtml(baseItineraryData);

      // Company info appears in footer
      expect(html).toContain('+504 2550-1234');
      expect(html).toContain('info@lattours.com');
    });

    it('should handle multiple vehicles', () => {
      const multiVehicleData: ItineraryPdfData = {
        ...baseItineraryData,
        vehicles: [
          {
            vehicleNumber: 1,
            vehicleName: 'Coaster C-02',
            licensePlate: 'PCS 6667',
            driverName: 'Carlos Mendez',
            driverPhone: '+504 8888-8888'
          },
          {
            vehicleNumber: 2,
            vehicleName: 'Coaster C-03',
            licensePlate: 'PCS 7778',
            driverName: 'Pedro Lopez',
            driverPhone: '+504 7777-7777'
          }
        ]
      };

      const html = generateItineraryHtml(multiVehicleData);

      expect(html).toContain('Coaster C-02');
      expect(html).toContain('Coaster C-03');
      expect(html).toContain('Carlos Mendez');
      expect(html).toContain('Pedro Lopez');
    });

    it('should handle multiple days', () => {
      const multiDayData: ItineraryPdfData = {
        ...baseItineraryData,
        days: [
          {
            dayNumber: 1,
            date: 'miércoles 27 de julio de 2024',
            location: 'San Pedro Sula',
            activities: [
              { time: '7:00am', description: 'Salida' }
            ]
          },
          {
            dayNumber: 2,
            date: 'jueves 28 de julio de 2024',
            location: 'Tegucigalpa',
            activities: [
              { time: '8:00am', description: 'Visita museo' }
            ]
          }
        ]
      };

      const html = generateItineraryHtml(multiDayData);

      expect(html).toContain('miércoles 27 de julio de 2024');
      expect(html).toContain('jueves 28 de julio de 2024');
      expect(html).toContain('Visita museo');
    });

    it('should handle notes when provided', () => {
      const dataWithNotes: ItineraryPdfData = {
        ...baseItineraryData,
        notes: 'Grupo requiere atención especial'
      };

      const html = generateItineraryHtml(dataWithNotes);

      expect(html).toContain('Grupo requiere atención especial');
    });
  });
});
