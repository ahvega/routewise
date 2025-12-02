// PDF Templates for quotations and invoices

export interface ServiceLine {
  id: string;
  description: string;
  route: string;
  days: number;
  distance: number;
  dates: string;
  vehicleName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuotationPdfData {
  quotationNumber: string;
  quotationSequence?: number;
  date: string;
  validUntil: string;
  // New standardized fields
  groupLeaderName?: string;
  salesAgentInitials?: string;
  paymentConditions?: string;
  purchaseOrderNumber?: string;
  client: {
    name: string;
    code?: string; // 4-letter code like HOTR
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    taxId?: string; // RTN
    discountPercentage?: number;
  };
  trip: {
    origin: string;
    destination: string;
    departureDate?: string;
    returnDate?: string;
    groupSize: number;
    estimatedDays: number;
    totalDistance: number;
    totalTime: number;
  };
  vehicle: {
    name: string;
    type: string;
    capacity: number;
  };
  // Multi-vehicle support
  serviceLines?: ServiceLine[];
  costs?: {
    fuelCost: number;
    driverMealsCost: number;
    driverLodgingCost: number;
    driverIncentiveCost: number;
    vehicleDistanceCost: number;
    vehicleDailyCost: number;
    tollCost: number;
    totalCost: number;
  };
  pricing: {
    subtotalHnl: number;
    discountPercentage?: number;
    discountAmountHnl?: number;
    taxPercentage?: number;
    taxAmountHnl?: number;
    salePriceHnl: number;
    salePriceUsd: number;
    markup: number;
  };
  company: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    logo?: string;
    websiteUrl?: string;
    fiscalDocumentName?: string; // RTN, NIT, etc.
    fiscalDocumentNumber?: string;
  };
  termsAndConditions?: {
    validityDays?: number;
    prepaymentDays?: number;
    cancellationMinHours?: number;
    cancellationPenaltyPercentage?: number;
  };
  notes?: string;
}

