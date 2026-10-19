import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DEFAULT_HERO_IMAGE, getHeroBanners, isSafeHeroLink } from '../../lib/heroBanners';
import { generateSrcSet, getOptimizedImageUrl } from '../../lib/cloudinary';
import { StoreImage } from '../common/StoreImage';
import type { HeroBannerItem } from '../../types';

export const HeroBanner: React.FC = () => {
  const { categories, setActiveView, setSelectedCategoryFilter, storefrontCMS } = useStore();
  const banners = getHeroBanners(storefrontCMS).filter((banner) => banner.active);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, banners.length - 1)));
  }, [banners.length]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener?.('change', updatePreference);
    return () => media.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    if (banners.length < 2 || isPaused || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % banners.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [banners.length, isPaused, prefersReducedMotion]);

  if (!storefrontCMS?.sectionVisibility?.hero || banners.length === 0) return null;

  const banner = banners[activeIndex] || banners[0];
  const handleExplore = () => {
    setActiveView('shop');
    setSelectedCategoryFilter(null);
  };
  const handleSecondaryAction = () => {
    const leatherCategory = categories.find(
      (category) => /leather/i.test(`${category.name} ${category.slug}`) && category.isActive !== false,
    );
    setActiveView('shop');
    setSelectedCategoryFilter(leatherCategory?.slug ?? null);
  };
  const moveTo = (index: number) => {
    setActiveIndex((index + banners.length) % banners.length);
  };
  const primaryLink = isSafeHeroLink(banner.primaryButtonLink) ? banner.primaryButtonLink : '';
  const secondaryLink = isSafeHeroLink(banner.secondaryButtonLink) ? banner.secondaryButtonLink : '';
  const originalImageUrl = banner.imageUrl || DEFAULT_HERO_IMAGE;
  // Cloudinary and Unsplash can deliver device-sized variants. Other hosted URLs stay unchanged.
  const imageUrl = getOptimizedImageUrl(originalImageUrl, {
    width: 1440,
    crop: 'fill',
    gravity: 'auto',
    format: 'auto',
    quality: 'auto',
  });
  const imageSrcSet = generateSrcSet(originalImageUrl, [320, 480, 640, 768, 1024, 1280, 1440], {
    crop: 'fill',
    gravity: 'auto',
  });
  const mobileImageSrcSet = banner.mobileImageUrl && isSafeHeroLink(banner.mobileImageUrl)
    ? generateSrcSet(banner.mobileImageUrl, [320, 480, 640, 768], { crop: 'fill', gravity: 'auto' })
    : '';
  const renderPrimaryButton = () => primaryLink ? (
    <a
      href={primaryLink}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-sm transition-colors hover:bg-slate-100 active:scale-[0.98] sm:text-sm"
    >
      <span>{banner.primaryButtonText || 'Explore collection'}</span>
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </a>
  ) : (
    <button
      type="button"
      onClick={handleExplore}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-sm transition-colors hover:bg-slate-100 active:scale-[0.98] sm:text-sm"
    >
      <span>{banner.primaryButtonText || 'Explore collection'}</span>
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </button>
  );
  const renderSecondaryButton = () => secondaryLink ? (
    <a
      href={secondaryLink}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white sm:text-sm"
    >
      {banner.secondaryButtonText || 'Discover more'}
    </a>
  ) : banner.secondaryButtonText ? (
    <button
      type="button"
      onClick={handleSecondaryAction}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white sm:text-sm"
    >
      {banner.secondaryButtonText}
    </button>
  ) : null;

  return (
    <section
      aria-label="Featured promotions"
      aria-roledescription={banners.length > 1 ? 'carousel' : undefined}
      className="relative isolate overflow-hidden bg-slate-900 py-6 text-white sm:py-10 lg:py-12"
      onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null || banners.length < 2) return;
        const touchX = event.changedTouches[0]?.clientX;
        if (touchX === undefined) {
          touchStartX.current = null;
          return;
        }
        const delta = touchX - touchStartX.current;
        if (Math.abs(delta) > 45) moveTo(activeIndex + (delta < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 opacity-95" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 space-y-5 lg:col-span-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">
              <span>{banner.tagline || 'Zelux Atelier'}</span>
              <span aria-hidden="true">·</span>
              <span>Curated for you</span>
            </div>

            <h1 className="max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {banner.headline || 'Thoughtfully made for everyday living.'}
            </h1>

            {banner.description && (
              <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                {banner.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {renderPrimaryButton()}
              {renderSecondaryButton()}
            </div>
          </div>

          <div className="relative min-w-0 lg:col-span-5">
            <div className="group relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800 shadow-2xl sm:aspect-[4/3] lg:aspect-[5/4]">
              <picture className="absolute inset-0 block h-full w-full">
                {banner.mobileImageUrl && isSafeHeroLink(banner.mobileImageUrl) && (
                  <source
                    media="(max-width: 639px)"
                    srcSet={mobileImageSrcSet || banner.mobileImageUrl}
                    sizes="(max-width: 639px) calc(100vw - 2rem), 40vw"
                  />
                )}
                <StoreImage
                  src={imageUrl}
                  preset="hero"
                  srcSet={imageSrcSet || undefined}
                  sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 3rem), 40vw"
                  alt={banner.highlightSubtitle || banner.headline || 'Featured Zelux collection'}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 block h-full w-full object-cover object-center"
                />
              </picture>
              {(banner.highlightTitle || banner.highlightSubtitle || banner.highlightPrice) && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              )}
              {(banner.highlightTitle || banner.highlightSubtitle || banner.highlightPrice) && (
                <div className="absolute bottom-4 left-4 right-4 text-left sm:bottom-5 sm:left-5 sm:right-5">
                  {banner.highlightTitle && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                      {banner.highlightTitle}
                    </p>
                  )}
                  {banner.highlightSubtitle && <p className="text-sm font-semibold text-white sm:text-base">{banner.highlightSubtitle}</p>}
                  {banner.highlightPrice && <p className="mt-0.5 font-mono text-xs text-slate-300">{banner.highlightPrice}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {banners.length > 1 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:mt-6">
            <div className="flex items-center gap-2" aria-label="Choose featured promotion">
              {banners.map((item: HeroBannerItem, index: number) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => moveTo(index)}
                  aria-label={`Show promotion ${index + 1}: ${item.headline || 'Featured promotion'}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${index === activeIndex ? 'w-8 bg-white' : 'w-2.5 bg-slate-500 hover:bg-slate-300'}`}
                />
              ))}
              <span className="ml-1 text-xs tabular-nums text-slate-400">{activeIndex + 1} / {banners.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused((paused) => !paused)}
                aria-label={isPaused ? 'Resume automatic banner rotation' : 'Pause automatic banner rotation'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {isPaused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => moveTo(activeIndex - 1)}
                aria-label="Previous banner"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveTo(activeIndex + 1)}
                aria-label="Next banner"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
