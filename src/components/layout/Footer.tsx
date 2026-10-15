import React from 'react';
import { useStore } from '../../context/StoreContext';
import { MapPin, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const { settings, setActiveView, setActiveStaticPage } = useStore();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white font-mono uppercase">
                ZELUX
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-600 text-white rounded font-mono">
                STORE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {settings.tagline || 'Quiet luxury in handcrafted essentials and atelier goods.'}
            </p>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{settings.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{settings.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => setActiveView('shop')}
                  className="hover:text-white transition-colors"
                >
                  All products
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveView('tracking')}
                  className="hover:text-white transition-colors"
                >
                  Track order
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveView('account')}
                  className="hover:text-white transition-colors"
                >
                  Account
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveStaticPage('about')}
                  className="hover:text-white transition-colors"
                >
                  About us
                </button>
              </li>
            </ul>
          </div>

          {/* Store Policies & Bangladesh Service */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Customer care
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => setActiveStaticPage('shipping')}
                  className="hover:text-white transition-colors text-left"
                >
                  Shipping policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveStaticPage('refund')}
                  className="hover:text-white transition-colors text-left"
                >
                  7-day returns
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveStaticPage('faq')}
                  className="hover:text-white transition-colors text-left"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveStaticPage('support')}
                  className="hover:text-white transition-colors text-left"
                >
                  Support desk
                </button>
              </li>
            </ul>
          </div>

          {/* Payment & Logistics Integration Badge */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Payment & delivery
            </h4>
            <p className="text-xs text-slate-400">
              Secured payments via bKash, Nagad, Rocket, cards and Pathao & Steadfast logistics.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-slate-300">
              <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-medium">bKash</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-medium">Nagad</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-medium">Rocket</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-medium">COD</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-medium">Pathao</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-medium">Steadfast</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Zelux Single-Store. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveStaticPage('privacy')} className="hover:text-slate-300">Privacy Policy</button>
            <span>·</span>
            <button onClick={() => setActiveStaticPage('terms')} className="hover:text-slate-300">Terms of Service</button>
            <span>·</span>
            <span>Banani, Dhaka, Bangladesh</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