export interface InvoiceServiceLine {
  description: string;
  route: string;
  days: number;
  distance: number;
  dates: string;
  vehicleName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceSequence?: number;
  date: string;
  dueDate: string;
  // New standardized fields
  itineraryCode?: string; // e.g., "1704-Ileana Castillo SAPANT CHP3D"
  salesAgentInitials?: string;
  paymentConditions?: string;
  purchaseOrderNumber?: string;
  client: {
    name: string;
    code?: string;
    rtn?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  // Service lines (transport services)
  serviceLines?: InvoiceServiceLine[];
  // Legacy items support
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  totalUsd: number;
  amountPaid: number;
  amountDue: number;
  company: {
    name: string;
    rtn?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    logo?: string;
    websiteUrl?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  notes?: string;
  paymentInstructions?: string;
}

// Itinerary PDF interfaces - Operational document for drivers
export interface ItineraryVehicleAssignment {
  vehicleNumber: number; // 1, 2, 3...
  vehicleName: string; // "Coaster C-02"
  licensePlate: string; // "PCS 6667"
  driverName: string;
  driverId?: string; // National ID
  driverPhone: string;
  role?: string; // "Conductor", "Guía", etc.
}

export interface ItineraryDaySchedule {
  dayNumber: number;
  date: string; // Full date: "miércoles 27 de julio de 2016"
  location: string; // City/region: "San Pedro Sula"
  activities: ItineraryActivity[];
}

export interface ItineraryActivity {
  time: string; // "7:00pm", "10:30am"
  description: string; // Activity description
  location?: string; // Specific location (bolded in PDF)
  isHighlighted?: boolean; // For important times
}

export interface ItineraryPdfData {
  // Itinerary identification
  itineraryCode: string; // e.g., "C254-1607-ALTIA-Henry Gomez x 40 SAPMI 2C1D"
  shortDescription: string; // e.g., "Traslados en San Pedro Sula"
  mainDate: string; // Primary date shown in header

  // Client/Group info
  clientName: string;
  clientCode?: string;
  groupLeaderName: string;
  groupLeaderPhone?: string;
  groupSize: number;

  // Vehicle assignments
  vehicles: ItineraryVehicleAssignment[];
  vehicleSummary?: string; // e.g., "Bus Coaster 02, 03" for header

  // Schedule
  days: ItineraryDaySchedule[];

  // Company info
  company: {
    name: string;
    phone?: string;
    email?: string;
    websiteUrl?: string;
    logo?: string;
  };

  // Additional notes
  notes?: string;
  internalNotes?: string; // Not shown to client
}

function formatCurrency(value: number, currency: 'HNL' | 'USD' = 'HNL'): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateInput: string | number): string {
  // Handle both timestamps (numbers) and formatted strings
  if (typeof dateInput === 'number' || !isNaN(Number(dateInput))) {
    // It's a timestamp or numeric string
    return new Date(Number(dateInput)).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Try parsing as ISO date string first
  const date = new Date(dateInput);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // If already formatted, return as-is
  return dateInput;
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap');
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    background: white;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0;
  }
  /* Professional Quotation Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #1e40af;
  }
  .logo-section {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .logo-section img {
    max-height: 60px;
    max-width: 150px;
  }
  .company-info {
    font-size: 10px;
    color: #555;
  }
  .company-info .company-name {
    font-size: 18px;
    font-weight: bold;
    color: #1e40af;
    margin-bottom: 3px;
  }
  .document-title {
    text-align: right;
  }
  .document-title h1 {
    font-size: 28px;
    font-weight: bold;
    color: #1e40af;
    letter-spacing: 2px;
  }
  /* Client & Info Grid */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #ddd;
    margin-bottom: 15px;
  }
  .info-left {
    padding: 12px;
    border-right: 1px solid #ddd;
  }
  .info-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  .info-cell {
    padding: 8px 10px;
    border-bottom: 1px solid #ddd;
    font-size: 10px;
  }
  .info-cell:nth-child(odd) {
    border-right: 1px solid #ddd;
  }
  .info-cell:nth-child(n+3) {
    border-bottom: none;
  }
  .info-cell label {
    display: block;
    font-size: 9px;
    color: #444;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .info-cell span {
    font-family: 'Fira Code', monospace;
    font-weight: 500;
    color: #000;
  }
  .client-name {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 5px;
    color: #000;
  }
  .client-details {
    font-size: 10px;
    color: #333;
  }
  /* Itinerary Code - Inline version below client name */
  .itinerary-code-inline {
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    font-weight: 600;
    color: #1e40af;
    margin: 4px 0;
  }
  /* Itinerary Code - Standalone block (legacy) */
  .itinerary-code {
    text-align: center;
    background: #f0f4f8;
    padding: 8px;
    margin-bottom: 15px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    font-weight: 600;
    color: #1e40af;
    border: 1px solid #ddd;
  }
  /* Service Lines Table */
  .services-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: 10px;
  }
  .services-table th {
    background: #1e40af;
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
  }
  .services-table th.text-right {
    text-align: right;
  }
  .services-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #ddd;
    vertical-align: top;
  }
  .services-table td.text-right {
    text-align: right;
    font-family: 'Fira Code', monospace;
    color: #000;
  }
  .service-description {
    font-weight: 500;
    color: #000;
  }
  .service-details {
    font-size: 9px;
    color: #333;
    margin-top: 3px;
  }
  .service-details div {
    margin-left: 10px;
  }
  /* Totals Section */
  .totals-wrapper {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 15px;
  }
  .notes-box {
    flex: 1;
    border: 1px solid #ddd;
    padding: 10px;
    font-size: 10px;
    min-height: 80px;
  }
  .notes-box h4 {
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 5px;
    color: #666;
    text-transform: uppercase;
  }
  .totals-box {
    width: 250px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid #ddd;
    font-size: 10px;
  }
  .totals-row span:last-child {
    font-family: 'Fira Code', monospace;
    color: #000;
  }
  .totals-row.subtotal {
    background: #f9fafb;
  }
  .totals-row.discount {
    color: #22c55e;
  }
  .totals-row.tax {
    color: #666;
  }
  .totals-row.total {
    background: #1e40af;
    color: white;
    font-size: 14px;
    font-weight: bold;
    border: none;
    padding: 10px;
  }
  .totals-row.total span:last-child {
    color: white !important;
  }
  .totals-row.usd {
    font-size: 9px;
    color: #666;
    border-bottom: none;
  }
  /* Footer */
  .footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 2px solid #1e40af;
    text-align: center;
    font-size: 9px;
    color: #666;
  }
  .footer a {
    color: #1e40af;
    text-decoration: none;
  }
  /* Legacy styles for backwards compatibility */
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
  }
  .client-info {
    background: #f9fafb;
    padding: 12px;
    border-radius: 6px;
  }
  .client-info h3 {
    font-size: 14px;
    margin-bottom: 4px;
  }
  .client-info p {
    color: #666;
    font-size: 10px;
  }
  .trip-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .detail-item {
    background: #f9fafb;
    padding: 10px;
    border-radius: 4px;
  }
  .detail-item label {
    display: block;
    font-size: 9px;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .detail-item span {
    font-size: 12px;
    font-weight: 500;
  }
  .route-display {
    background: #1e40af;
    color: white;
    padding: 15px;
    border-radius: 6px;
    text-align: center;
    margin-bottom: 15px;
  }
  .route-display .origin,
  .route-display .destination {
    font-size: 16px;
    font-weight: 600;
  }
  .route-display .arrow {
    font-size: 20px;
    margin: 0 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  th, td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  th {
    background: #f9fafb;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    color: #666;
  }
  .text-right { text-align: right; }
  .totals {
    margin-top: 15px;
    margin-left: auto;
    width: 280px;
  }
  .validity {
    background: #dcfce7;
    border: 1px solid #22c55e;
    color: #166534;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 10px;
    display: inline-block;
  }
  .notes {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    padding: 12px;
    border-radius: 6px;
    font-size: 10px;
  }
  .notes h4 {
    color: #92400e;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 15px;
    font-size: 10px;
    font-weight: 600;
  }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-unpaid { background: #fef2f2; color: #dc2626; }
  .status-partial { background: #fffbeb; color: #d97706; }
`;

// Convert number to Spanish words (for invoice totals)
function numberToWords(num: number): string {
  const units = ['', 'Un', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];
  const teens = ['Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciseis', 'Diecisiete', 'Dieciocho', 'Diecinueve'];
  const tens = ['', '', 'Veinte', 'Treinta', 'Cuarenta', 'Cincuenta', 'Sesenta', 'Setenta', 'Ochenta', 'Noventa'];
  const hundreds = ['', 'Ciento', 'Doscientos', 'Trescientos', 'Cuatrocientos', 'Quinientos', 'Seiscientos', 'Setecientos', 'Ochocientos', 'Novecientos'];

  if (num === 0) return 'Cero';
  if (num === 100) return 'Cien';

  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'Cien';

    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) result += hundreds[h] + ' ';

    if (remainder > 0) {
      if (remainder < 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else if (remainder < 30 && remainder > 20) {
        result += 'Veinti' + units[remainder - 20].toLowerCase();
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        result += tens[t];
        if (u > 0) result += ' y ' + units[u];
      }
    }
    return result.trim();
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let words = '';

  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000);
    if (millions === 1) {
      words += 'Un Millón ';
    } else {
      words += convertHundreds(millions) + ' Millones ';
    }
  }

  const afterMillions = intPart % 1000000;
  if (afterMillions >= 1000) {
    const thousands = Math.floor(afterMillions / 1000);
    if (thousands === 1) {
      words += 'Mil ';
    } else {
      words += convertHundreds(thousands) + ' Mil ';
    }
  }

  const afterThousands = afterMillions % 1000;
  if (afterThousands > 0) {
    words += convertHundreds(afterThousands);
  }

  words = words.trim();
  if (!words) words = 'Cero';

  return `${words} Lempiras con ${decPart.toString().padStart(2, '0')}/100`;
}

// Format amount in words with decorative arrows
function formatAmountInWords(amount: number): string {
  const words = numberToWords(amount);
  return `» »»»»»»${words}««««««««`;
}

// Helper to format short date (for table display)
function formatShortDate(dateInput: string | number): string {
  if (!dateInput) return '';
  const date = new Date(typeof dateInput === 'number' ? dateInput : Number(dateInput) || Date.parse(dateInput));
  if (isNaN(date.getTime())) return String(dateInput);
  const day = date.getDate();
  const month = date.toLocaleDateString('es', { month: 'short' }).toLowerCase();
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

// Generate itinerary code: QuotationNumber-ClientCode-GroupLeader x Pax
function generateItineraryCode(data: QuotationPdfData): string {
  // Get quotation number (without prefix if present)
  const quotationNum = data.quotationNumber.replace(/^[A-Z]-?/i, '');

  // Get client 4-letter acronym code
  const clientCode = data.client.code ||
    data.client.name.split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 4)
      .toUpperCase();

  // Get group leader name or first name from client
  const leaderName = data.groupLeaderName || data.client.name.split(' ')[0];

  return `${quotationNum}-${clientCode}-${leaderName} x ${data.trip.groupSize}`;
}

// Generate service line description for single-vehicle quotations
function generateServiceLineHtml(data: QuotationPdfData): string {
  const description = `Servicio de Transporte: ${data.trip.estimatedDays} Días | ${data.trip.totalDistance.toLocaleString()} Kms`;
  const route = `${data.trip.origin} - ${data.trip.destination}${data.trip.returnDate ? ` - ${data.trip.origin}` : ''}`;
  const dates = data.trip.departureDate
    ? (data.trip.returnDate
      ? `${formatShortDate(data.trip.departureDate)} - ${formatShortDate(data.trip.returnDate)}`
      : formatShortDate(data.trip.departureDate))
    : '';
  const vehicle = `01 ${data.vehicle.name} x ${data.vehicle.capacity}`;

  return `
    <tr>
      <td>
        <div class="service-description">${description}</div>
        <div class="service-details">
          <div>- Ruta: ${route}</div>
          ${dates ? `<div>- Días: ${String(data.trip.estimatedDays).padStart(2, '0')}: ${dates}</div>` : ''}
          <div>- Vehículo: ${vehicle}</div>
        </div>
      </td>
      <td class="text-right">1</td>
      <td class="text-right">${formatCurrency(data.pricing.subtotalHnl, 'HNL')}</td>
      <td class="text-right">${formatCurrency(data.pricing.subtotalHnl, 'HNL')}</td>
    </tr>
  `;
}

// Generate multi-vehicle service lines
function generateMultiServiceLinesHtml(serviceLines: ServiceLine[]): string {
  return serviceLines.map(line => `
    <tr>
      <td>
        <div class="service-description">${line.description}</div>
        <div class="service-details">
          <div>- Ruta: ${line.route}</div>
          ${line.dates ? `<div>- Días: ${String(line.days).padStart(2, '0')}: ${line.dates}</div>` : ''}
          <div>- Vehículo: ${line.vehicleName}</div>
        </div>
      </td>
      <td class="text-right">${line.quantity}</td>
      <td class="text-right">${formatCurrency(line.unitPrice, 'HNL')}</td>
      <td class="text-right">${formatCurrency(line.totalPrice, 'HNL')}</td>
    </tr>
  `).join('');
}

export function generateQuotationHtml(data: QuotationPdfData): string {
  // Payment conditions display
  const paymentLabel = data.paymentConditions === 'contado' ? 'Contado'
    : data.paymentConditions?.replace('credito_', 'Crédito ').replace('_', ' ') + ' días' || 'Contado';

  // Tax display (Honduras ISV)
  const taxPercentage = data.pricing.taxPercentage ?? 0;
  const taxAmount = data.pricing.taxAmountHnl ?? 0;

  // Itinerary code
  const itineraryCode = generateItineraryCode(data);

  // Use full quotation number for display
  const quotationDisplay = data.quotationNumber;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${data.quotationNumber}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <!-- Header with Logo -->
    <div class="header">
      <div class="logo-section">
        ${data.company.logo ? `<img src="${data.company.logo}" alt="Logo" />` : ''}
        <div class="company-info">
          <div class="company-name">${data.company.name}</div>
          ${data.company.address ? `<div>${data.company.address}</div>` : ''}
          ${data.company.city ? `<div>${data.company.city}</div>` : ''}
          ${data.company.phone ? `<div>Tel: ${data.company.phone}</div>` : ''}
          ${data.company.websiteUrl ? `<div>${data.company.websiteUrl}</div>` : ''}
          ${data.company.email ? `<div>${data.company.email}</div>` : ''}
        </div>
      </div>
      <div class="document-title">
        <h1>COTIZACIÓN</h1>
      </div>
    </div>

    <!-- Client & Document Info Grid -->
    <div class="info-grid">
      <div class="info-left">
        <div style="font-size: 10px; color: #444; text-transform: uppercase; margin-bottom: 5px;">Cliente</div>
        <div class="client-name">${data.client.name}</div>
        <div class="itinerary-code-inline">${itineraryCode}</div>
        <div class="client-details">
          ${data.client.city ? `${data.client.city}` : ''}${data.client.city && data.client.country ? ', ' : ''}${data.client.country || ''}
        </div>
      </div>
      <div class="info-right">
        <div class="info-cell">
          <label>Condiciones</label>
          <span>${paymentLabel}</span>
        </div>
        <div class="info-cell">
          <label>Fecha</label>
          <span>${formatShortDate(data.date)}</span>
        </div>
        <div class="info-cell">
          <label>Cotización #</label>
          <span>${quotationDisplay}</span>
        </div>
        <div class="info-cell">
          <label>${data.company.fiscalDocumentName || 'RTN'}</label>
          <span>${data.client.taxId || 'Consum. Final'}</span>
        </div>
        <div class="info-cell">
          <label>P.O. #</label>
          <span>${data.purchaseOrderNumber || ''}</span>
        </div>
        <div class="info-cell">
          <label>Por</label>
          <span>${data.salesAgentInitials || ''}</span>
        </div>
      </div>
    </div>

    <!-- Service Lines Table -->
    <table class="services-table">
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="text-right" style="width: 70px;">Cantidad</th>
          <th class="text-right" style="width: 100px;">Precio</th>
          <th class="text-right" style="width: 100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.serviceLines && data.serviceLines.length > 0
          ? generateMultiServiceLinesHtml(data.serviceLines)
          : generateServiceLineHtml(data)
        }
      </tbody>
    </table>

    <!-- Notes & Totals -->
    <div class="totals-wrapper">
      <div class="notes-box">
        <h4>Observaciones</h4>
        <p>${data.notes || ''}</p>
      </div>
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span>Subtotal</span>
          <span>${formatCurrency(data.pricing.subtotalHnl, 'HNL')}</span>
        </div>
        ${data.pricing.discountPercentage && data.pricing.discountPercentage > 0 ? `
        <div class="totals-row discount">
          <span>Descuento (${data.pricing.discountPercentage}%)</span>
          <span>-${formatCurrency(data.pricing.discountAmountHnl || 0, 'HNL')}</span>
        </div>
        ` : ''}
        <div class="totals-row tax">
          <span>${taxPercentage > 0 ? `ISV ${taxPercentage}%` : 'Exento de ISV 0.00%'}</span>
          <span>${formatCurrency(taxAmount, 'HNL')}</span>
        </div>
        <div class="totals-row total">
          <span>Total</span>
          <span>${formatCurrency(data.pricing.salePriceHnl, 'HNL')}</span>
        </div>
        <div class="totals-row usd">
          <span>Equivalente USD</span>
          <span>${formatCurrency(data.pricing.salePriceUsd, 'USD')}</span>
        </div>
      </div>
    </div>

    <!-- Validity Notice -->
    <div class="section" style="text-align: center; margin-top: 20px;">
      <div class="validity">
        Cotización válida hasta: <strong>${formatDate(data.validUntil)}</strong>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      ${data.company.websiteUrl ? `<a href="${data.company.websiteUrl}">${data.company.websiteUrl}</a> | ` : ''}
      ${data.company.email || ''} | ${data.company.phone || ''}
      <br>
      <small>Gracias por su preferencia</small>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate invoice service line HTML (similar to quotation format)
function generateInvoiceServiceLineHtml(line: InvoiceServiceLine): string {
  const description = `Servicio de Transporte: ${line.days} Días // ${line.distance.toLocaleString()} Kms`;
  return `
    <tr>
      <td>
        <div class="service-description">${description}</div>
        <div class="service-details">
          <div>- Ruta: ${line.route}</div>
          ${line.dates ? `<div>- Fechas: ${line.dates}</div>` : ''}
          <div>- Vehículo: ${line.vehicleName}</div>
        </div>
      </td>
      <td class="text-right">${line.quantity}</td>
      <td class="text-right">${formatCurrency(line.unitPrice, 'HNL')}</td>
      <td class="text-right">${formatCurrency(line.total, 'HNL')}</td>
    </tr>
  `;
}

// Generate bank payment instructions note
function generateBankPaymentNote(data: InvoicePdfData): string {
  if (data.company.bankName && data.company.bankAccountNumber) {
    return `Favor depositar o transferir a: ${data.company.bankName} - Cta. ${data.company.bankAccountNumber}${data.company.bankAccountName ? ` a nombre de ${data.company.bankAccountName}` : ''}`;
  }
  return '';
}

export function generateInvoiceHtml(data: InvoicePdfData): string {
  const paymentStatus = data.amountDue <= 0 ? 'paid' : data.amountPaid > 0 ? 'partial' : 'unpaid';
  const statusLabel = paymentStatus === 'paid' ? 'PAGADA' : paymentStatus === 'partial' ? 'PAGO PARCIAL' : 'PENDIENTE';

  // Payment conditions display
  const paymentLabel = data.paymentConditions === 'contado' ? 'Contado'
    : data.paymentConditions?.replace('credito_', 'Crédito ').replace('_', ' ') + ' días' || 'Contado';

  // Tax display (Honduras ISV)
  const taxLabel = data.taxRate > 0 ? `ISV ${data.taxRate}%` : 'Exento de ISV 0.00%';

  // Extract sequence number from invoice number for display
  const sequenceDisplay = data.invoiceSequence
    ? String(data.invoiceSequence)
    : data.invoiceNumber.match(/^F?(\d+)/)?.[1] || data.invoiceNumber;

  // Bank payment note (default note)
  const bankNote = generateBankPaymentNote(data);
  const notesToDisplay = data.notes || bankNote;

  // Amount in words
  const amountInWords = formatAmountInWords(data.total);

  // Use serviceLines if available, otherwise fall back to legacy items
  const hasServiceLines = data.serviceLines && data.serviceLines.length > 0;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${data.invoiceNumber}</title>
  <style>
    ${baseStyles}
    /* Invoice-specific styles */
    .amount-words {
      font-size: 11px;
      font-weight: 500;
      color: #1e40af;
      text-align: center;
      padding: 8px;
      margin-top: 10px;
      border: 1px dashed #1e40af;
      background: #f8fafc;
    }
    .payment-status {
      position: absolute;
      top: 50%;
      right: 40px;
      transform: translateY(-50%) rotate(-15deg);
      font-size: 24px;
      font-weight: bold;
      color: ${paymentStatus === 'paid' ? '#22c55e' : paymentStatus === 'partial' ? '#d97706' : '#dc2626'};
      opacity: 0.3;
      text-transform: uppercase;
      letter-spacing: 3px;
      pointer-events: none;
    }
    .document-title h1.invoice {
      font-size: 32px;
    }
  </style>
</head>
<body>
  <div class="container" style="position: relative;">
    <!-- Watermark for payment status -->
    ${paymentStatus !== 'unpaid' ? `<div class="payment-status">${statusLabel}</div>` : ''}

    <!-- Header with Logo -->
    <div class="header">
      <div class="logo-section">
        ${data.company.logo ? `<img src="${data.company.logo}" alt="Logo" />` : ''}
        <div class="company-info">
          <div class="company-name">${data.company.name}</div>
          ${data.company.rtn ? `<div>RTN: ${data.company.rtn}</div>` : ''}
          ${data.company.address ? `<div>${data.company.address}</div>` : ''}
          ${data.company.city ? `<div>${data.company.city}</div>` : ''}
          ${data.company.phone ? `<div>Tel: ${data.company.phone}</div>` : ''}
          ${data.company.websiteUrl ? `<div>${data.company.websiteUrl}</div>` : ''}
          ${data.company.email ? `<div>${data.company.email}</div>` : ''}
        </div>
      </div>
      <div class="document-title">
        <h1 class="invoice">FACTURA</h1>
      </div>
    </div>

    <!-- Client & Document Info Grid -->
    <div class="info-grid">
      <div class="info-left">
        <div style="font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 5px;">Cliente</div>
        <div class="client-name">${data.client.name}</div>
        <div class="client-details">
          ${data.client.rtn ? `RTN: ${data.client.rtn}<br>` : ''}
          ${data.client.address ? `${data.client.address}<br>` : ''}
          ${data.client.city ? `${data.client.city}` : ''}${data.client.city && data.client.country ? ', ' : ''}${data.client.country || ''}
        </div>
      </div>
      <div class="info-right">
        <div class="info-cell">
          <label>Condiciones</label>
          <span>${paymentLabel}</span>
        </div>
        <div class="info-cell">
          <label>Fecha</label>
          <span>${formatShortDate(data.date)}</span>
        </div>
        <div class="info-cell">
          <label>Factura #</label>
          <span>${sequenceDisplay}</span>
        </div>
        <div class="info-cell">
          <label>RTN Cliente</label>
          <span>${data.client.rtn || 'Consum. Final'}</span>
        </div>
        <div class="info-cell">
          <label>Vencimiento</label>
          <span>${formatShortDate(data.dueDate)}</span>
        </div>
        <div class="info-cell">
          <label>Por</label>
          <span>${data.salesAgentInitials || ''}</span>
        </div>
      </div>
    </div>

    <!-- Itinerary Code (if available) -->
    ${data.itineraryCode ? `
    <div class="itinerary-code">
      ${data.itineraryCode}
    </div>
    ` : ''}

    <!-- Service Lines Table -->
    <table class="services-table">
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="text-right" style="width: 70px;">Cantidad</th>
          <th class="text-right" style="width: 100px;">Precio</th>
          <th class="text-right" style="width: 100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${hasServiceLines
          ? data.serviceLines!.map(line => generateInvoiceServiceLineHtml(line)).join('')
          : data.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice, 'HNL')}</td>
            <td class="text-right">${formatCurrency(item.total, 'HNL')}</td>
          </tr>
          `).join('')
        }
      </tbody>
    </table>

    <!-- Notes & Totals -->
    <div class="totals-wrapper">
      <div class="notes-box">
        <h4>Nota</h4>
        <p>${notesToDisplay}</p>
      </div>
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span>Subtotal</span>
          <span>${formatCurrency(data.subtotal, 'HNL')}</span>
        </div>
        <div class="totals-row tax">
          <span>${taxLabel}</span>
          <span>${formatCurrency(data.tax, 'HNL')}</span>
        </div>
        <div class="totals-row total">
          <span>Total</span>
          <span>${formatCurrency(data.total, 'HNL')}</span>
        </div>
        <div class="totals-row usd">
          <span>Equivalente USD</span>
          <span>${formatCurrency(data.totalUsd, 'USD')}</span>
        </div>
        ${data.amountPaid > 0 ? `
        <div class="totals-row">
          <span>Pagado</span>
          <span style="color: #22c55e;">-${formatCurrency(data.amountPaid, 'HNL')}</span>
        </div>
        <div class="totals-row" style="font-weight: 600; background: ${data.amountDue > 0 ? '#fef2f2' : '#dcfce7'};">
          <span>Saldo</span>
          <span style="color: ${data.amountDue > 0 ? '#dc2626' : '#22c55e'};">${formatCurrency(data.amountDue, 'HNL')}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Amount in Words -->
    <div class="amount-words">
      ${amountInWords}
    </div>

    ${data.paymentInstructions && data.paymentInstructions !== bankNote ? `
    <!-- Additional Payment Instructions -->
    <div class="section" style="margin-top: 15px;">
      <div class="notes">
        <h4>Instrucciones de Pago</h4>
        <p>${data.paymentInstructions}</p>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      ${data.company.websiteUrl ? `<a href="${data.company.websiteUrl}">${data.company.websiteUrl}</a> | ` : ''}
      ${data.company.email || ''} | ${data.company.phone || ''}
      <br>
      <small>Gracias por su preferencia</small>
    </div>
  </div>
</body>
</html>
  `;
}

// Itinerary-specific styles (operational document for drivers)
const itineraryStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #333;
    background: white;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 30px;
  }
  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .header-left {
    flex: 1;
  }
  .header-right {
    text-align: right;
  }
  .header-right img {
    max-height: 50px;
    max-width: 120px;
  }
  .itinerary-code {
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin-bottom: 5px;
    padding-bottom: 8px;
    border-bottom: 3px solid #f59e0b;
  }
  .short-description {
    font-size: 12px;
    color: #555;
    margin-bottom: 15px;
  }
  /* Section Headers */
  .section-header {
    background: #f59e0b;
    color: #333;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    padding: 8px 15px;
    margin: 15px 0 10px 0;
  }
  .sub-section-header {
    background: #fef3c7;
    color: #333;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    padding: 6px 15px;
    margin-bottom: 8px;
    border: 1px solid #fcd34d;
  }
  /* Vehicle Table */
  .vehicle-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: 11px;
  }
  .vehicle-table th {
    background: #fef3c7;
    color: #333;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    border: 1px solid #fcd34d;
  }
  .vehicle-table td {
    padding: 8px 10px;
    border: 1px solid #e5e7eb;
    vertical-align: middle;
  }
  .vehicle-table td:first-child {
    text-align: center;
    width: 30px;
    background: #f9fafb;
  }
  .vehicle-name {
    color: #1e40af;
    font-weight: 500;
  }
  .plate-number {
    font-weight: bold;
  }
  .driver-name {
    color: #1e40af;
    font-weight: 600;
  }
  .driver-role {
    color: #666;
    font-size: 10px;
  }
  .phone-number {
    font-weight: bold;
  }
  /* Tour Leader */
  .tour-leader {
    font-size: 11px;
    margin: 10px 0 15px 0;
    padding: 8px 12px;
    background: #f9fafb;
    border-left: 3px solid #f59e0b;
  }
  .tour-leader strong {
    color: #333;
  }
  /* Itinerary Schedule */
  .itinerary-section {
    margin-bottom: 20px;
  }
  .itinerary-title {
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    color: #333;
    margin: 15px 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 2px solid #333;
  }
  .day-header {
    background: #fef3c7;
    padding: 8px 12px;
    font-weight: 600;
    font-size: 12px;
    border: 1px solid #fcd34d;
    margin-bottom: 0;
  }
  .day-header .day-label {
    color: #333;
  }
  .day-header .day-location {
    color: #666;
    font-weight: normal;
  }
  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }
  .schedule-table td {
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    vertical-align: top;
  }
  .schedule-table td:first-child {
    width: 70px;
    text-align: right;
    font-weight: 500;
    background: #fafafa;
  }
  .schedule-table td.time-highlighted {
    background: #fef3c7;
    font-weight: bold;
  }
  .schedule-table .location-bold {
    font-weight: bold;
  }
  .schedule-table .end-services {
    text-align: center;
    font-weight: bold;
    font-style: italic;
    color: #666;
    padding: 10px;
  }
  /* Footer */
  .itinerary-footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 2px solid #f59e0b;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #1e40af;
  }
  .itinerary-footer a {
    color: #1e40af;
    text-decoration: none;
  }
  /* Notes section */
  .notes-section {
    margin-top: 15px;
    padding: 10px;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    font-size: 10px;
  }
  .notes-section h4 {
    font-size: 11px;
    margin-bottom: 5px;
    color: #92400e;
  }
