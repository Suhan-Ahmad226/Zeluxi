import React from 'react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/formatters';
import { StoreImage } from '../common/StoreImage';
import { X, ShoppingBag, Trash2 } from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

export const ProductCompareModal: React.FC = () => {
  const {
    compareList,
    products,
    isCompareOpen,
    setIsCompareOpen,
    toggleCompare,
    clearCompare,
    addToCart,
  } = useStore();

  if (!isCompareOpen) return null;

  const compareProducts = products.filter((p) => compareList.includes(p.id));

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Product Comparison
            </h3>
            <p className="text-xs text-slate-500">
              {compareProducts.length} of 3 items selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            {compareProducts.length > 0 && (
              <button
                onClick={clearCompare}
                className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium px-2 py-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={() => setIsCompareOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {compareProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <p className="text-sm font-semibold text-slate-700">No items selected for comparison.</p>
              <p className="text-xs text-slate-400">Add products by clicking the compare button on any product card or details view.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              {compareProducts.map((p) => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-slate-50/50">
                  <div className="space-y-3">
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-white border border-slate-200">
                      <StoreImage src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      <button
                        onClick={() => toggleCompare(p.id)}
                        className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white text-slate-600 rounded-full shadow-sm"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{p.category}</span>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5">{p.name}</h4>
                      <p className="text-sm font-bold text-indigo-700 mt-1 tabular-nums">
                        {formatPrice(p.price)}
                      </p>
                    </div>

                    {/* Attribute list */}
                    <div className="space-y-2 pt-3 border-t border-slate-200 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">SKU Code</span>
                        <span className="font-mono font-semibold text-slate-700">{p.sku}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Availability</span>
                        <span className={`font-semibold ${p.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {p.stock > 0 ? `In Stock (${p.stock} units)` : 'Sold Out'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Rating</span>
                        <span className="font-semibold text-slate-800">★ {p.rating} ({p.reviewCount} reviews)</span>
                      </div>
                      {Object.entries(p.specifications).slice(0, 3).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-slate-400 block">{key}</span>
                          <span className="font-medium text-slate-700">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addToCart(p, p.variants[0]?.id, 1);
                      setIsCompareOpen(false);
                    }}
                    disabled={p.stock <= 0}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Bag</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};
