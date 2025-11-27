// PDF Templates for quotations and invoices

export interface QuotationPdfData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  trip: {
    origin: string;
    destination: string;
    departureDate: string;
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
  };
  notes?: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: {
    name: string;
    rtn?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
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
    logo?: string;
  };
  notes?: string;
  paymentInstructions?: string;
}

function formatCurrency(value: number, currency: 'HNL' | 'USD' = 'HNL'): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

const baseStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    color: #333;
    background: white;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 2px solid #2563eb;
  }
  .company-info h1 {
    font-size: 28px;
    color: #2563eb;
    margin-bottom: 5px;
  }
  .company-info p {
    color: #666;
    font-size: 11px;
  }
  .document-info {
    text-align: right;
  }
  .document-info h2 {
    font-size: 24px;
    color: #333;
    margin-bottom: 10px;
  }
  .document-info .number {
    font-size: 16px;
    color: #2563eb;
    font-weight: bold;
  }
  .document-info .date {
    color: #666;
    margin-top: 5px;
  }
  .section {
    margin-bottom: 30px;
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #2563eb;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #e5e7eb;
  }
  .client-info {
    background: #f9fafb;
    padding: 15px;
    border-radius: 8px;
  }
  .client-info h3 {
    font-size: 16px;
    margin-bottom: 5px;
  }
  .client-info p {
    color: #666;
    font-size: 11px;
  }
  .trip-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
  .detail-item {
    background: #f9fafb;
    padding: 12px;
    border-radius: 6px;
  }
  .detail-item label {
    display: block;
    font-size: 10px;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .detail-item span {
    font-size: 14px;
    font-weight: 500;
  }
  .route-display {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    margin-bottom: 20px;
  }
  .route-display .origin,
  .route-display .destination {
    font-size: 18px;
    font-weight: 600;
  }
  .route-display .arrow {
    font-size: 24px;
    margin: 0 15px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  th {
    background: #f9fafb;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    color: #666;
  }
  .text-right {
    text-align: right;
  }
  .totals {
    margin-top: 20px;
    margin-left: auto;
    width: 300px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
  }
  .totals-row.total {
    font-size: 18px;
    font-weight: bold;
    color: #2563eb;
    border-bottom: 2px solid #2563eb;
    padding: 12px 0;
  }
  .totals-row.usd {
    color: #666;
    font-size: 12px;
  }
  .notes {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    padding: 15px;
    border-radius: 8px;
    font-size: 11px;
  }
  .notes h4 {
    color: #92400e;
    margin-bottom: 5px;
  }
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #666;
    font-size: 10px;
  }
  .validity {
    background: #dcfce7;
    border: 1px solid #22c55e;
    color: #166534;
    padding: 10px 15px;
    border-radius: 6px;
    font-size: 11px;
    display: inline-block;
  }
  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }
  .status-paid {
    background: #dcfce7;
    color: #166534;
  }
  .status-unpaid {
    background: #fef2f2;
    color: #dc2626;
  }
  .status-partial {
    background: #fffbeb;
    color: #d97706;
  }
