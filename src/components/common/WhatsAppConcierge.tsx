import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { MessageSquare, Phone, X, ArrowUpRight, HelpCircle } from 'lucide-react';

export const WhatsAppConcierge: React.FC = () => {
  const { settings, setActiveView } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  const whatsappUrl = `https://wa.me/8801700112233?text=${encodeURIComponent(
    'Hello Zelux Concierge, I have an inquiry regarding a product / order.'
  )}`;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-40">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm p-4 sm:p-5 space-y-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                Z
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{settings.storeName} Concierge</h4>
                <p className="text-[10px] text-emerald-600 font-medium">● Available 10am - 9pm</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Our Dhaka concierge team is available to assist with sizing, bespoke inquiries, and order delivery.
          </p>

          <div className="space-y-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            <a
              href={`tel:${settings.phone}`}
              className="flex items-center justify-between p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-600" />
                <span>Call Hotline</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">{settings.phone}</span>
            </a>
          </div>

          {/* Quick FAQ links */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
            <button
              onClick={() => {
                setActiveView('tracking');
                setIsOpen(false);
              }}
              className="w-full text-left hover:text-indigo-600 flex items-center gap-1.5 py-1"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>Track your courier parcel</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl transition-transform active:scale-95 text-xs font-semibold border border-slate-700"
          aria-label="Open Concierge Chat"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">
            Concierge
          </span>
        </button>
      )}
    </div>
  );
};
