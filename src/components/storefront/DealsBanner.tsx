import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Tag, Copy, Check } from 'lucide-react';

export const DealsBanner: React.FC = () => {
  const { coupons, showToast } = useStore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeCoupons = (coupons || []).filter((coupon) => {
    const expiry = Date.parse(coupon.expiresAt);
    const hasValidExpiry = Number.isFinite(expiry) && expiry > Date.now();
    const hasUsageRemaining = coupon.maxUsage == null || coupon.usageCount < coupon.maxUsage;
    return coupon.active && hasValidExpiry && hasUsageRemaining;
  });

  const handleCopy = async (code: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showToast(`Code "${code}" copied to clipboard`, 'success');
      window.setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      showToast('Could not copy the code. Please copy it manually.', 'error');
    }
  };

  if (activeCoupons.length === 0) return null;

  return (
    <section className="py-8 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-7">
          {/* Left Title */}
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Tag className="w-3.5 h-3.5" />
              <span>Coupons & savings</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Active promotion codes
            </h3>

            <p className="text-xs text-slate-300 max-w-md">
              Apply these codes at checkout for instant discounts on your order.
            </p>
          </div>

          {/* Right Coupon Chips with One-click Copy */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {activeCoupons.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2.5 transition-colors"
              >
                <div>
                  <span className="text-xs font-mono font-bold text-amber-400 block">{c.code}</span>
                  <span className="text-[11px] text-slate-300">
                    {c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `৳${c.value} OFF`} (Min. ৳{c.minSpend.toLocaleString()})
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(c.code)}
                  className="p-1.5 bg-white text-slate-900 rounded-md hover:bg-slate-100 transition-colors shadow-xs"
                  title="Copy Code"
                  aria-label={`Copy coupon code ${c.code}`}
                >
                  {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
