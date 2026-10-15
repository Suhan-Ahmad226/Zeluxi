import React from 'react';
import { Truck, ShieldCheck, RefreshCw, Award } from 'lucide-react';

export const TrustBadges: React.FC = () => {
  const badges = [
    {
      icon: ShieldCheck,
      title: 'Cash on Delivery',
      desc: 'Bangladesh delivery options',
    },
    {
      icon: Truck,
      title: 'Express Delivery',
      desc: 'Courier options at checkout',
    },
    {
      icon: RefreshCw,
      title: 'Return Policy',
      desc: 'See terms before ordering',
    },
    {
      icon: Award,
      title: 'Quality Focused',
      desc: 'Curated everyday essentials',
    },
  ];

  return (
    <section className="border-y border-slate-200/80 bg-white py-4 sm:py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {badges.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/60 sm:bg-transparent"
              >
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {b.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
