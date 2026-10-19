'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Heart, Minus, Plus, Share2, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { StoreImage } from '../common/StoreImage';
import { ProductCard } from './ProductCard';

interface ProductDetailsPageProps {
  slug: string;
}

export const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({ slug }) => {
  const {
    products,
    addToCart,
    addRecentlyViewed,
    wishlist,
    toggleWishlist,
    setIsCheckoutOpen,
    showToast,
  } = useStore();

  const [fetchedProduct, setFetchedProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const product = products.find((item) => item.slug === slug) || fetchedProduct;
  const selectedVariant = product?.variants.find((variant) => variant.id === selectedVariantId);
  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const isOutOfStock = currentStock <= 0;
  const requiresVariantSelection = Boolean(product?.variants.length && !selectedVariant);
  const isWishlisted = product ? wishlist.includes(product.id) : false;

  useEffect(() => {
    let cancelled = false;
    const findProduct = async () => {
      const existing = products.find((item) => item.slug === slug);
      if (existing) {
        setFetchedProduct(existing);
        setIsLoadingProduct(false);
        return;
      }

      setIsLoadingProduct(true);
      setLoadError(false);
      try {
        let offset = 0;
        let found: Product | undefined;
        let hasMore = true;
        while (!found && hasMore && offset <= 100000) {
          const response = await fetch(`/api/products?limit=48&offset=${offset}`, { cache: 'no-store' });
          if (!response.ok) throw new Error('Unable to load product catalog.');
          const payload = await response.json();
          const pageProducts = Array.isArray(payload.products) ? payload.products as Product[] : [];
          found = pageProducts.find((item) => item.slug === slug);
          hasMore = Boolean(payload.pagination?.hasMore);
          offset = Number(payload.pagination?.nextOffset ?? offset + pageProducts.length);
          if (!pageProducts.length) hasMore = false;
        }
        if (!cancelled) {
          setFetchedProduct(found || null);
          setLoadError(!found);
          setIsLoadingProduct(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setIsLoadingProduct(false);
        }
      }
    };

    void findProduct();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    setActiveImageIndex(0);
    setSelectedVariantId('');
    setQuantity(Math.max(1, product.minOrderQuantity || 1));
    addRecentlyViewed(product.id);
  }, [product?.id]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((item) => item.id !== product.id && item.published && !item.archived &&
        (item.category === product.category || item.tags.some((tag) => product.tags.includes(tag))))
      .slice(0, 4);
  }, [products, product?.id]);

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, selectedVariantId || undefined, quantity);
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, selectedVariantId || undefined, quantity);
    setIsCheckoutOpen(true);
  };

  const handleShare = async () => {
    if (!product) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.shortDescription || product.description, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast('Product link copied to clipboard', 'success');
      } else {
        showToast('Copy this product URL from your browser address bar.', 'info');
      }
    } catch {
      // Sharing can be cancelled by the customer.
    }
  };

  if (isLoadingProduct) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-live="polite">
        <div className="h-5 w-36 rounded bg-slate-200 animate-pulse mb-8" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
          <div className="space-y-4"><div className="h-8 w-3/4 rounded bg-slate-200 animate-pulse" /><div className="h-6 w-1/3 rounded bg-slate-200 animate-pulse" /><div className="h-28 rounded bg-slate-200 animate-pulse" /></div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{loadError ? 'Product not found' : 'This product is unavailable'}</h1>
        <p className="mt-3 text-sm text-slate-500">It may have been removed, unpublished, or the link may be incorrect.</p>
        <Link href="/shop" className="inline-flex mt-6 items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"><ArrowLeft className="w-4 h-4" /> Back to shop</Link>
      </section>
    );
  }

  const images = product.images?.filter(Boolean) || [];
  const activeImage = images[activeImageIndex] || images[0] || '';
  const specs = Object.entries(product.specifications || {});
  const minQuantity = Math.max(1, product.minOrderQuantity || 1);
  const maxQuantity = Math.max(minQuantity, product.maxOrderQuantity || 99);

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-slate-900">Shop</Link><span>/</span>
          <span className="text-slate-800 truncate max-w-[60vw]" aria-current="page">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
          <section className="min-w-0">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-slate-100">
              {activeImage ? <StoreImage src={activeImage} alt={product.name} preset="product-detail" className="block w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-slate-400">No product image available</div>}
              {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                <span className="absolute left-4 top-4 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                  Save {Math.round(((product.compareAtPrice - currentPrice) / product.compareAtPrice) * 100)}%
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2">
                {images.map((image, index) => (
                  <button key={image + index} type="button" onClick={() => setActiveImageIndex(index)} aria-label={`View product image ${index + 1}`} aria-pressed={activeImageIndex === index} className={`aspect-square overflow-hidden rounded-lg border-2 bg-slate-50 ${activeImageIndex === index ? 'border-slate-900' : 'border-transparent hover:border-slate-300'}`}>
                    <StoreImage src={image} alt={`${product.name}, image ${index + 1}`} preset="thumbnail" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{product.category}</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">{product.name}</h1>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => toggleWishlist(product.id)} aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} className={`rounded-full border p-2.5 ${isWishlisted ? 'border-rose-200 text-rose-600 bg-rose-50' : 'border-slate-200 text-slate-600 hover:text-rose-600'}`}><Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} /></button>
                <button type="button" onClick={handleShare} aria-label="Share product" className="rounded-full border border-slate-200 p-2.5 text-slate-600 hover:text-slate-950"><Share2 className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="flex items-center gap-1 font-medium text-slate-700"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {product.rating.toFixed(1)} <span className="text-slate-500">({product.reviewCount} reviews)</span></span>
              <span className="text-slate-300">|</span><span className="text-slate-500">SKU: {selectedVariant?.sku || product.sku}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight text-slate-950">{formatPrice(currentPrice)}</span>
              {product.compareAtPrice && product.compareAtPrice > currentPrice && <span className="text-lg text-slate-400 line-through">{formatPrice(product.compareAtPrice)}</span>}
            </div>
            {product.shortDescription && <p className="mt-4 text-sm leading-6 text-slate-600">{product.shortDescription}</p>}

            {product.variants.length > 0 && (
              <div className="mt-6">
                <label htmlFor="product-variant" className="block text-sm font-semibold text-slate-900 mb-2">Choose option</label>
                <select id="product-variant" value={selectedVariantId} onChange={(event) => { setSelectedVariantId(event.target.value); setQuantity(Math.max(1, product.minOrderQuantity || 1)); }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none">
                  <option value="">Select an option</option>
                  {product.variants.map((variant) => <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>{[variant.name, ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`)].filter(Boolean).join(' · ')}{variant.stock <= 0 ? ' (Out of stock)' : ''} · {formatPrice(variant.price)} · SKU: {variant.sku}</option>)}
                </select>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className={`flex items-center gap-2 text-sm font-medium ${isOutOfStock ? 'text-rose-600' : currentStock <= product.lowStockThreshold ? 'text-amber-700' : 'text-emerald-700'}`}>
                <span className={`h-2 w-2 rounded-full ${isOutOfStock ? 'bg-rose-500' : currentStock <= product.lowStockThreshold ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {requiresVariantSelection ? 'Choose an option to see stock' : isOutOfStock ? 'Out of stock' : currentStock <= product.lowStockThreshold ? `Only ${currentStock} left` : 'In stock'}
              </div>
              <div className="flex items-center rounded-lg border border-slate-200">
                <button type="button" onClick={() => setQuantity((value) => Math.max(minQuantity, value - 1))} disabled={quantity <= minQuantity} aria-label="Decrease quantity" className="p-2.5 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                <span className="min-w-9 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, currentStock, value + 1))} disabled={quantity >= maxQuantity || quantity >= currentStock} aria-label="Increase quantity" className="p-2.5 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={handleAddToCart} disabled={requiresVariantSelection || isOutOfStock || quantity > currentStock} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900 px-5 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBag className="h-4 w-4" /> Add to cart</button>
              <button type="button" onClick={handleBuyNow} disabled={isOutOfStock || quantity > currentStock} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Buy now <Check className="h-4 w-4" /></button>
            </div>

            <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
              <div className="flex items-center gap-3 py-4 text-sm text-slate-700"><Truck className="h-5 w-5 shrink-0 text-slate-500" /><span>Nationwide delivery across Bangladesh</span></div>
              <div className="flex items-center gap-3 py-4 text-sm text-slate-700"><ShieldCheck className="h-5 w-5 shrink-0 text-slate-500" /><span>Secure checkout and order support</span></div>
            </div>
          </section>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-200 pt-8">
          <section className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-950">Product details</h2>
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{product.description || product.shortDescription || 'More product details will be added soon.'}</div>
            {product.warrantyPolicy && <div className="mt-6"><h3 className="font-semibold text-slate-900">Warranty</h3><p className="mt-2 text-sm leading-6 text-slate-600 whitespace-pre-line">{product.warrantyPolicy}</p></div>}
            {product.returnPolicy && <div className="mt-6"><h3 className="font-semibold text-slate-900">Returns</h3><p className="mt-2 text-sm leading-6 text-slate-600 whitespace-pre-line">{product.returnPolicy}</p></div>}
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-950">Specifications</h2>
            {specs.length ? <dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">{specs.map(([key, value]) => <div key={key} className="grid grid-cols-2 gap-3 py-3 text-sm"><dt className="text-slate-500">{key}</dt><dd className="text-right font-medium text-slate-800 break-words">{value}</dd></div>)}</dl> : <p className="mt-3 text-sm text-slate-500">No specifications provided for this product.</p>}
          </section>
        </div>

        {relatedProducts.length > 0 && <section className="mt-14 border-t border-slate-200 pt-8"><div className="flex items-end justify-between gap-4 mb-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">You may also like</p><h2 className="mt-1 text-xl font-bold text-slate-950">Related products</h2></div><Link href="/shop" className="text-sm font-semibold text-slate-700 hover:text-black">View all</Link></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
      </div>
    </div>
  );
};
