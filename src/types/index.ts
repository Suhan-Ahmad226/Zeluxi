export type Language = 'en';

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  barcode?: string;
  imageUrl?: string;
  attributes: Record<string, string>; // e.g. { size: 'L', color: 'Caramel' }
}

export interface ProductReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  subcategory?: string;
  description: string;
  shortDescription?: string;
  brand?: string;
  barcode?: string;
  productType?: 'physical' | 'digital' | 'service';
  condition?: 'new' | 'refurbished';
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  /** Stable Cloudinary identifiers for safe replacement and cleanup. */
  imagePublicIds?: string[];
  videoUrl?: string;
  videoPublicId?: string;
  featured: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFlashDeal?: boolean;
  rating: number;
  reviewCount: number;
  variants: ProductVariant[];
  specifications: Record<string, string>;
  tags: string[];
  published: boolean;
  archived?: boolean;
  weightKg?: number;
  dimensions?: string;
  shippingClass?: string;
  taxClass?: string;
  countryOfOrigin?: string;
  warrantyPolicy?: string;
  returnPolicy?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  taxRate?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  imagePublicId?: string;
  itemCount: number;
  order?: number;
  isActive?: boolean;
  parentId?: string | null;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantLabel?: string;
  variantSku?: string;
  variantAttributes?: Record<string, string>;
  stock: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export interface QuestionAnswer {
  id: string;
  productId: string;
  userName: string;
  question: string;
  answer?: string;
  answeredAt?: string;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  division?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  joinedDate: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  notes?: string;
}

export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'SSLCOMMERZ';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';

export type CourierProvider = 'PATHAO' | 'STEADFAST' | 'IN_HOUSE';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  upazila?: string;
  /** Legacy address key retained for previously saved orders. */
  thanaCity?: string;
  addressDetails: string;
  postalCode?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantLabel?: string;
  variantId?: string;
  variantSku?: string;
  variantAttributes?: Record<string, string>;
  /** Product details captured at purchase time for historically accurate invoices. */
  productSku?: string;
  brand?: string;
  description?: string;
  barcode?: string;
  specifications?: Record<string, string>;
  price: number;
  quantity: number;
  image: string;
}

export type CourierBookingStatus =
  | 'NOT_BOOKED'
  | 'BOOKING_IN_PROGRESS'
  | 'BOOKED'
  | 'BOOKING_FAILED'
  | 'BOOKING_UNKNOWN';

export interface CourierBookingAttempt {
  attemptId: string;
  timestamp: string;
  courier: CourierProvider;
  success: boolean;
  consignmentId?: string;
  trackingCode?: string;
  statusCode?: number;
  responsePayload?: any;
  errorMessage?: string;
}

export interface Order {
  /** Internal UUID used for database relationships and authenticated API operations. */
  id: string;
  /** Human-readable customer-facing order number, e.g. ZLX-000125. */
  orderNumber?: string;
  createdAt: string;
  customer: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  grandTotal: number;
  couponCode?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  courier: {
    provider: CourierProvider;
    trackingCode: string;
    consignmentId?: string;
    estimatedDelivery: string;
    bookingStatus?: CourierBookingStatus;
    bookingError?: string;
    bookedAt?: string;
    lastSyncedAt?: string;
    deliveryFee?: number;
    hubLocation?: string;
  };
  bookingAttempts?: CourierBookingAttempt[];
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note: string;
  }[];
}

export interface Coupon {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minSpend: number;
  description: string;
  expiresAt: string;
  usageCount: number;
  maxUsage?: number;
  active: boolean;
  usedBy?: string[];
  perUserLimit?: number;
}

export interface CMSBanner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
  imageUrl: string;
  active: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  /** Optional storefront footer content controlled by administrators. */
  footerDescription?: string;
  footerCopyright?: string;
  whatsappNumber?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  showPhoneInFooter?: boolean;
  showEmailInFooter?: boolean;
  showAddressInFooter?: boolean;
  showSocialLinksInFooter?: boolean;
  showPaymentBadgesInFooter?: boolean;
  footerPaymentMethods?: string[];
  currencySymbol: string;
  freeShippingThreshold: number;
  shippingDhaka: number;
  shippingOutsideDhaka: number;
  sameDayExpressDhaka: number;
  codFee: number;
  announcementActive: boolean;
  announcementText: string;
  pathaoApiKeyConfigured: boolean;
  steadfastApiKeyConfigured: boolean;
  bkashMerchantConfigured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  maintenanceMode?: boolean;
  /** Optional visibility controls for footer sections. */
  footerShowContact?: boolean;
  footerShowNavigation?: boolean;
  footerShowCustomerCare?: boolean;
  footerShowPaymentDelivery?: boolean;
  footerShowPwaInstall?: boolean;
}

export interface StaticPageContent {
  /** Stable URL path segment, normalized to lowercase kebab-case. */
  slug: string;
  title: string;
  content: string;
  lastUpdated: string;
  isPublished: boolean;
  /** Optional search and social metadata. */
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  /** Navigation is opt-in so private/landing pages are not exposed by default. */
  showInHeader?: boolean;
  showInFooter?: boolean;
  navigationLabel?: string;
  navigationGroup?: 'company' | 'customer-care' | 'legal' | 'custom';
  navigationOrder?: number;
}

export interface HeroBannerContent {
  tagline: string;
  headline: string;
  description: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  imageUrl: string;
  /** Cloudinary asset identifiers stored with CMS metadata. */
  imagePublicId?: string;
  mobileImagePublicId?: string;
  highlightTitle: string;
  highlightSubtitle: string;
  highlightPrice: string;
  primaryButtonLink?: string;
  secondaryButtonLink?: string;
  mobileImageUrl?: string;
}

export interface HeroBannerItem extends HeroBannerContent {
  id: string;
  active: boolean;
  order: number;
}

export interface StorefrontCMS {
  /** Legacy single-hero fields kept for backwards compatibility with saved CMS records. */
  hero: HeroBannerContent;
  /** Optional multi-banner collection. When absent, the legacy hero is rendered. */
  banners?: HeroBannerItem[];
  announcement: {
    active: boolean;
    text: string;
  };
  sectionVisibility: {
    hero: boolean;
    trustBadges: boolean;
    categories: boolean;
    featured: boolean;
    deals: boolean;
    allProducts: boolean;
    recentlyViewed: boolean;
  };
}
