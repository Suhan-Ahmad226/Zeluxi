import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from './ProductCard';
import { X, Sparkles, Flame, Check, ArrowUpDown } from 'lucide-react';

interface ProductGridProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  featuredOnly?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  title,
  subtitle,
  limit,
  featuredOnly = false,
}) => {
  const {
    products,
    categories,
    catalogHasMore,
    isLoadingMoreProducts,
    loadMoreProducts,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    activeFilterTab,
    setActiveFilterTab,
    searchQuery,
    setSearchQuery,
  } = useStore();

  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const [priceRange, setPriceRange] = useState<'all' | 'under-2000' | '2000-5000' | 'above-5000'>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(limit ?? 8);

  // Reset pagination whenever filters change.
  useEffect(() => {
    setVisibleCount(limit ?? 8);
  }, [limit, featuredOnly, selectedCategoryFilter, activeFilterTab, inStockOnly, priceRange, searchQuery, sortBy]);

  const filteredProducts = useMemo(() => {
    const categoryMatches = (product: (typeof products)[number]) => {
      if (!selectedCategoryFilter || featuredOnly) return true;
      const selected = categories.find((category) => category.slug === selectedCategoryFilter);
      if (!selected) return true;
      const matchingValues = new Set<string>([selected.id, selected.slug, selected.name]);
      let foundDescendant = true;
      while (foundDescendant) {
        foundDescendant = false;
        for (const category of categories) {
          if (category.parentId && matchingValues.has(category.parentId) && !matchingValues.has(category.id)) {
            matchingValues.add(category.id);
            matchingValues.add(category.slug);
            matchingValues.add(category.name);
            foundDescendant = true;
          }
        }
      }
      return matchingValues.has(product.category) || matchingValues.has(product.subcategory || '');
    };
    return products.filter((p) => {
      if (!p.published || p.archived) return false;
      if (featuredOnly) return p.featured;
      if (activeFilterTab === 'new-arrivals' && !p.isNewArrival) return false;
      if (activeFilterTab === 'best-sellers' && !p.isBestSeller) return false;
      if (activeFilterTab === 'deals' && !p.isFlashDeal && (!p.compareAtPrice || p.compareAtPrice <= p.price)) return false;
      if (activeFilterTab === 'featured' && !p.featured) return false;
      if (!categoryMatches(p)) return false;
      if (inStockOnly && p.stock <= 0) return false;
      if (priceRange === 'under-2000' && p.price >= 2000) return false;
      if (priceRange === '2000-5000' && (p.price < 2000 || p.price > 5000)) return false;
      if (priceRange === 'above-5000' && p.price <= 5000) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchSubcategory = (p.subcategory || '').toLowerCase().includes(q);
        const matchTags = p.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchName && !matchSku && !matchCat && !matchSubcategory && !matchTags) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  }, [products, categories, selectedCategoryFilter, activeFilterTab, inStockOnly, priceRange, searchQuery, featuredOnly, sortBy]);

  const effectiveLimit = featuredOnly ? Math.min(limit ?? 4, 4) : visibleCount;
  const displayList = filteredProducts.slice(0, effectiveLimit);
  const hasMoreProducts = !featuredOnly && (displayList.length < filteredProducts.length || catalogHasMore);

  return (
    <section className="py-12 bg-white" id="main-product-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {featuredOnly ? 'Featured' : activeFilterTab === 'new-arrivals'
                  ? 'New arrivals'
                  : activeFilterTab === 'deals'
                  ? 'Deals'
                  : activeFilterTab === 'best-sellers'
                  ? 'Best sellers'
                  : 'Catalog'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {filteredProducts.length} items
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {title || 'Signature collection'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {subtitle || 'Carefully crafted for durability and timeless appeal'}
            </p>
          </div>

          {!featuredOnly && (
            /* Quick Filter Buttons & Sort */
            <div className="flex flex-wrap items-center gap-3">
            {/* Quick Segmented Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveFilterTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeFilterTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilterTab('new-arrivals')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeFilterTab === 'new-arrivals'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>New</span>
              </button>
              <button
                onClick={() => setActiveFilterTab('best-sellers')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeFilterTab === 'best-sellers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Best Sellers
              </button>
              <button
                onClick={() => setActiveFilterTab('deals')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeFilterTab === 'deals'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 hover:text-rose-700'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Deals</span>
              </button>
            </div>

            {/* Price Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-slate-700">
              <span className="text-slate-400 font-bold">৳</span>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as any)}
                className="bg-transparent border-none text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">All Prices</option>
                <option value="under-2000">Under ৳2,000</option>
                <option value="2000-5000">৳2,000 - ৳5,000</option>
                <option value="above-5000">Over ৳5,000</option>
              </select>
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* In-stock Only Toggle */}
            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                inStockOnly
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                inStockOnly ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
              }`}>
                {inStockOnly && <Check className="w-2.5 h-2.5" />}
              </div>
              <span>In Stock</span>
            </button>
          </div>
          )}
        </div>

        {!featuredOnly && (
          <>
            {/* Categories Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                  selectedCategoryFilter === null
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Categories
              </button>
              {categories.filter((category) => category.isActive !== false).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.slug)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                    selectedCategoryFilter === c.slug
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Active search filter banner */}
            {searchQuery && (
              <div className="mb-6 flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-900">
                <span>
                  Showing search results for: <strong>"{searchQuery}"</strong> ({filteredProducts.length} found)
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear search</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {displayList.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-base font-semibold text-slate-800">
              No items match your criteria
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your price range, stock filter, or selecting a different category.
            </p>
            {!featuredOnly && (
              <button
                onClick={() => {
                  setSelectedCategoryFilter(null);
                  setActiveFilterTab('all');
                  setPriceRange('all');
                  setInStockOnly(false);
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          /* Grid: 2-column mobile, 3-column tablet, 4-column desktop */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {hasMoreProducts && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={isLoadingMoreProducts}
              onClick={() => {
                setVisibleCount((current) => current + 8);
                if (visibleCount + 8 >= products.length && catalogHasMore) void loadMoreProducts();
              }}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoadingMoreProducts ? 'Loading…' : 'Load More'}
              {!isLoadingMoreProducts && <span className="ml-2 text-slate-500">({Math.max(0, filteredProducts.length - displayList.length)} more in loaded results)</span>}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
