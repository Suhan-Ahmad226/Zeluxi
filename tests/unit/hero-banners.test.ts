import test from 'node:test';
import assert from 'node:assert/strict';
import { getHeroBanners, heroContentFromBanner, isSafeHeroLink } from '../../src/lib/heroBanners';
import type { StorefrontCMS } from '../../src/types';

const legacyCMS: StorefrontCMS = {
  hero: {
    tagline: 'Zelux',
    headline: 'Legacy headline',
    description: 'Legacy description',
    primaryButtonText: 'Shop now',
    secondaryButtonText: '',
    imageUrl: 'https://cdn.example.com/hero.webp',
    highlightTitle: '',
    highlightSubtitle: '',
    highlightPrice: '',
  },
  announcement: { active: false, text: '' },
  sectionVisibility: {
    hero: true,
    trustBadges: false,
    categories: true,
    featured: true,
    deals: false,
    allProducts: true,
    recentlyViewed: false,
  },
};

test('legacy CMS records remain renderable as a single hero banner', () => {
  const banners = getHeroBanners(legacyCMS);
  assert.equal(banners.length, 1);
  assert.equal(banners[0].id, 'legacy-hero');
  assert.equal(banners[0].headline, 'Legacy headline');
  assert.equal(banners[0].active, true);
});

test('multi-banner CMS records are sorted by order and preserve per-banner settings', () => {
  const cms: StorefrontCMS = {
    ...legacyCMS,
    banners: [
      { id: 'second', order: 1, active: false, ...legacyCMS.hero },
      { id: 'first', order: 0, active: true, ...legacyCMS.hero, headline: 'First slide' },
    ],
  };
  const banners = getHeroBanners(cms);
  assert.deepEqual(banners.map((banner) => banner.id), ['first', 'second']);
  assert.equal(banners[1].active, false);
  assert.equal(heroContentFromBanner(banners[0]).headline, 'First slide');
});

test('hero links allow same-site paths and HTTPS URLs but reject unsafe schemes', () => {
  assert.equal(isSafeHeroLink('/shop?category=bags'), true);
  assert.equal(isSafeHeroLink('https://example.com/campaign'), true);
  assert.equal(isSafeHeroLink('//evil.example/path'), false);
  assert.equal(isSafeHeroLink('javascript:alert(1)'), false);
  assert.equal(isSafeHeroLink('\\\\evil.example'), false);
  assert.equal(isSafeHeroLink(''), false);
});