`;

// Generate vehicle assignments table HTML
function generateVehicleTableHtml(vehicles: ItineraryVehicleAssignment[]): string {
  return vehicles.map(v => `
    <tr>
      <td>${v.vehicleNumber}</td>
      <td><span class="vehicle-name">${v.vehicleName}</span></td>
      <td><span class="plate-number">${v.licensePlate}</span></td>
      <td>
        <span class="driver-name">${v.driverName}</span>
        ${v.role ? `<span class="driver-role"> (${v.role})</span>` : ''}
      </td>
      <td>${v.driverId || ''}</td>
      <td><span class="phone-number">${v.driverPhone}</span></td>
    </tr>
  `).join('');
}

// Generate schedule activities HTML
function generateScheduleHtml(days: ItineraryDaySchedule[]): string {
  return days.map(day => `
    <div class="day-header">
      <span class="day-label">Día ${String(day.dayNumber).padStart(2, '0')}: ${day.date}</span>
      <span class="day-location">[${day.location}]</span>
    </div>
    <table class="schedule-table">
      <tbody>
        ${day.activities.map(activity => `
          <tr>
            <td class="${activity.isHighlighted ? 'time-highlighted' : ''}">${activity.time}</td>
            <td>
              ${activity.location
                ? activity.description.replace(activity.location, `<span class="location-bold">${activity.location}</span>`)
                : activity.description
              }
            </td>
          </tr>
        `).join('')}
        ${day.dayNumber === days.length ? `
          <tr>
            <td colspan="2" class="end-services">***FIN DE LOS SERVICIOS***</td>
          </tr>
        ` : ''}
      </tbody>
    </table>
  `).join('');
}

export function generateItineraryHtml(data: ItineraryPdfData): string {
  // Generate vehicle summary for header if not provided
  const vehicleSummary = data.vehicleSummary ||
    data.vehicles.map(v => v.vehicleName).join(', ');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Itinerario ${data.itineraryCode}</title>
  <style>${itineraryStyles}</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="itinerary-code">${data.itineraryCode}</div>
        <div class="short-description">${data.shortDescription}. <strong>${data.mainDate}</strong></div>
      </div>
      <div class="header-right">
        ${data.company.logo ? `<img src="${data.company.logo}" alt="Logo" />` : ''}
      </div>
    </div>

    <!-- Driver Information Section -->
    <div class="section-header">
      Información para Conductores: ${vehicleSummary}
    </div>

    <!-- Vehicle and Contacts Table -->
    <div class="sub-section-header">
      Información de Vehículos y Contactos
    </div>
    <table class="vehicle-table">
      <thead>
        <tr>
          <th></th>
          <th>Vehículo</th>
          <th>Placa</th>
          <th>Staff</th>
          <th>ID</th>
          <th>Celular</th>
        </tr>
      </thead>
      <tbody>
        ${generateVehicleTableHtml(data.vehicles)}
      </tbody>
    </table>

    <!-- Tour Leader Info -->
    <div class="tour-leader">
      Coordinador por parte del Grupo (Tour Líder): <strong>${data.groupLeaderName}</strong>${data.groupLeaderPhone ? `, celular # <strong>${data.groupLeaderPhone}</strong>` : ''}
    </div>

    <!-- Itinerary Schedule -->
    <div class="itinerary-title">Itinerario</div>
    <div class="itinerary-section">
      ${generateScheduleHtml(data.days)}
    </div>

    ${data.notes ? `
    <!-- Notes -->
    <div class="notes-section">
      <h4>Notas Adicionales</h4>
      <p>${data.notes}</p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="itinerary-footer">
      <span>${data.company.phone || ''}</span>
      <span>${data.company.websiteUrl || ''}</span>
      <span>${data.company.email || ''}</span>
    </div>
  </div>
</body>
</html>
  `;
}
