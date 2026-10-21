import React from 'react';
import { useStore } from '../../context/StoreContext';
import { formatPrice, formatDate } from '../../utils/formatters';
import { CheckCircle2, X, Printer, Truck, ArrowRight } from 'lucide-react';

export const OrderSuccessModal: React.FC = () => {
  const {
    lastCreatedOrder,
    setLastCreatedOrder,
    settings,
    setActiveView,
    activeView,
    setActiveTrackingId,
  } = useStore();

  if (!lastCreatedOrder) return null;
  const isAdminInvoice = activeView === 'admin';

  const handlePrint = () => {
    const invoice = document.getElementById('zeluxi-order-invoice');
    if (!invoice) return;
    const popup = window.open('', '_blank', 'width=900,height=720');
    if (!popup) { window.alert('Allow pop-ups to print or save your invoice as PDF.'); return; }
    const safeOrderId = String(lastCreatedOrder.orderNumber || lastCreatedOrder.id).replace(/[&<>"']/g, '');
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((node) => node.outerHTML).join('');
    popup.onload = async () => {
      popup.focus();
      const images = Array.from(popup.document.images);
      await Promise.all(images.map((image) => {
        image.loading = 'eager';
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }));
      popup.print();
    };
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Invoice ' + safeOrderId + '</title>' + styles + '<style>body{background:#fff!important;padding:24px!important}.invoice-print{display:block!important;max-width:900px;margin:auto}.invoice-print table{width:100%;border-collapse:collapse}.invoice-print th,.invoice-print td{padding:8px;border-bottom:1px solid #ddd;text-align:left}.invoice-print img{max-width:56px;max-height:56px;object-fit:contain}@media print{body{padding:0!important}}</style></head><body><main class="invoice-print">' + invoice.innerHTML + '</main></body></html>');
    popup.document.close();
  };

  const handleTrack = () => {
    setActiveTrackingId(lastCreatedOrder.id);
    setLastCreatedOrder(null);
    setActiveView('tracking');
  };

  const handleClose = () => {
    setLastCreatedOrder(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Success Banner */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isAdminInvoice ? 'Order Invoice' : 'Order Placed Successfully!'}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isAdminInvoice ? `Invoice for ${lastCreatedOrder.customer.fullName}` : `Thank you, ${lastCreatedOrder.customer.fullName}. Your order has been registered and is being prepared for dispatch.`}
            </p>
          </div>

          {/* Quick Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">
                Order ID
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">{lastCreatedOrder.orderNumber || lastCreatedOrder.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">
                Payment
              </span>
              <span className="font-semibold text-slate-800">{lastCreatedOrder.paymentMethod}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">
                Courier
              </span>
              <span className="font-semibold text-indigo-700">
                {lastCreatedOrder.courier.provider === 'PATHAO' ? 'Pathao Express' : 'Steadfast'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">
                Tracking Code
              </span>
              <span className="font-mono font-bold text-slate-900 text-[11px]">
                {lastCreatedOrder.courier.trackingCode}
              </span>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div id="zeluxi-order-invoice" className="invoice-print border border-slate-200 rounded-xl p-5 bg-white space-y-4 print:border-none print:p-0">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{settings.storeName}</h3>
                <p className="text-[11px] text-slate-500">{settings.address}</p>
                <p className="text-[11px] text-slate-500">Tel: {settings.phone} · {settings.email}</p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block">
                  Invoice / Memo
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">{lastCreatedOrder.orderNumber || lastCreatedOrder.id}</span>
                <p className="text-[11px] text-slate-400">{formatDate(lastCreatedOrder.createdAt)}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Bill To / Customer:</span>
                <p className="font-bold text-slate-800">{lastCreatedOrder.customer.fullName}</p>
                <p className="text-slate-600">{lastCreatedOrder.customer.phone}</p>
                {lastCreatedOrder.customer.email && (
                  <p className="text-slate-500">{lastCreatedOrder.customer.email}</p>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Destination & Delivery:</span>
                <p className="text-slate-700">{lastCreatedOrder.customer.addressDetails}</p>
                <p className="text-slate-700 font-medium">
                  {[(lastCreatedOrder.customer.upazila || lastCreatedOrder.customer.thanaCity), lastCreatedOrder.customer.district, lastCreatedOrder.customer.division, lastCreatedOrder.customer.postalCode].filter(Boolean).join(', ')}
                </p>
                {lastCreatedOrder.customer.notes && <p className="text-slate-500">Delivery notes: {lastCreatedOrder.customer.notes}</p>}
              </div>
            </div>

            {/* Line items table */}
            <div className="border-t border-slate-100 pt-3 text-xs">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100 pb-1">
                  <tr>
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lastCreatedOrder.items.map((it, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2">
                        <span className="font-semibold text-slate-900 block">{it.productName}</span>
                        {it.image && <img src={it.image} alt={it.productName} loading="lazy" className="mt-1 h-12 w-12 rounded border border-slate-200 object-contain" />}
                        {it.variantLabel && <span className="text-[10px] text-slate-500 block">{it.variantLabel}</span>}
                        {Object.keys(it.variantAttributes || {}).length > 0 && <span className="text-[10px] text-slate-500 block">{Object.entries(it.variantAttributes || {}).map(([key, value]) => `${key}: ${value}`).join(' · ')}</span>}
                        {it.variantSku && <span className="text-[10px] text-slate-400 block">Variant SKU: {it.variantSku}</span>}
                        {it.productSku && <span className="text-[10px] text-slate-500 block">Product SKU: {it.productSku}</span>}
                        {it.brand && <span className="text-[10px] text-slate-500 block">Brand: {it.brand}</span>}
                        {it.barcode && <span className="text-[10px] text-slate-500 block">Barcode: {it.barcode}</span>}
                        {it.description && <span className="text-[10px] text-slate-500 block">{it.description}</span>}
                        {Object.keys(it.specifications || {}).length > 0 && <span className="text-[10px] text-slate-500 block">{Object.entries(it.specifications || {}).map(([key, value]) => `${key}: ${value}`).join(' · ')}</span>}
                      </td>
                      <td className="py-2 text-center tabular-nums">{it.quantity}</td>
                      <td className="py-2 text-right tabular-nums">{formatPrice(it.price)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{formatPrice(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-200 mt-3 pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">{formatPrice(lastCreatedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping Fee ({lastCreatedOrder.courier.provider}):</span>
                  <span className="font-semibold tabular-nums">৳{lastCreatedOrder.shippingFee}</span>
                </div>
                {lastCreatedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount{lastCreatedOrder.couponCode ? ` Coupon (${lastCreatedOrder.couponCode})` : ''}:</span>
                    <span className="tabular-nums">-{formatPrice(lastCreatedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600"><span>Payment method / status:</span><span className="font-semibold">{lastCreatedOrder.paymentMethod} / {lastCreatedOrder.paymentStatus}</span></div>
                {lastCreatedOrder.courier.trackingCode && <div className="flex justify-between text-slate-600"><span>Courier tracking:</span><span className="font-mono font-semibold">{lastCreatedOrder.courier.trackingCode}</span></div>}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Grand Total:</span>
                  <span className="text-base text-indigo-700 tabular-nums">{formatPrice(lastCreatedOrder.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>

            {!isAdminInvoice && <button
              onClick={handleTrack}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Truck className="w-4 h-4 text-indigo-400" />
              <span>Track Order in Real-Time</span>
              <ArrowRight className="w-4 h-4" />
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
};
