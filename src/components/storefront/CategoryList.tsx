import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ArrowRight } from 'lucide-react';

export const CategoryList: React.FC = () => {
  const { categories, products, setSelectedCategoryFilter, setActiveView } = useStore();

  const visibleCategories = categories.filter((category) => category.isActive !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const getPublishedProductCount = (categoryId: string, categoryName: string, categorySlug: string) =>
    products.filter((product) => product.published && !product.archived && (
      product.category === categoryName || product.category === categoryId || product.category === categorySlug ||
      product.subcategory === categoryName || product.subcategory === categoryId || product.subcategory === categorySlug
    )).length;

  const handleSelect = (slug: string) => {
    setSelectedCategoryFilter(slug);
    setActiveView('shop');
  };

  return (
    <section className="py-12 bg-[#FAFAFA]" id="featured-categories-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Explore by department
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCategoryFilter(null);
              setActiveView('shop');
            }}
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.slug)}
              className="group text-left rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-slate-300 transition-all hover:shadow-md cursor-pointer flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[11px] font-mono text-indigo-200">
                    {getPublishedProductCount(cat.id, cat.name, cat.slug)} Items
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-white leading-tight">
                    {cat.name}
                  </h3>
                </div>
              </div>
              <div className="p-3 bg-white">
                <p className="text-[11px] text-slate-500 line-clamp-1 leading-snug">
                  {cat.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
