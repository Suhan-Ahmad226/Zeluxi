import React from 'react';
import { useStore } from '../../context/StoreContext';
import { X, ShieldCheck, Truck, RefreshCw, Mail, Phone, MapPin, HelpCircle, FileText } from 'lucide-react';

export type StaticPageType = 'about' | 'support' | 'faq' | 'shipping' | 'refund' | 'privacy' | 'terms';

interface StaticPagesModalProps {
  page: StaticPageType | null;
  onClose: () => void;
}

export const StaticPagesModal: React.FC<StaticPagesModalProps> = ({ page, onClose }) => {
  const { settings, language, pages } = useStore();

  if (!page) return null;

  const dynamicPage = pages?.find((p) => p.slug === page);
  const displayTitle = dynamicPage
    ? dynamicPage.title
    : (
        page === 'about' ? 'About Zelux' :
        page === 'shipping' ? 'Shipping & Delivery Policy' :
        page === 'refund' ? 'Return & Refund Policy' :
        page === 'support' ? 'Customer Support & Helpdesk' :
        page === 'faq' ? 'Frequently Asked Questions' :
        page === 'privacy' ? 'Privacy Policy' :
        'Terms of Service'
      );

  const dynamicContent = dynamicPage
    ? dynamicPage.content
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            {page === 'about' && <ShieldCheck className="w-5 h-5 text-indigo-600" />}
            {page === 'shipping' && <Truck className="w-5 h-5 text-indigo-600" />}
            {page === 'refund' && <RefreshCw className="w-5 h-5 text-indigo-600" />}
            {page === 'support' && <Mail className="w-5 h-5 text-indigo-600" />}
            {page === 'faq' && <HelpCircle className="w-5 h-5 text-indigo-600" />}
            {(page === 'privacy' || page === 'terms') && <FileText className="w-5 h-5 text-indigo-600" />}

            <h2 className="text-base font-bold text-slate-900 capitalize">
              {displayTitle}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {dynamicContent ? (
            <div className="space-y-4 whitespace-pre-line">
              <p>{dynamicContent}</p>
            </div>
          ) : (
            <>
          {page === 'about' && (
            <div className="space-y-4">
              <p>
                <strong>Zelux</strong> is a premier single-store lifestyle atelier based in Dhaka, Bangladesh. We specialize in handcrafted full-grain leather essentials, organic European linen apparel, and precision daily lifestyle items.
              </p>
              <p>
                Unlike multi-vendor marketplaces, every single product sold on Zelux is inspected, packed, and fulfilled directly from our central Banani studio. We take direct responsibility for product authenticity, material durability, and post-purchase customer satisfaction.
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">100% Genuine</h4>
                  <p className="text-[11px] text-slate-500">Premium Grade Materials</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Single Store</h4>
                  <p className="text-[11px] text-slate-500">Direct Central Quality Control</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Nationwide</h4>
                  <p className="text-[11px] text-slate-500">COD across 64 Districts</p>
                </div>
              </div>
            </div>
          )}

          {page === 'shipping' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">1. Delivery Timeframes & Coverage</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Inside Dhaka Metro:</strong> 24 to 48 business hours via Pathao Express Logistics (৳60 delivery charge).</li>
                <li><strong>Outside Dhaka (All 64 Districts):</strong> 48 to 72 business hours via Steadfast Courier Network (৳120 delivery charge).</li>
                <li><strong>Complimentary Delivery:</strong> Orders exceeding ৳3,500 automatically qualify for Free Delivery nationwide.</li>
              </ul>
              <h3 className="font-bold text-slate-900 pt-2">2. Package Inspection</h3>
              <p>
                Customers are encouraged to inspect the outer security seal upon delivery in the presence of the courier rider before paying for COD parcels.
              </p>
            </div>
          )}

          {page === 'refund' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">7-Day Hassle-Free Return & Exchange</h3>
              <p>
                At Zelux, we want you to be completely satisfied with your purchase. If a product does not meet your expectations, we offer a straightforward 7-day return and exchange policy from the date of package delivery.
              </p>
              <h4 className="font-semibold text-slate-900">Eligible Conditions:</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Size or fit exchange needed.</li>
                <li>Item damaged in transit or manufacturing defect detected.</li>
                <li>Wrong variant or item dispatched.</li>
              </ul>
              <p className="text-xs text-slate-500">
                You can initiate a return directly from your <strong>Customer Account → Orders → Request Return</strong> portal.
              </p>
            </div>
          )}

          {page === 'faq' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <h4 className="font-bold text-slate-900">How do I track my order?</h4>
                <p className="text-xs text-slate-600 mt-1">
                  You can click "Track Order" on the top navigation bar or enter your Order ID (e.g. ZLX-2601) in the tracking search box for real-time courier synchronization.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <h4 className="font-bold text-slate-900">What payment methods are supported?</h4>
                <p className="text-xs text-slate-600 mt-1">
                  We accept Cash on Delivery (COD) across all 64 districts of Bangladesh, as well as instant digital payments via bKash, Nagad, DBBL Rocket, and SSLCommerz (Visa, Mastercard, AMEX).
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <h4 className="font-bold text-slate-900">Do I need an account to place an order?</h4>
                <p className="text-xs text-slate-600 mt-1">
                  No, guest checkout is fully supported. However, creating an account lets you view past order receipts, download invoices, and save multiple delivery addresses.
                </p>
              </div>
            </div>
          )}

          {page === 'support' && (
            <div className="space-y-4">
              <p>
                Our concierge and customer service team in Banani, Dhaka is ready to assist you:
              </p>
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Phone className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Phone Concierge</h5>
                    <p className="text-xs text-slate-600">{settings.phone} (10:00 AM - 9:00 PM)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Email Desk</h5>
                    <p className="text-xs text-slate-600">{settings.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Physical Studio Hub</h5>
                    <p className="text-xs text-slate-600">{settings.address}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 'privacy' && (
            <div className="space-y-3 text-xs">
              <p>
                Zelux is committed to safeguarding customer data. We only collect the necessary information required to process and dispatch your orders (full name, phone number, and delivery address).
              </p>
              <p>
                We never store debit or credit card details on our servers. All online transactions are handled through certified Bangladesh Bank-approved gateways (bKash, Nagad, Rocket, and SSLCommerz PCI-DSS Level 1 gateway).
              </p>
            </div>
          )}

          {page === 'terms' && (
            <div className="space-y-3 text-xs">
              <p>
                By placing an order on Zelux, you agree to our standard Bangladesh consumer terms. Prices are listed in Bangladeshi Taka (BDT) inclusive of applicable taxes. Order confirmation messages and courier tracking waybills are automatically generated upon order submission.
              </p>
            </div>
          )}
          </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
