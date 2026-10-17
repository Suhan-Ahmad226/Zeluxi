import React from 'react';
import { useStore } from '../../context/StoreContext';
import { StoreImage } from '../common/StoreImage';
import { formatPrice } from '../../utils/formatters';
import { Eye } from 'lucide-react';

export const RecentlyViewedBar: React.FC = () => {
  const { recentlyViewed, products, setSelectedProduct } = useStore();

  const viewedProducts = recentlyViewed.map((id) => products.find((product) => product.id === id))
    .filter((product): product is (typeof products)[number] => Boolean(product?.published && !product.archived));

  if (viewedProducts.length === 0) return null;

  return (
    <section className="py-8 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Recently Viewed
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {viewedProducts.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className="group text-left bg-white p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={`View ${p.name}`}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-2">
                <img
                  src={p.images[0]}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-800 truncate">{p.name}</p>
                <p className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatPrice(p.price)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
