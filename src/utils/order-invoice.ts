import type { Language, Order, StoreSettings } from '../types';
import { formatDate, formatPrice } from './formatters';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

function formatDetails(values: Record<string, string> | undefined): string {
  return Object.entries(values || {})
    .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`)
    .join(' · ');
}

/** The single canonical invoice markup used by Customer, Admin, and order confirmation. */
export function buildOrderInvoiceHtml(
  order: Order,
  settings: StoreSettings,
  language: Language = 'en',
): string {
  const orderNumber = order.orderNumber || order.id;
  const rows = order.items.map((item) => {
    const details = [
      item.variantLabel ? `<div class="muted">${escapeHtml(item.variantLabel)}</div>` : '',
      Object.keys(item.variantAttributes || {}).length ? `<div class="muted">${formatDetails(item.variantAttributes)}</div>` : '',
      item.variantSku ? `<div class="muted">Variant SKU: ${escapeHtml(item.variantSku)}</div>` : '',
      item.productSku ? `<div class="muted">Product SKU: ${escapeHtml(item.productSku)}</div>` : '',
      item.brand ? `<div class="muted">Brand: ${escapeHtml(item.brand)}</div>` : '',
      item.barcode ? `<div class="muted">Barcode: ${escapeHtml(item.barcode)}</div>` : '',
      item.description ? `<div class="muted">${escapeHtml(item.description)}</div>` : '',
      Object.keys(item.specifications || {}).length ? `<div class="muted">${formatDetails(item.specifications)}</div>` : '',
    ].filter(Boolean).join('');
    const image = item.image
      ? `<img class="product-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.productName)}" crossorigin="anonymous">`
      : '';
    return `<tr><td><div class="product-cell">${image}<div><strong>${escapeHtml(item.productName)}</strong>${details}</div></div></td><td class="numeric">${item.quantity}</td><td class="numeric">${escapeHtml(formatPrice(item.price, language))}</td><td class="numeric"><strong>${escapeHtml(formatPrice(item.price * item.quantity, language))}</strong></td></tr>`;
  }).join('');
  const customer = order.customer;
  const address = [
    customer.addressDetails,
    customer.upazila || customer.thanaCity,
    customer.district,
    customer.division,
    customer.postalCode,
  ].filter(Boolean).join(', ');
  const storeName = settings.storeName?.trim() || 'Store';
  const logoUrl = typeof settings.logoUrl === 'string' && /^https:\/\//i.test(settings.logoUrl.trim())
    ? settings.logoUrl.trim()
    : '';

  return `<article class="store-invoice">
    <style>
      .store-invoice{font-family:Arial,Helvetica,sans-serif;color:#172033;background:#fff;width:100%;max-width:900px;margin:0 auto;font-size:12px;line-height:1.5}
      .store-invoice *{box-sizing:border-box}.store-invoice .topbar{height:7px;background:#4338ca;border-radius:5px;margin-bottom:22px}
      .store-invoice .header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #e2e8f0;padding-bottom:18px}
      .store-invoice .brand-lockup{display:flex;align-items:center;gap:10px;min-width:0;margin:0 0 6px}
      .store-invoice .brand-logo{width:54px;height:54px;object-fit:contain;flex:none}
      .store-invoice .brand{font-size:24px;font-weight:800;letter-spacing:-.6px;margin:0;color:#111827;overflow-wrap:anywhere}
      .store-invoice .muted{font-size:10px;color:#64748b;margin-top:3px;overflow-wrap:anywhere}
      .store-invoice .invoice-title{font-size:26px;letter-spacing:1.5px;margin:0;color:#4338ca;text-align:right}
      .store-invoice .order-meta{text-align:right;color:#475569;margin-top:7px}
      .store-invoice .section-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;margin:0 0 8px}
      .store-invoice .details{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px 0}
      .store-invoice .details p{margin:3px 0;overflow-wrap:anywhere}.store-invoice .details strong{font-size:13px}
      .store-invoice table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:4px}
      .store-invoice th{background:#f1f5f9;color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
      .store-invoice th,.store-invoice td{padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top;overflow-wrap:anywhere}
      .store-invoice th:nth-child(1){width:54%}.store-invoice th:nth-child(2){width:9%}.store-invoice th:nth-child(3){width:17%}.store-invoice th:nth-child(4){width:20%}
      .store-invoice .numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
      .store-invoice .product-cell{display:flex;align-items:flex-start;gap:10px}.store-invoice .product-image{width:48px;height:48px;object-fit:contain;border:1px solid #e2e8f0;border-radius:6px;flex:none}
      .store-invoice .totals{width:100%;max-width:330px;margin:20px 0 0 auto}.store-invoice .total-row{display:flex;justify-content:space-between;gap:18px;padding:5px 0;color:#475569}
      .store-invoice .grand-total{border-top:2px solid #cbd5e1;margin-top:6px;padding-top:12px;font-size:15px;font-weight:800;color:#111827}
      .store-invoice .grand-total strong{color:#4338ca}.store-invoice .footer{border-top:1px solid #e2e8f0;margin-top:26px;padding-top:14px;color:#64748b;text-align:center;font-size:10px}
      @media(max-width:600px){.store-invoice .header{gap:10px}.store-invoice .brand{font-size:19px}.store-invoice .brand-logo{width:42px;height:42px}.store-invoice .invoice-title{font-size:20px}.store-invoice .details{gap:12px}.store-invoice th,.store-invoice td{padding:7px 4px;font-size:10px}.store-invoice .product-cell{gap:5px}.store-invoice .product-image{width:34px;height:34px}}
      @media print{.store-invoice{max-width:none!important;font-size:10pt!important}.store-invoice .topbar{background:#4338ca!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}.store-invoice .header,.store-invoice .details,.store-invoice table tr{break-inside:avoid;page-break-inside:avoid}.store-invoice table thead{display:table-header-group}.store-invoice .muted{font-size:8pt}}
    </style>
    <div class="topbar"></div>
    <header class="header">
      <div>
        <div class="brand-lockup">
          ${logoUrl ? `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(storeName)} logo" crossorigin="anonymous">` : ''}
          <h1 class="brand">${escapeHtml(storeName)}</h1>
        </div>
        ${settings.address ? `<div>${escapeHtml(settings.address)}</div>` : ''}
        ${settings.phone ? `<div class="muted">Phone: ${escapeHtml(settings.phone)}</div>` : ''}
        ${settings.email ? `<div class="muted">Email: ${escapeHtml(settings.email)}</div>` : ''}
      </div>
      <div><h2 class="invoice-title">INVOICE</h2><div class="order-meta"><strong>Order #${escapeHtml(orderNumber)}</strong><br>${escapeHtml(formatDate(order.createdAt, language))}<br><span class="muted">Status: ${escapeHtml(order.status)}</span></div></div>
    </header>
    <section class="details">
      <div><h3 class="section-title">Bill to</h3><strong>${escapeHtml(customer.fullName)}</strong><p>${escapeHtml(customer.phone)}</p>${customer.email ? `<p>${escapeHtml(customer.email)}</p>` : ''}</div>
      <div><h3 class="section-title">Ship to</h3><p>${escapeHtml(address)}</p>${customer.notes ? `<p class="muted">Delivery notes: ${escapeHtml(customer.notes)}</p>` : ''}</div>
    </section>
    <table><thead><tr><th>Item / Description</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="totals">
      <div class="total-row"><span>Subtotal</span><strong>${escapeHtml(formatPrice(order.subtotal, language))}</strong></div>
      <div class="total-row"><span>Shipping charged (${escapeHtml(order.courier?.provider || 'Delivery')})</span><strong>${escapeHtml(formatPrice(order.shippingFee, language))}</strong></div>
      ${typeof order.pathaoDeliveryFee === 'number' && order.pathaoDeliveryFee !== order.shippingFee ? `<div class="total-row"><span>Pathao delivery cost</span><strong>${escapeHtml(formatPrice(order.pathaoDeliveryFee, language))}</strong></div>` : ''}
      ${typeof order.codFee === 'number' && order.codFee > 0 ? `<div class="total-row"><span>COD charge</span><strong>${escapeHtml(formatPrice(order.codFee, language))}</strong></div>` : ''}
      ${order.discount > 0 ? `<div class="total-row"><span>Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</span><strong>−${escapeHtml(formatPrice(order.discount, language))}</strong></div>` : ''}
      <div class="total-row"><span>Payment method / status</span><strong>${escapeHtml(order.paymentMethod)} / ${escapeHtml(order.paymentStatus)}</strong></div>
      ${order.courier?.trackingCode ? `<div class="total-row"><span>Courier tracking</span><strong>${escapeHtml(order.courier.trackingCode)}</strong></div>` : ''}
      <div class="total-row grand-total"><span>Grand total</span><strong>${escapeHtml(formatPrice(order.grandTotal, language))}</strong></div>
    </section>
    <footer class="footer">Thank you for shopping with ${escapeHtml(storeName)}.</footer>
  </article>`;
}

export async function downloadOrderInvoicePdf(
  order: Order,
  settings: StoreSettings,
  language: Language = 'en',
): Promise<void> {
  const container = document.createElement('div');
  container.innerHTML = buildOrderInvoiceHtml(order, settings, language);
  container.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;padding:28px;z-index:-1;';
  document.body.appendChild(container);
  try {
    const imported = await import('html2pdf.js');
    const html2pdf = imported.default;
    await html2pdf().set({
      margin: [8, 8, 8, 8],
      filename: `${(settings.storeName?.trim() || 'Store').replace(/[^a-zA-Z0-9_-]/g, '-')}-Invoice-${String(order.orderNumber || order.id).replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(container.firstElementChild as HTMLElement).save();
  } finally {
    container.remove();
  }
}

export function printOrderInvoice(
  order: Order,
  settings: StoreSettings,
  language: Language = 'en',
): void {
  const popup = window.open('', '_blank', 'width=900,height=720');
  if (!popup) {
    window.alert('Please allow pop-ups to print your invoice.');
    return;
  }
  const invoiceHtml = buildOrderInvoiceHtml(order, settings, language);
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(settings.storeName?.trim() || 'Store')} Invoice ${escapeHtml(order.orderNumber || order.id)}</title><style>@page{size:A4;margin:12mm}body{margin:0;padding:0;background:#fff}</style></head><body>${invoiceHtml}<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print()},300)})<\\/script></body></html>`);
  popup.document.close();
}
