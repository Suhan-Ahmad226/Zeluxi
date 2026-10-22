import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, X, Printer, Truck, ArrowRight, Download } from 'lucide-react';
import { buildOrderInvoiceHtml, downloadOrderInvoicePdf, printOrderInvoice } from '../../utils/order-invoice';

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
    printOrderInvoice(lastCreatedOrder, settings);
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadOrderInvoicePdf(lastCreatedOrder, settings);
    } catch (error) {
      console.error('Invoice PDF download failed.', error);
      window.alert('Could not download the PDF. Please use Print Invoice and choose Save as PDF.');
    }
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

          {/* Shared canonical invoice markup renders productSku, specifications, variantSku, and variant attributes from immutable order snapshots. */}
          <div
            id="zeluxi-order-invoice"
            className="invoice-print border border-slate-200 rounded-xl p-5 bg-white"
            dangerouslySetInnerHTML={{ __html: buildOrderInvoiceHtml(lastCreatedOrder, settings) }}
          />

          {/* Actions stay outside the printable invoice */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleDownloadPdf}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
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
