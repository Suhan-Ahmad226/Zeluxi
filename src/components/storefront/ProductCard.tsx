import React from 'react';
import { useRouter } from 'next/navigation';

import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/formatters';
import { StoreImage } from '../common/StoreImage';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();
  const {
    addToCart,
    addRecentlyViewed,
    wishlist,
    toggleWishlist,
  } = useStore();

  const isWishlisted = wishlist.includes(product.id);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, product.variants[0]?.id, 1);
  };

  const handleCardClick = () => {
    addRecentlyViewed(product.id);
    const slug = product.slug || product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    router.push(`/products/${encodeURIComponent(slug)}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Product Image Zone */}
      <div className="relative aspect-[4/3] bg-[#F8F9FA] overflow-hidden">
        <StoreImage
          src={product.images?.[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors ${
            isWishlisted
              ? 'bg-rose-50 text-rose-600 shadow-sm'
              : 'bg-white/80 text-slate-600 hover:text-rose-600 hover:bg-white'
          }`}
          aria-label="Wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Subtle status tag */}
        <div className="absolute bottom-2.5 left-2.5">
          {isOutOfStock ? (
            <span className="text-[11px] font-semibold text-rose-600 bg-white/95 px-2 py-0.5 rounded shadow-xs">
              Out of stock
            </span>
          ) : isLowStock ? (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50/95 px-2 py-0.5 rounded shadow-xs">
              Only {product.stock} left
            </span>
          ) : product.isFlashDeal ? (
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50/95 px-2 py-0.5 rounded shadow-xs">
              Deal
            </span>
          ) : product.isNewArrival ? (
            <span className="text-[11px] font-semibold text-slate-800 bg-white/95 px-2 py-0.5 rounded shadow-xs">
              New
            </span>
          ) : null}
        </div>

        {/* Quick View Hover overlay action */}
        <div className="absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 text-xs font-medium rounded-lg shadow-xs">
            <Eye className="w-3.5 h-3.5" />
            <span>Quick view</span>
          </span>
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2.5 sm:gap-3">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="uppercase tracking-wider text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
              {product.category}
            </span>
            <div className="flex items-center gap-1 text-slate-700 shrink-0 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs">{product.rating}</span>
              <span className="text-slate-400 text-[10px] sm:text-[11px]">({product.reviewCount})</span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-base font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>

          {/* Clean metadata separator */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="font-mono text-[10px] sm:text-[11px]">{product.sku}</span>
            {product.variants.length > 1 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[10px] sm:text-xs">{product.variants.length} variants</span>
              </>
            )}
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto gap-1.5 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-slate-400 line-through tabular-nums">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap active:scale-95 ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
            aria-label="Add to Bag"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isOutOfStock ? 'Out of stock' : 'Add'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
