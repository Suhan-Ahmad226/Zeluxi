import type { HeroBannerContent, HeroBannerItem, StorefrontCMS } from '../types';

export const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=80';

export function getHeroBanners(cms: StorefrontCMS): HeroBannerItem[] {
  if (Array.isArray(cms.banners)) {
    return cms.banners
      .filter((banner) => banner && typeof banner.id === 'string')
      .map((banner, index) => ({
        ...banner,
        active: banner.active !== false,
        order: Number.isFinite(banner.order) ? banner.order : index,
      }))
      .sort((a, b) => a.order - b.order);
  }

  if (!cms.hero) return [];
  return [{
    id: 'legacy-hero',
    active: true,
    order: 0,
    ...cms.hero,
    primaryButtonLink: cms.hero.primaryButtonLink || '',
    secondaryButtonLink: cms.hero.secondaryButtonLink || '',
    mobileImageUrl: cms.hero.mobileImageUrl || '',
  }];
}

export function heroContentFromBanner(banner: HeroBannerItem): HeroBannerContent {
  const { id: _id, active: _active, order: _order, ...content } = banner;
  return content;
}

export function isSafeHeroLink(value?: string): boolean {
  if (!value) return false;
  const link = value.trim();
  return (link.startsWith('/') && !link.startsWith('//') && !link.includes('\\')) ||
    /^https:\/\//i.test(link);
}
