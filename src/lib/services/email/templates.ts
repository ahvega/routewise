// Email templates for quotations and invoices

export interface QuotationEmailData {
  recipientName: string;
  quotationNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  totalPrice: string;
  validUntil: string;
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
}

export interface InvoiceEmailData {
  recipientName: string;
  invoiceNumber: string;
  totalAmount: string;
  dueDate: string;
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  paymentInstructions?: string;
}

export interface PaymentReminderEmailData {
  recipientName: string;
  invoiceNumber: string;
  amountDue: string;
  dueDate: string;
  daysOverdue: number;
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
}

const baseEmailStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  .header {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    padding: 30px;
    text-align: center;
    border-radius: 8px 8px 0 0;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
  }
  .content {
    background: #ffffff;
    padding: 30px;
    border: 1px solid #e5e7eb;
    border-top: none;
  }
  .highlight-box {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
  }
  .route-box {
    background: #2563eb;
    color: white;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    margin: 20px 0;
  }
  .route-box .origin,
  .route-box .destination {
    font-size: 18px;
    font-weight: bold;
  }
  .route-box .arrow {
    font-size: 24px;
    margin: 0 10px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e5e7eb;
  }
  .detail-row:last-child {
    border-bottom: none;
  }
  .detail-label {
    color: #6b7280;
  }
  .detail-value {
    font-weight: 600;
  }
  .price-box {
    background: #dcfce7;
    border: 1px solid #22c55e;
    color: #166534;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    margin: 20px 0;
  }
  .price-box .amount {
    font-size: 28px;
    font-weight: bold;
  }
  .warning-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .cta-button {
    display: inline-block;
    background: #2563eb;
    color: white;
    padding: 12px 30px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    margin: 20px 0;
  }
  .footer {
    background: #f9fafb;
    padding: 20px;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
    border: 1px solid #e5e7eb;
    border-top: none;
    border-radius: 0 0 8px 8px;
  }
  .footer a {
    color: #2563eb;
    text-decoration: none;
  }
`;

export function generateQuotationEmail(data: QuotationEmailData): { subject: string; html: string } {
  const subject = `Cotización ${data.quotationNumber} - ${data.origin} a ${data.destination}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseEmailStyles}</style>
