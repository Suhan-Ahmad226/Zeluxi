import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ArrowRight } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { categories, setActiveView, setSelectedCategoryFilter, storefrontCMS } = useStore();
  const hero = storefrontCMS?.hero;

  const handleExplore = () => {
    setActiveView('shop');
    setSelectedCategoryFilter(null);
  };

  const tagline = hero?.tagline || 'Atelier Collection';
  const headline = hero?.headline || 'Quiet luxury in handcrafted essentials';
  const description = hero?.description || 'Vegetable-tanned leather, organic linen apparel, and automatic timepieces.';
  const primaryBtn = hero?.primaryButtonText || 'Explore collection';
  const secondaryBtn = hero?.secondaryButtonText || 'Leather studio';
  const heroImg = hero?.imageUrl || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80';
  const highlightTitle = hero?.highlightTitle || 'Atelier Highlight';
  const highlightSubtitle = hero?.highlightSubtitle || 'Full-Grain Leather Weekender Duffel';
  const highlightPrice = hero?.highlightPrice || '৳6,850 BDT · Ready to Dispatch';

  return (
    <section className="relative overflow-hidden bg-slate-900 text-white py-16 sm:py-24">
      {/* Decorative gradient atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 opacity-95" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Content */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
              <span>{tagline}</span>
              <span aria-hidden="true">·</span>
              <span>2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight text-balance">
              {headline}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              {description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleExplore}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-sm whitespace-nowrap active:scale-95"
              >
                <span>{primaryBtn}</span>
                <ArrowRight className="w-4 h-4 text-slate-900" />
              </button>

              <button
                onClick={() => {
                  const leatherCategory = categories.find((category) => /leather/i.test(`${category.name} ${category.slug}`) && category.isActive !== false);
                  setActiveView('shop');
                  setSelectedCategoryFilter(leatherCategory?.slug ?? null);
                }}
                className="px-5 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-slate-500 transition-colors whitespace-nowrap"
              >
                {secondaryBtn}
              </button>
            </div>
          </div>

          {/* Right Campaign Showcase Visual */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-800 aspect-[4/3] group">
              <img
                src={heroImg}
                alt={highlightSubtitle}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-left">
                <p className="text-xs uppercase tracking-wider text-amber-300 font-semibold mb-1">
                  {highlightTitle}
                </p>
                <p className="text-sm font-semibold text-white">
                  {highlightSubtitle}
                </p>
                <p className="text-xs text-slate-300 font-mono mt-0.5">{highlightPrice}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
