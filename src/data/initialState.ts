import {
  Product,
  Category,
  Order,
  Coupon,
  StoreSettings,
  AuditLog,
  ProductReview,
  QuestionAnswer,
  CustomerRecord,
  StaticPageContent,
  StorefrontCMS,
} from '../types';

/**
 * Empty production bootstrap state.
 *
 * Business records must be loaded from the configured database/API. Do not seed
 * fake products, customers, orders, reviews, payment records, or courier events
 * into a real storefront.
 */
export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Zelux',
  tagline: '',
  phone: '',
  email: '',
  address: '',
  currencySymbol: '৳',
  freeShippingThreshold: 3500,
  shippingDhaka: 60,
  shippingOutsideDhaka: 120,
  sameDayExpressDhaka: 150,
  codFee: 0,
  announcementActive: false,
  announcementText: '',
  pathaoApiKeyConfigured: false,
  steadfastApiKeyConfigured: false,
  bkashMerchantConfigured: false,
  footerShowContact: true,
  footerShowNavigation: true,
  footerShowCustomerCare: true,
  footerShowPaymentDelivery: true,
  footerShowPwaInstall: true,
  footerShowSocialLinks: true,
  footerFacebookUrl: '',
  footerInstagramUrl: '',
  footerTikTokUrl: '',
  footerYouTubeUrl: '',
  footerWhatsAppNumber: '',
  footerCopyrightText: '',
};

export const INITIAL_CATEGORIES: Category[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_COUPONS: Coupon[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_REVIEWS: ProductReview[] = [];
export const INITIAL_QUESTIONS: QuestionAnswer[] = [];
export const INITIAL_CUSTOMERS: CustomerRecord[] = [];
export const INITIAL_PAGES: StaticPageContent[] = [];

export const INITIAL_STOREFRONT_CMS: StorefrontCMS = {
  hero: {
    tagline: 'Zelux Atelier',
    headline: 'Thoughtfully made for everyday living.',
    description: '',
    primaryButtonText: 'Shop collection',
    secondaryButtonText: '',
    imageUrl: '',
    highlightTitle: '',
    highlightSubtitle: '',
    highlightPrice: '',
  },
  banners: [
    {
      id: 'hero-default',
      active: true,
      order: 0,
      tagline: 'Zelux Atelier',
      headline: 'Thoughtfully made for everyday living.',
      description: '',
      primaryButtonText: 'Shop collection',
      secondaryButtonText: '',
      imageUrl: '',
      highlightTitle: '',
      highlightSubtitle: '',
      highlightPrice: '',
      primaryButtonLink: '',
      secondaryButtonLink: '',
      mobileImageUrl: '',
    },
  ],
  announcement: {
    active: false,
    text: '',
  },
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