`;

export function generateQuotationHtml(data: QuotationPdfData): string {
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
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>${data.company.name}</h1>
        ${data.company.address ? `<p>${data.company.address}</p>` : ''}
        ${data.company.phone ? `<p>Tel: ${data.company.phone}</p>` : ''}
        ${data.company.email ? `<p>${data.company.email}</p>` : ''}
      </div>
      <div class="document-info">
        <h2>COTIZACIÓN</h2>
        <div class="number">${data.quotationNumber}</div>
        <div class="date">Fecha: ${formatDate(data.date)}</div>
      </div>
    </div>

    <!-- Client Info -->
    <div class="section">
      <div class="section-title">Cliente</div>
      <div class="client-info">
        <h3>${data.client.name}</h3>
        ${data.client.email ? `<p>Email: ${data.client.email}</p>` : ''}
        ${data.client.phone ? `<p>Tel: ${data.client.phone}</p>` : ''}
        ${data.client.address ? `<p>${data.client.address}</p>` : ''}
      </div>
    </div>

    <!-- Route Display -->
    <div class="route-display">
      <span class="origin">${data.trip.origin}</span>
      <span class="arrow">→</span>
      <span class="destination">${data.trip.destination}</span>
    </div>

    <!-- Trip Details -->
    <div class="section">
      <div class="section-title">Detalles del Viaje</div>
      <div class="trip-details">
        <div class="detail-item">
          <label>Fecha de Salida</label>
          <span>${formatDate(data.trip.departureDate)}</span>
        </div>
        ${data.trip.returnDate ? `
        <div class="detail-item">
          <label>Fecha de Retorno</label>
          <span>${formatDate(data.trip.returnDate)}</span>
        </div>
        ` : ''}
        <div class="detail-item">
          <label>Tamaño del Grupo</label>
          <span>${data.trip.groupSize} personas</span>
        </div>
        <div class="detail-item">
          <label>Duración</label>
          <span>${data.trip.estimatedDays} día(s)</span>
        </div>
        <div class="detail-item">
          <label>Distancia Total</label>
          <span>${data.trip.totalDistance.toLocaleString()} km</span>
        </div>
        <div class="detail-item">
          <label>Vehículo</label>
          <span>${data.vehicle.name} (${data.vehicle.capacity} pasajeros)</span>
        </div>
      </div>
    </div>

    <!-- Pricing -->
    <div class="section">
      <div class="section-title">Precio</div>
      <div class="totals">
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

    <!-- Validity -->
    <div class="section" style="text-align: center;">
      <div class="validity">
        Esta cotización es válida hasta: <strong>${formatDate(data.validUntil)}</strong>
      </div>
    </div>

    ${data.notes ? `
    <!-- Notes -->
    <div class="section">
      <div class="notes">
        <h4>Notas</h4>
        <p>${data.notes}</p>
      </div>
    </div>
    ` : ''}

    <!-- Terms -->
    <div class="section">
      <div class="section-title">Términos y Condiciones</div>
      <ul style="font-size: 10px; color: #666; padding-left: 20px;">
        <li>El precio incluye conductor, combustible y peajes (según lo especificado).</li>
        <li>El pago debe realizarse antes de la fecha de salida.</li>
        <li>Cancelaciones con menos de 48 horas de anticipación pueden incurrir en cargos.</li>
        <li>El itinerario puede ajustarse según condiciones de tráfico y clima.</li>
      </ul>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Gracias por su preferencia</p>
      <p>${data.company.name} | ${data.company.phone || ''} | ${data.company.email || ''}</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateInvoiceHtml(data: InvoicePdfData): string {
  const paymentStatus = data.amountDue <= 0 ? 'paid' : data.amountPaid > 0 ? 'partial' : 'unpaid';
  const statusLabel = paymentStatus === 'paid' ? 'PAGADA' : paymentStatus === 'partial' ? 'PAGO PARCIAL' : 'PENDIENTE';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${data.invoiceNumber}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>${data.company.name}</h1>
        ${data.company.rtn ? `<p>RTN: ${data.company.rtn}</p>` : ''}
        ${data.company.address ? `<p>${data.company.address}</p>` : ''}
        ${data.company.phone ? `<p>Tel: ${data.company.phone}</p>` : ''}
        ${data.company.email ? `<p>${data.company.email}</p>` : ''}
      </div>
      <div class="document-info">
        <h2>FACTURA</h2>
        <div class="number">${data.invoiceNumber}</div>
        <div class="date">Fecha: ${formatDate(data.date)}</div>
        <div style="margin-top: 10px;">
          <span class="status-badge status-${paymentStatus}">${statusLabel}</span>
        </div>
      </div>
    </div>

    <!-- Client Info -->
    <div class="section">
      <div class="section-title">Facturar A</div>
      <div class="client-info">
        <h3>${data.client.name}</h3>
        ${data.client.rtn ? `<p>RTN: ${data.client.rtn}</p>` : ''}
        ${data.client.email ? `<p>Email: ${data.client.email}</p>` : ''}
        ${data.client.phone ? `<p>Tel: ${data.client.phone}</p>` : ''}
        ${data.client.address ? `<p>${data.client.address}</p>` : ''}
      </div>
    </div>

    <!-- Invoice Items -->
    <div class="section">
      <div class="section-title">Detalle</div>
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th class="text-right">Cantidad</th>
            <th class="text-right">Precio Unit.</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
            <td class="text-right">${formatCurrency(item.total)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="section">
      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>ISV (${data.taxRate}%)</span>
          <span>${formatCurrency(data.tax)}</span>
        </div>
        <div class="totals-row total">
          <span>Total</span>
          <span>${formatCurrency(data.total)}</span>
        </div>
        <div class="totals-row usd">
          <span>Equivalente USD</span>
          <span>${formatCurrency(data.totalUsd, 'USD')}</span>
        </div>
        ${data.amountPaid > 0 ? `
        <div class="totals-row">
          <span>Pagado</span>
          <span>-${formatCurrency(data.amountPaid)}</span>
        </div>
        <div class="totals-row" style="font-weight: bold; color: ${data.amountDue > 0 ? '#dc2626' : '#22c55e'};">
          <span>Saldo</span>
          <span>${formatCurrency(data.amountDue)}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Due Date -->
    <div class="section" style="text-align: center;">
      <div class="validity" style="${data.amountDue > 0 ? '' : 'background: #dcfce7; border-color: #22c55e;'}">
        ${data.amountDue > 0
          ? `Fecha de vencimiento: <strong>${formatDate(data.dueDate)}</strong>`
          : '<strong>FACTURA PAGADA</strong>'
        }
      </div>
    </div>

    ${data.paymentInstructions ? `
    <!-- Payment Instructions -->
    <div class="section">
      <div class="notes">
        <h4>Instrucciones de Pago</h4>
        <p>${data.paymentInstructions}</p>
      </div>
    </div>
    ` : ''}

    ${data.notes ? `
    <!-- Notes -->
    <div class="section">
      <div class="notes" style="background: #f3f4f6; border-color: #d1d5db;">
        <h4>Notas</h4>
        <p>${data.notes}</p>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>Gracias por su preferencia</p>
      <p>${data.company.name} | ${data.company.phone || ''} | ${data.company.email || ''}</p>
    </div>
  </div>
</body>
</html>
  `;
}