</head>
<body>
  <div class="header">
    <h1>${data.companyName}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Cotización de Transporte</p>
  </div>

  <div class="content">
    <p>Estimado(a) <strong>${data.recipientName}</strong>,</p>

    <p>Gracias por su interés en nuestros servicios de transporte. A continuación encontrará los detalles de su cotización:</p>

    <div class="route-box">
      <span class="origin">${data.origin}</span>
      <span class="arrow">→</span>
      <span class="destination">${data.destination}</span>
    </div>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Número de Cotización</span>
        <span class="detail-value">${data.quotationNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Fecha de Salida</span>
        <span class="detail-value">${data.departureDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Válida Hasta</span>
        <span class="detail-value">${data.validUntil}</span>
      </div>
    </div>

    <div class="price-box">
      <p style="margin: 0 0 5px 0;">Precio Total</p>
      <div class="amount">${data.totalPrice}</div>
    </div>

    <p>Adjunto encontrará el documento PDF con todos los detalles de la cotización.</p>

    <p>Si tiene alguna pregunta o desea confirmar su reserva, no dude en contactarnos.</p>

    <p>Saludos cordiales,<br><strong>${data.companyName}</strong></p>
  </div>

  <div class="footer">
    <p>${data.companyName}</p>
    ${data.companyPhone ? `<p>Tel: ${data.companyPhone}</p>` : ''}
    ${data.companyEmail ? `<p>Email: <a href="mailto:${data.companyEmail}">${data.companyEmail}</a></p>` : ''}
  </div>
</body>
</html>
  `;

  return { subject, html };
}

export function generateInvoiceEmail(data: InvoiceEmailData): { subject: string; html: string } {
  const subject = `Factura ${data.invoiceNumber} - ${data.companyName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseEmailStyles}</style>
</head>
<body>
  <div class="header">
    <h1>${data.companyName}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Factura</p>
  </div>

  <div class="content">
    <p>Estimado(a) <strong>${data.recipientName}</strong>,</p>

    <p>Adjunto encontrará su factura por los servicios de transporte prestados.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Número de Factura</span>
        <span class="detail-value">${data.invoiceNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Fecha de Vencimiento</span>
        <span class="detail-value">${data.dueDate}</span>
      </div>
    </div>

    <div class="price-box">
      <p style="margin: 0 0 5px 0;">Total a Pagar</p>
      <div class="amount">${data.totalAmount}</div>
    </div>

    ${data.paymentInstructions ? `
    <div class="highlight-box" style="background: #fffbeb; border-color: #fcd34d;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">Instrucciones de Pago:</p>
      <p style="margin: 10px 0 0 0;">${data.paymentInstructions}</p>
    </div>
    ` : ''}

    <p>Adjunto encontrará el documento PDF con el detalle completo de la factura.</p>

    <p>Si tiene alguna pregunta sobre esta factura, no dude en contactarnos.</p>

    <p>Gracias por su preferencia,<br><strong>${data.companyName}</strong></p>
  </div>

  <div class="footer">
    <p>${data.companyName}</p>
    ${data.companyPhone ? `<p>Tel: ${data.companyPhone}</p>` : ''}
    ${data.companyEmail ? `<p>Email: <a href="mailto:${data.companyEmail}">${data.companyEmail}</a></p>` : ''}
  </div>
</body>
</html>
  `;

  return { subject, html };
}

export function generatePaymentReminderEmail(data: PaymentReminderEmailData): { subject: string; html: string } {
  const subject = `Recordatorio de Pago - Factura ${data.invoiceNumber}`;
  const urgencyLevel = data.daysOverdue > 30 ? 'urgent' : data.daysOverdue > 14 ? 'warning' : 'reminder';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseEmailStyles}</style>
</head>
<body>
  <div class="header" style="${urgencyLevel === 'urgent' ? 'background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);' : ''}">
    <h1>${data.companyName}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Recordatorio de Pago</p>
  </div>

  <div class="content">
    <p>Estimado(a) <strong>${data.recipientName}</strong>,</p>

    ${urgencyLevel === 'urgent' ? `
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">⚠️ URGENTE: Su factura tiene ${data.daysOverdue} días de vencida.</p>
    </div>
    ` : `
    <p>Le recordamos que tiene un saldo pendiente de pago correspondiente a la siguiente factura:</p>
    `}

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Número de Factura</span>
        <span class="detail-value">${data.invoiceNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Fecha de Vencimiento</span>
        <span class="detail-value">${data.dueDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Días Vencidos</span>
        <span class="detail-value" style="color: #dc2626;">${data.daysOverdue} días</span>
      </div>
    </div>

    <div class="price-box" style="${urgencyLevel === 'urgent' ? 'background: #fef2f2; border-color: #dc2626; color: #dc2626;' : ''}">
      <p style="margin: 0 0 5px 0;">Saldo Pendiente</p>
      <div class="amount">${data.amountDue}</div>
    </div>

    <p>Por favor, realice el pago a la brevedad posible para evitar inconvenientes.</p>

    <p>Si ya realizó el pago, por favor ignore este mensaje y háganos saber para actualizar nuestros registros.</p>

    <p>Gracias por su atención,<br><strong>${data.companyName}</strong></p>
  </div>

  <div class="footer">
    <p>${data.companyName}</p>
    ${data.companyPhone ? `<p>Tel: ${data.companyPhone}</p>` : ''}
    ${data.companyEmail ? `<p>Email: <a href="mailto:${data.companyEmail}">${data.companyEmail}</a></p>` : ''}
  </div>
</body>
</html>
  `;

  return { subject, html };
}
