import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Product,
  Category,
  CartItem,
  Order,
  Coupon,
  StoreSettings,
  AuditLog,
  Language,
  ShippingAddress,
  PaymentMethod,
  CourierProvider,
  OrderStatus,
  ProductReview,
  QuestionAnswer,
  CustomerRecord,
  CourierBookingStatus,
  CourierBookingAttempt,
  StaticPageContent,
  StorefrontCMS,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_ORDERS,
  INITIAL_COUPONS,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_REVIEWS,
  INITIAL_QUESTIONS,
  INITIAL_CUSTOMERS,
  INITIAL_PAGES,
  INITIAL_STOREFRONT_CMS,
} from '../data/initialState';
import { getCourierProvider } from '../lib/shipping/couriers';
import { supabase } from '../lib/supabase';
import { getCloudinaryPublicId, persistProductImageUrls, removeProductImageUrls } from '../lib/productImageStorage';

interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface StoreContextType {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  wishlist: string[];
  orders: Order[];
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  settings: StoreSettings;
  auditLogs: AuditLog[];
  reviews: ProductReview[];
  questions: QuestionAnswer[];
  customers: CustomerRecord[];
  pages: StaticPageContent[];
  storefrontCMS: StorefrontCMS;
  recentlyViewed: string[];
  compareList: string[];
  isCompareOpen: boolean;
  isSizeGuideOpen: boolean;
  language: Language;
  activeView: 'store' | 'shop' | 'tracking' | 'account' | 'admin' | 'about' | 'verify-email';
  activeFilterTab: 'all' | 'new-arrivals' | 'best-sellers' | 'deals' | 'featured';
  selectedCategoryFilter: string | null;
  searchQuery: string;
  selectedProduct: Product | null;
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  lastCreatedOrder: Order | null;
  activeTrackingId: string | null;
  activeStaticPage: 'about' | 'support' | 'faq' | 'shipping' | 'refund' | 'privacy' | 'terms' | null;
  toast: ToastNotification | null;

  // Actions
  setLanguage: (lang: Language) => void;
  setActiveView: (view: 'store' | 'shop' | 'tracking' | 'account' | 'admin' | 'about' | 'verify-email') => void;
  setActiveFilterTab: (tab: 'all' | 'new-arrivals' | 'best-sellers' | 'deals' | 'featured') => void;
  setActiveStaticPage: (page: 'about' | 'support' | 'faq' | 'shipping' | 'refund' | 'privacy' | 'terms' | null) => void;
  setSelectedCategoryFilter: (cat: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSelectedProduct: (prod: Product | null) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsCheckoutOpen: (open: boolean) => void;
  setLastCreatedOrder: (order: Order | null) => void;
  setActiveTrackingId: (id: string | null) => void;
  setIsCompareOpen: (open: boolean) => void;
  setIsSizeGuideOpen: (open: boolean) => void;
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  addRecentlyViewed: (productId: string) => void;

  // Cart & Wishlist
  addToCart: (product: Product, variantId?: string, quantity?: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  applyCoupon: (code: string, userIdentifier?: string) => { success: boolean; message: string };
  isCouponUsedByUser: (code: string, userIdentifier?: string) => boolean;
  removeCoupon: () => void;

  // Order Placement & Return Management
  createOrder: (
    customer: ShippingAddress,
    paymentMethod: PaymentMethod,
    courierChoice: CourierProvider,
    transactionId?: string
  ) => Promise<Order>;
  requestOrderCancellation: (orderId: string, reason: string) => void;
  requestOrderReturn: (orderId: string, reason: string) => void;

  // Product Reviews & Q&A
  addReview: (productId: string, review: Omit<ProductReview, 'id' | 'date'>) => void;
  askQuestion: (productId: string, userName: string, question: string) => void;
  answerQuestion: (questionId: string, answer: string) => void;

  // Admin Actions
  acceptOrderAndBookCourier: (orderId: string, adminActor?: string) => Promise<{ success: boolean; message: string; trackingCode?: string; consignmentId?: string }>;
  retryCourierBooking: (orderId: string, adminActor?: string) => Promise<{ success: boolean; message: string }>;
  syncCourierStatus: (orderId: string, adminActor?: string) => Promise<{ success: boolean; status?: string; message: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note: string, trackingCode?: string) => void;
  refundOrder: (orderId: string, amount: number, reason: string, adminActor?: string) => Promise<{ success: boolean; message: string }>;
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount'> & { id?: string; slug?: string }) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  duplicateProduct: (productId: string) => Product | null;
  bulkUpdateProducts: (productIds: string[], action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'category', value?: any) => void;
  adjustStock: (productId: string, newStock: number, reason: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'itemCount'> & { id?: string; itemCount?: number }) => Category;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => { success: boolean; message: string };
  addPage: (page: StaticPageContent) => void;
  updatePage: (page: StaticPageContent) => void;
  deletePage: (slug: string) => void;
  updateStorefrontCMS: (cms: Partial<StorefrontCMS>) => Promise<StorefrontCMS>;
  updateCustomer: (customer: CustomerRecord) => void;
  updateCustomerStatus: (customerId: string, status: 'ACTIVE' | 'SUSPENDED') => void;
  updateCustomerNotes: (customerId: string, notes: string) => void;
  addCoupon: (coupon: Coupon) => void;
  toggleCouponActive: (code: string) => void;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  addAuditLog: (action: string, details: string, actor?: string) => void;

  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  dismissToast: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Prevent duplicate product creation while the same SKU is being saved.
const pendingProductCreates = new Map<string, Product>();

// New namespace intentionally ignores legacy browser-only commerce records during hardening.
const LOCAL_STORAGE_KEY = 'ZELUX_ECOMMERCE_STATE_V3';

type StoreView = 'store' | 'shop' | 'tracking' | 'account' | 'admin' | 'about' | 'verify-email';

export const StoreProvider: React.FC<{ children: React.ReactNode; initialView?: StoreView }> = ({ children, initialView = 'store' }) => {
  const router = useRouter();
  // Load initial state from LocalStorage if available
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [wishlist, setWishlist] = useState<string[]>([]);

  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);

  const [reviews, setReviews] = useState<ProductReview[]>(INITIAL_REVIEWS);

  const [questions, setQuestions] = useState<QuestionAnswer[]>(INITIAL_QUESTIONS);

  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);

  const [pages, setPages] = useState<StaticPageContent[]>(INITIAL_PAGES);

  const [storefrontCMS, setStorefrontCMS] = useState<StorefrontCMS>(INITIAL_STOREFRONT_CMS);

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [language, setLanguage] = useState<Language>('en');
  const [activeView, setActiveViewState] = useState<StoreView>(initialView);

  const setActiveView = (view: StoreView) => {
    setActiveViewState(view);
    const targetPath = view === 'store' ? '/' : `/${view}`;
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      router.push(targetPath);
    }
  };
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'new-arrivals' | 'best-sellers' | 'deals' | 'featured'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
  const [activeStaticPage, setActiveStaticPage] = useState<'about' | 'support' | 'faq' | 'shipping' | 'refund' | 'privacy' | 'terms' | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Browser persistence is restored after hydration to keep server and client markup deterministic.
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);

  const saveAdminContent = async (key: 'storefront_cms' | 'settings' | 'categories' | 'pages' | 'coupons', value: unknown) => {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) throw new Error('Sign in as an administrator before saving store content.');
    const response = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Store content could not be saved.');
  };

  const saveProductToDatabase = async (product: Product, method: 'POST' | 'PATCH') => {
    const previousImages = products.find((item) => item.id === product.id)?.images || [];
    const hostedImages = await persistProductImageUrls(product.images || [], product.id);
    const persistedProduct: Product = {
      ...product,
      images: hostedImages,
      imagePublicIds: hostedImages.map(getCloudinaryPublicId).filter((id): id is string => Boolean(id)),
      videoPublicId: product.videoUrl ? getCloudinaryPublicId(product.videoUrl) : undefined,
    };
    const newlyUploadedImages = hostedImages.filter((_, index) => Boolean(product.images?.[index]?.startsWith('data:')));

    try {
      const { data, error } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (error || !token) throw new Error('Sign in as an administrator before saving products.');
      const response = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(persistedProduct),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = Array.isArray(payload.details) ? payload.details.map((item: { path?: unknown; message?: unknown }) => `${Array.isArray(item.path) ? item.path.join('.') : ''}: ${String(item.message || '')}`).join('; ') : '';
        throw new Error([typeof payload.error === 'string' ? payload.error : 'Product could not be saved.', details].filter(Boolean).join(' '));
      }

      // Replace the database references first; delete only old images owned by this product afterward.
      await removeProductImageUrls(previousImages, product.id, hostedImages);
      return payload.product as Product;
    } catch (error) {
      // If the database write fails, remove only files uploaded during this attempt.
      await removeProductImageUrls(newlyUploadedImages, product.id);
      throw error;
    }
  };

  useEffect(() => {
    // Only shopper-owned convenience data may be restored from this browser.
    // Never trust localStorage for products, orders, customers, coupons, settings,
    // CMS content, reviews, or audit logs: old builds stored demo/business records here.
    const restorePreference = <T,>(key: string, fallback: T): T => {
      try {
        const saved = window.localStorage.getItem(`${LOCAL_STORAGE_KEY}_${key}`);
        return saved ? (JSON.parse(saved) as T) : fallback;
      } catch {
        return fallback;
      }
    };

    setCart(restorePreference('CART', []));
    setWishlist(restorePreference('WISHLIST', []));

    // Purge previously cached business records so stale demo data cannot reappear.
    for (const key of [
      'PRODUCTS', 'CATEGORIES', 'ORDERS', 'COUPONS', 'CUSTOMERS', 'PAGES',
      'STOREFRONT_CMS', 'SETTINGS', 'LOGS', 'REVIEWS', 'QUESTIONS',
    ]) {
      try { window.localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${key}`); } catch {}
    }
    try { window.localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}
    setHasHydratedStorage(true);
  }, []);

  // The persistent catalog is the source of truth; local storage is only a fallback for the cart and preferences.
  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const catalogHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('/api/products', { headers: catalogHeaders, cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json().catch(() => null);
        if (!cancelled && Array.isArray(payload?.products)) setProducts(payload.products as Product[]);
      }

      const contentResponse = await fetch('/api/content', { headers: catalogHeaders, cache: 'no-store' });
      if (contentResponse.ok) {
        const contentPayload = await contentResponse.json().catch(() => null);
        const content = contentPayload?.content;
        if (!cancelled && content && typeof content === 'object') {
          if (content.storefront_cms) setStorefrontCMS(content.storefront_cms as StorefrontCMS);
          if (Array.isArray(content.categories)) setCategories(content.categories as Category[]);
          if (Array.isArray(content.pages)) setPages(content.pages as StaticPageContent[]);
          if (content.settings && typeof content.settings === 'object') setSettings(content.settings as StoreSettings);
          if (token && Array.isArray(content.coupons)) setCoupons(content.coupons as Coupon[]);
        }
      }

      // Admins receive durable orders from the protected API; ordinary customers are denied by the server.
      if (!token) return;
      const orderResponse = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!orderResponse.ok) return;
      const orderPayload = await orderResponse.json().catch(() => null);
      if (!cancelled && Array.isArray(orderPayload?.orders)) setOrders(orderPayload.orders as Order[]);
    };
    void loadCatalog().catch((error) => {
      console.warn('Persistent catalog or admin orders could not be loaded.', error);
    });
    return () => { cancelled = true; };
  }, []);

  // Sync to LocalStorage on updates
  useEffect(() => {
    if (!hasHydratedStorage) return;
    try {
      // Browser storage is limited to shopper convenience preferences only.
      // Commerce/admin data must come from authenticated server APIs and the database.
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_CART`, JSON.stringify(cart));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_WISHLIST`, JSON.stringify(wishlist));
    } catch (e) {
      console.warn('Storage sync failed', e);
    }
  }, [hasHydratedStorage, products, categories, cart, wishlist, orders, coupons, customers, pages, storefrontCMS, settings, auditLogs, reviews, questions]);

  const addRecentlyViewed = (productId: string) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      return [productId, ...filtered].slice(0, 6);
    });
  };

  const toggleCompare = (productId: string) => {
    setCompareList((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 3) {
        showToast('You can compare up to 3 products at a time', 'info');
        return prev;
      }
      showToast('Product added to comparison', 'success');
      return [...prev, productId];
    });
  };

  const clearCompare = () => setCompareList([]);

  const addReview = (productId: string, review: Omit<ProductReview, 'id' | 'date'>) => {
    const id = `rev-${Date.now().toString().slice(-4)}`;
    const date = new Date().toISOString().slice(0, 10);
    const newRev: ProductReview = { ...review, id, date };
    setReviews((prev) => [newRev, ...prev]);

    // Recalculate rating
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const nextCount = p.reviewCount + 1;
          const nextRating = Number(((p.rating * p.reviewCount + review.rating) / nextCount).toFixed(1));
          return { ...p, rating: nextRating, reviewCount: nextCount };
        }
        return p;
      })
    );

    showToast('Review submitted! Thank you.', 'success');
  };

  const askQuestion = (productId: string, userName: string, question: string) => {
    const id = `qa-${Date.now().toString().slice(-4)}`;
    const createdAt = new Date().toISOString().slice(0, 10);
    const newQA: QuestionAnswer = { id, productId, userName, question, createdAt };
    setQuestions((prev) => [newQA, ...prev]);
    showToast('Question submitted to concierge', 'success');
  };

  const answerQuestion = (questionId: string, answer: string) => {
    const answeredAt = new Date().toISOString().slice(0, 10);
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, answer, answeredAt } : q))
    );
    showToast('Answer published', 'success');
  };

  const requestOrderCancellation = (orderId: string, reason: string) => {
    const timestampStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'CANCELLED',
            statusHistory: [
              ...o.statusHistory,
              { status: 'CANCELLED', timestamp: timestampStr, note: `Customer requested cancellation: ${reason}` },
            ],
          };
        }
        return o;
      })
    );
    showToast(`Order #${orderId} has been cancelled`, 'info');
  };

  const requestOrderReturn = (orderId: string, reason: string) => {
    const timestampStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'RETURN_REQUESTED',
            statusHistory: [
              ...o.statusHistory,
              { status: 'RETURN_REQUESTED', timestamp: timestampStr, note: `Customer requested 7-day return: ${reason}` },
            ],
          };
        }
        return o;
      })
    );
    showToast(`Return request submitted for #${orderId}`, 'info');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3800);
  };

  const dismissToast = () => setToast(null);

  const addToCart = (product: Product, variantId?: string, quantity: number = 1) => {
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
    const price = variant ? variant.price : product.price;
    const availableStock = variant ? variant.stock : product.stock;

    if (availableStock < 1) {
      showToast('Item is out of stock', 'error');
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.variantId === variantId
      );

      if (existingIndex > -1) {
        const nextQty = prev[existingIndex].quantity + quantity;
        if (nextQty > availableStock) {
          showToast(`Only ${availableStock} units available`, 'info');
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: nextQty };
        return updated;
      }

      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          name: product.name,
          price,
          quantity,
          image: product.images[0] || '',
          variantLabel: variant?.name,
          stock: availableStock,
        },
      ];
    });

    showToast(`${product.name} added to cart`, 'success');
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.variantId === variantId)));
  };

  const updateCartQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId && item.variantId === variantId) {
          if (quantity > item.stock) {
            showToast(`Maximum stock reached (${item.stock})`, 'info');
            return item;
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from wishlist', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to wishlist', 'success');
        return [...prev, productId];
      }
    });
  };

  const isCouponUsedByUser = (code: string, userIdentifier?: string): boolean => {
    if (!code) return false;
    const cleanCode = code.trim().toUpperCase();
    const coupon = coupons.find((c) => c.code === cleanCode);
    if (!coupon) return false;

    const targets: string[] = [];
    if (userIdentifier && userIdentifier.trim()) {
      const raw = userIdentifier.trim().toLowerCase();
      targets.push(raw);
      const digitsOnly = raw.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 7) {
        targets.push(digitsOnly);
        if (digitsOnly.startsWith('880') && digitsOnly.length === 13) {
          targets.push(digitsOnly.slice(2));
        }
      }
    }

    if (targets.length === 0) return false;

    // 1. Check coupon.usedBy
    if (coupon.usedBy && coupon.usedBy.length > 0) {
      const isFoundInCoupon = coupon.usedBy.some((entry) => {
        const normEntry = entry.trim().toLowerCase();
        const normDigits = normEntry.replace(/[^0-9]/g, '');
        return targets.some((t) => {
          if (t === normEntry) return true;
          if (normDigits && normDigits.length >= 7 && normDigits === t) return true;
          return false;
        });
      });
      if (isFoundInCoupon) return true;
    }

    // 2. Check past orders
    const isFoundInOrders = orders.some((order) => {
      if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return false;
      if (!order.couponCode || order.couponCode.toUpperCase() !== cleanCode) return false;
      const ordEmail = order.customer?.email?.trim().toLowerCase();
      const ordPhone = order.customer?.phone?.replace(/[^0-9]/g, '');
      return targets.some((t) => t === ordEmail || (ordPhone && ordPhone === t));
    });

    return isFoundInOrders;
  };

  const applyCoupon = (code: string, userIdentifier?: string): { success: boolean; message: string } => {
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code === cleanCode && c.active);

    if (!found) {
      showToast('Invalid or expired coupon code', 'error');
      return {
        success: false,
        message: 'Invalid or expired coupon code',
      };
    }

    // Per-user usage limit check (Rule 8: 1 jon user ek cupon jeno bar bar use korte na pare)
    const perUserLimit = found.perUserLimit ?? 1;
    if (perUserLimit <= 1 && userIdentifier && isCouponUsedByUser(cleanCode, userIdentifier)) {
      showToast(
        `Coupon ${found.code} already used! Offer limited to 1 use per customer.`,
        'error'
      );
      return {
        success: false,
        message: `You have already redeemed coupon ${found.code}. This offer is strictly limited to 1 use per customer.`,
      };
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (subtotal < found.minSpend) {
      showToast(
        `Minimum order of ৳${found.minSpend.toLocaleString()} required`,
        'error'
      );
      return {
        success: false,
        message: `Minimum order of ৳${found.minSpend.toLocaleString()} required for this coupon`,
      };
    }

    setAppliedCoupon(found);
    showToast(`Coupon ${found.code} applied! (1-time use per customer)`, 'success');
    return {
      success: true,
      message: 'Coupon applied successfully',
    };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  };

  const createOrder = async (
    customer: ShippingAddress,
    paymentMethod: PaymentMethod,
    _courierChoice: CourierProvider,
    _transactionId?: string
  ): Promise<Order> => {
    // Only COD is supported by the server-side order service. Never accept client totals as authoritative.
    if (paymentMethod !== 'COD') {
      throw new Error('Only Cash on Delivery is currently available. Online payments are not enabled yet.');
    }
    if (!cart.length) throw new Error('Your cart is empty.');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (sessionError || !session?.access_token || !session.user.email_confirmed_at) {
      throw new Error('Please sign in with a verified email before placing your order.');
    }
    const idempotencyStorageKey = 'zelux.checkout.idempotency.v1';
    let idempotencyKey = '';
    try {
      idempotencyKey = window.sessionStorage.getItem(idempotencyStorageKey) || '';
    } catch {
      // Continue with an in-memory key when browser storage is unavailable.
    }
    if (!idempotencyKey) {
      idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `zlx-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      try { window.sessionStorage.setItem(idempotencyStorageKey, idempotencyKey); } catch {}
    }
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        customer,
        paymentMethod: 'COD',
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.order?.orderId) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Order could not be placed. Please retry.');
    }
    const createdAt = new Date().toISOString();
    const order: Order = {
      id: String(payload.order.orderId),
      createdAt,
      customer,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.name,
        variantLabel: item.variantLabel,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
      subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      shippingFee: Math.max(0, Number(payload.order.grandTotal) - cart.reduce((sum, item) => sum + item.price * item.quantity, 0)),
      discount: 0,
      grandTotal: Number(payload.order.grandTotal),
      status: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      courier: {
        provider: 'PATHAO',
        trackingCode: '',
        estimatedDelivery: '',
        bookingStatus: 'NOT_BOOKED',
      },
      statusHistory: [{ status: 'PENDING', timestamp: createdAt, note: 'Order placed successfully; awaiting admin confirmation.' }],
    };
    try { window.sessionStorage.removeItem('zelux.checkout.idempotency.v1'); } catch {}
    setOrders((previous) => [order, ...previous]);
    setLastCreatedOrder(order);
    setCart([]);
    setAppliedCoupon(null);
    showToast('Your order has been placed successfully.', 'success');
    return order;
  };

  const acceptOrderAndBookCourier = async (
    orderId: string,
    adminActor: string = 'Admin Staff'
  ): Promise<{ success: boolean; message: string; trackingCode?: string; consignmentId?: string }> => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      showToast('Order not found', 'error');
      return { success: false, message: 'Order not found' };
    }

    // 1. Idempotency Check: Already booked?
    if (targetOrder.courier?.bookingStatus === 'BOOKED' && targetOrder.courier?.consignmentId) {
      const msg = `Order #${orderId} has already been booked with ${targetOrder.courier.provider} (Consignment: ${targetOrder.courier.consignmentId}). Duplicate booking prevented.`;
      showToast(msg, 'info');
      return {
        success: true,
        message: msg,
        trackingCode: targetOrder.courier.trackingCode,
        consignmentId: targetOrder.courier.consignmentId,
      };
    }

    // 2. State Validation: Can only accept PENDING or CONFIRMED orders
    if (targetOrder.status === 'CANCELLED' || targetOrder.status === 'DELIVERED') {
      const msg = `Cannot book courier for an order with status "${targetOrder.status}".`;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Mark as BOOKING_IN_PROGRESS to prevent concurrent double-clicks
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            courier: {
              ...o.courier,
              bookingStatus: 'BOOKING_IN_PROGRESS',
              bookingError: undefined,
            },
          };
        }
        return o;
      })
    );

    // 3. Prepare Courier Shipment Request
    const courierProvider = getCourierProvider(targetOrder.courier.provider || 'PATHAO');
    const codAmount = targetOrder.paymentMethod === 'COD' ? targetOrder.grandTotal : 0;
    const totalItemsCount = targetOrder.items.reduce((sum, item) => sum + item.quantity, 0);

    const shipmentRequest = {
      orderId: targetOrder.id,
      customerName: targetOrder.customer.fullName,
      customerPhone: targetOrder.customer.phone,
      deliveryAddress: targetOrder.customer.addressDetails,
      division: targetOrder.customer.division,
      district: targetOrder.customer.district,
      thanaCity: targetOrder.customer.thanaCity,
      itemCount: totalItemsCount,
      codAmount,
      notes: targetOrder.customer.notes,
    };

    try {
      const result = await courierProvider.createShipment(shipmentRequest);
      const attemptId = `att-${Date.now()}`;

      if (result.success && result.consignmentId) {
        // Successful booking
        const newAttempt: CourierBookingAttempt = {
          attemptId,
          timestamp: timestampStr,
          courier: targetOrder.courier.provider,
          success: true,
          consignmentId: result.consignmentId,
          trackingCode: result.trackingCode,
          statusCode: 200,
          responsePayload: result.responsePayload,
        };

        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              const updatedHistory = [
                ...o.statusHistory,
                {
                  status: 'CONFIRMED' as OrderStatus,
                  timestamp: timestampStr,
                  note: `Order Accepted by ${adminActor}. Booked on ${result.courier} (Consignment: ${result.consignmentId}, Tracking: ${result.trackingCode})`,
                },
              ];

              return {
                ...o,
                status: 'CONFIRMED',
                courier: {
                  ...o.courier,
                  provider: result.courier,
                  consignmentId: result.consignmentId,
                  trackingCode: result.trackingCode,
                  bookingStatus: 'BOOKED',
                  bookingError: undefined,
                  bookedAt: timestampStr,
                  deliveryFee: result.deliveryFee,
                  hubLocation: result.hubLocation,
                  estimatedDelivery: result.estimatedDelivery || o.courier.estimatedDelivery,
                },
                bookingAttempts: [newAttempt, ...(o.bookingAttempts || [])],
                statusHistory: updatedHistory,
              };
            }
            return o;
          })
        );

        const logItem: AuditLog = {
          id: `log-${Date.now()}`,
          timestamp: timestampStr,
          actor: adminActor,
          action: 'COURIER_BOOKED',
          details: `Order #${orderId} confirmed and dispatched to ${result.courier}. Tracking: ${result.trackingCode}, Consignment: ${result.consignmentId}`,
        };
        setAuditLogs((prev) => [logItem, ...prev]);

        showToast(
          `Order #${orderId} accepted! Booked on ${result.courier} (${result.trackingCode})`,
          'success'
        );

        return {
          success: true,
          message: 'Order accepted and courier shipment successfully booked.',
          trackingCode: result.trackingCode,
          consignmentId: result.consignmentId,
        };
      } else {
        // Provider returned validation or booking failure
        const errorMsg = result.errorMessage || 'Courier provider rejected shipment dispatch.';
        const failedAttempt: CourierBookingAttempt = {
          attemptId,
          timestamp: timestampStr,
          courier: targetOrder.courier.provider,
          success: false,
          errorMessage: errorMsg,
        };

        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              const updatedHistory = [
                ...o.statusHistory,
                {
                  status: o.status,
                  timestamp: timestampStr,
                  note: `Courier booking attempt failed: ${errorMsg}`,
                },
              ];

              return {
                ...o,
                courier: {
                  ...o.courier,
                  bookingStatus: 'BOOKING_FAILED',
                  bookingError: errorMsg,
                },
                bookingAttempts: [failedAttempt, ...(o.bookingAttempts || [])],
                statusHistory: updatedHistory,
              };
            }
            return o;
          })
        );

        const logItem: AuditLog = {
          id: `log-${Date.now()}`,
          timestamp: timestampStr,
          actor: adminActor,
          action: 'COURIER_BOOKING_FAILED',
          details: `Order #${orderId} courier booking failed: ${errorMsg}`,
        };
        setAuditLogs((prev) => [logItem, ...prev]);

        showToast(`Courier booking failed: ${errorMsg}`, 'error');
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network timeout connecting to Courier API.';
      const attemptId = `att-${Date.now()}`;
      const failedAttempt: CourierBookingAttempt = {
        attemptId,
        timestamp: timestampStr,
        courier: targetOrder.courier.provider,
        success: false,
        errorMessage: errorMsg,
      };

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              courier: {
                ...o.courier,
                bookingStatus: 'BOOKING_FAILED',
                bookingError: errorMsg,
              },
              bookingAttempts: [failedAttempt, ...(o.bookingAttempts || [])],
            };
          }
          return o;
        })
      );

      showToast(`Error dispatching to Courier: ${errorMsg}`, 'error');
      return { success: false, message: errorMsg };
    }
  };

  /**
   * Safe Retry Courier Booking
   */
  const retryCourierBooking = async (orderId: string, adminActor: string = 'Admin Staff') => {
    return acceptOrderAndBookCourier(orderId, adminActor);
  };

  /**
   * Live Courier Status Sync (via Webhook Simulation or API Polling)
   */
  const syncCourierStatus = async (
    orderId: string,
    adminActor: string = 'Automated Status Sync'
  ): Promise<{ success: boolean; status?: string; message: string }> => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Order not found' };
    }

    if (!targetOrder.courier?.trackingCode) {
      return { success: false, message: 'Order has no active tracking code to synchronize.' };
    }

    const courierProvider = getCourierProvider(targetOrder.courier.provider);
    try {
      const tracking = await courierProvider.getTracking(targetOrder.courier.trackingCode);
      const now = new Date();
      const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Map courier status to order status if appropriate
      let targetOrderStatus = targetOrder.status;
      if (tracking.status === 'DELIVERED') {
        targetOrderStatus = 'DELIVERED';
      } else if (tracking.status === 'OUT_FOR_DELIVERY') {
        targetOrderStatus = 'OUT_FOR_DELIVERY';
      } else if (tracking.status === 'IN_TRANSIT' && targetOrder.status === 'CONFIRMED') {
        targetOrderStatus = 'SHIPPED';
      }

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: targetOrderStatus,
              // Courier delivery status is not proof that COD money was collected.
              paymentStatus: o.paymentStatus,
              courier: {
                ...o.courier,
                lastSyncedAt: timestampStr,
              },
            };
          }
          return o;
        })
      );

      const logItem: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: timestampStr,
        actor: adminActor,
        action: 'COURIER_SYNCED',
        details: `Order #${orderId} synced with ${targetOrder.courier.provider}. Status: ${tracking.status}`,
      };
      setAuditLogs((prev) => [logItem, ...prev]);

      showToast(`Courier status synchronized: ${tracking.status}`, 'success');
      return { success: true, status: tracking.status, message: 'Courier status updated successfully.' };
    } catch (err: any) {
      const msg = err?.message || 'Failed to poll courier status.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const updateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    note: string,
    trackingCode?: string
  ) => {
    void (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error('Sign in as an administrator before updating orders.');
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, status: newStatus }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Order status could not be saved.');
      const timestampStr = new Date().toISOString();
      setOrders((prev) => prev.map((ord) => ord.id === orderId ? {
        ...ord,
        status: newStatus,
        courier: trackingCode ? { ...ord.courier, trackingCode } : ord.courier,
        statusHistory: [...ord.statusHistory, { status: newStatus, timestamp: timestampStr, note }],
      } : ord));
      const logItem: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: timestampStr,
        actor: 'Admin Dashboard',
        action: 'STATUS_CHANGED',
        details: `Order #${orderId} transitioned to ${newStatus}. Note: ${note}`,
      };
      setAuditLogs((prev) => [logItem, ...prev]);
      showToast(`Order #${orderId} status updated to ${newStatus}`, 'success');
    })().catch((error) => {
      showToast(error instanceof Error ? error.message : 'Order status could not be saved.', 'error');
    });
  };

  const addProduct = (productData: Omit<Product, 'id' | 'rating' | 'reviewCount'> & { id?: string; slug?: string }): Product => {
    const normalizedSku = productData.sku.trim().toLowerCase();
    const pending = pendingProductCreates.get(normalizedSku);
    if (pending) {
      showToast('This product is already being saved. Please wait.', 'info');
      return pending;
    }
    const existingSku = products.find((item) => item.sku.trim().toLowerCase() === normalizedSku);
    if (existingSku) {
      showToast(`SKU "${productData.sku}" already exists. Edit the existing product instead.`, 'error');
      return existingSku;
    }

    const id = productData.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const slug = productData.slug?.trim() || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProduct: Product = { ...productData, id, slug, rating: 0, reviewCount: 0 };
    pendingProductCreates.set(normalizedSku, newProduct);
    setProducts((prev) => [newProduct, ...prev]);
    void saveProductToDatabase(newProduct, 'POST').then((saved) => {
      setProducts((prev) => prev.map((p) => p.id === saved.id ? saved : p));
      showToast(`Product "${newProduct.name}" created and saved`, 'success');
    }).catch((error) => {
      setProducts((prev) => prev.filter((p) => p.id !== newProduct.id));
      showToast(error instanceof Error ? error.message : 'Product could not be saved.', 'error');
    }).finally(() => {
      if (pendingProductCreates.get(normalizedSku)?.id === newProduct.id) pendingProductCreates.delete(normalizedSku);
    });
    return newProduct;
  };

  const updateProduct = (updated: Product) => {
    const previous = products.find((p) => p.id === updated.id);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    void saveProductToDatabase(updated, 'PATCH').then((saved) => {
      setProducts((prev) => prev.map((p) => p.id === saved.id ? saved : p));
      showToast(`Product "${updated.name}" updated and saved`, 'success');
    }).catch((error) => {
      if (previous) setProducts((prev) => prev.map((p) => p.id === previous.id ? previous : p));
      showToast(error instanceof Error ? error.message : 'Product changes could not be saved.', 'error');
    });
  };

  const deleteProduct = (productId: string) => {
    void (async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('Please sign in as an administrator to archive products.');
      const response = await fetch(`/api/products?id=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Product could not be archived.');
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      addAuditLog('PRODUCT_ARCHIVED', `Product ID ${productId} archived from catalog`);
      showToast('Product archived', 'success');
    })().catch((error) => {
      showToast(error instanceof Error ? error.message : 'Product could not be archived.', 'error');
    });
  };

  const duplicateProduct = (productId: string): Product | null => {
    const pendingKey = `duplicate:${productId}`;
    const pending = pendingProductCreates.get(pendingKey);
    if (pending) {
      showToast('This product copy is already being saved. Please wait.', 'info');
      return pending;
    }
    const existing = products.find((p) => p.id === productId);
    if (!existing) return null;

    const uniqueSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const id = `prod-${uniqueSuffix}`;
    const skuSuffix = uniqueSuffix.replace(/[^a-z0-9]/gi, '').slice(-10).toUpperCase();
    const duplicated: Product = {
      ...existing,
      id,
      name: `${existing.name} (Copy)`,
      sku: `${existing.sku}-CP${skuSuffix}`,
      slug: `${existing.slug}-copy-${id}`,
      published: false,
      rating: 0,
      reviewCount: 0,
    };

    pendingProductCreates.set(pendingKey, duplicated);
    setProducts((prev) => [duplicated, ...prev]);
    void saveProductToDatabase(duplicated, 'POST').then((saved) => {
      setProducts((prev) => prev.map((p) => p.id === saved.id ? saved : p));
      addAuditLog('PRODUCT_DUPLICATED', `Duplicated "${existing.name}" as "${saved.name}" (SKU: ${saved.sku})`);
      showToast(`Product duplicated and saved as draft: "${saved.name}"`, 'success');
    }).catch((error) => {
      setProducts((prev) => prev.filter((p) => p.id !== duplicated.id));
      showToast(error instanceof Error ? error.message : 'Product copy could not be saved.', 'error');
    }).finally(() => {
      if (pendingProductCreates.get(pendingKey)?.id === duplicated.id) pendingProductCreates.delete(pendingKey);
    });
    return duplicated;
  };

  const bulkUpdateProducts = (
    productIds: string[],
    action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'category',
    value?: any
  ) => {
    if (productIds.length === 0) return;
    void (async () => {
      const selected = products.filter((p) => productIds.includes(p.id));
      if (action === 'delete') {
        for (const product of selected) {
          const { data, error } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (error || !token) throw new Error('Sign in as an administrator before archiving products.');
          const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `Could not archive ${product.name}.`);
        }
        setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
        addAuditLog('BULK_ARCHIVE_PRODUCTS', `Archived ${selected.length} products`);
        showToast(`Archived ${selected.length} products`, 'success');
        return;
      }

      const nextProducts = products.map((p) => {
        if (!productIds.includes(p.id)) return p;
        switch (action) {
          case 'publish': return { ...p, published: true, archived: false };
          case 'unpublish': return { ...p, published: false };
          case 'archive': return { ...p, archived: true, published: false };
          case 'restore': return { ...p, archived: false, published: true };
          case 'category': return { ...p, category: value?.name || p.category };
          default: return p;
        }
      });
      for (const product of nextProducts.filter((p) => productIds.includes(p.id))) {
        await saveProductToDatabase(product, 'PATCH');
      }
      setProducts(nextProducts);
      addAuditLog('BULK_UPDATE_PRODUCTS', `Bulk action "${action}" applied to ${productIds.length} products`);
      showToast(`Saved ${productIds.length} products (${action})`, 'success');
    })().catch((error) => showToast(error instanceof Error ? error.message : 'Bulk product changes could not be saved.', 'error'));
  };

  const addCategory = (categoryData: Omit<Category, 'id' | 'itemCount'> & { id?: string; itemCount?: number }): Category => {
    const slug = categoryData.slug.trim() || categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = categories.find((item) =>
      (Boolean(categoryData.id) && item.id === categoryData.id) ||
      item.slug.toLowerCase() === slug.toLowerCase() ||
      item.name.trim().toLowerCase() === categoryData.name.trim().toLowerCase()
    );

    if (existing) {
      const updatedCategory: Category = {
        ...existing,
        ...categoryData,
        id: existing.id,
        slug,
        itemCount: categoryData.itemCount ?? existing.itemCount,
      };
      const nextCategories = categories.map((item) => item.id === existing.id ? updatedCategory : item);
      void saveAdminContent('categories', nextCategories).then(() => {
        setCategories(nextCategories);
        addAuditLog('CATEGORY_UPDATED', `Updated category "${updatedCategory.name}"`);
        showToast(`Category "${updatedCategory.name}" saved`, 'success');
      }).catch((error) => showToast(error instanceof Error ? error.message : 'Category could not be saved.', 'error'));
      return updatedCategory;
    }

    const id = categoryData.id || slug || `cat-${Date.now()}`;
    const newCategory: Category = {
      ...categoryData,
      id,
      slug,
      itemCount: categoryData.itemCount ?? 0,
      isActive: categoryData.isActive ?? true,
      order: categoryData.order ?? (categories.length + 1),
    };
    const nextCategories = [...categories, newCategory];
    void saveAdminContent('categories', nextCategories).then(() => {
      setCategories(nextCategories);
      addAuditLog('CATEGORY_CREATED', `Created category "${newCategory.name}"`);
      showToast(`Category "${newCategory.name}" saved`, 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Category could not be saved.', 'error'));
    return newCategory;
  };
  const updateCategory = (updated: Category) => {
    const nextCategories = categories.map((c) => (c.id === updated.id ? updated : c));
    void saveAdminContent('categories', nextCategories).then(() => {
      setCategories(nextCategories);
      addAuditLog('CATEGORY_UPDATED', `Updated category "${updated.name}"`);
      showToast(`Category "${updated.name}" saved`, 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Category could not be saved.', 'error'));
  };

  const deleteCategory = (categoryId: string): { success: boolean; message: string } => {
    const count = products.filter((p) => p.category === categoryId || p.category === categories.find(c => c.id === categoryId)?.name).length;
    if (count > 0) {
      showToast(`Cannot delete category: ${count} products assigned. Reassign products first.`, 'error');
      return { success: false, message: `Cannot delete: ${count} products assigned` };
    }
    const cat = categories.find((c) => c.id === categoryId);
    const nextCategories = categories.filter((c) => c.id !== categoryId);
    void saveAdminContent('categories', nextCategories).then(() => {
      setCategories(nextCategories);
      addAuditLog('CATEGORY_DELETED', `Deleted category "${cat?.name || categoryId}"`);
      showToast(`Category "${cat?.name || categoryId}" removed`, 'info');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Category could not be deleted.', 'error'));
    return { success: true, message: 'Category removal requested' };
  };

  const addPage = (page: StaticPageContent) => {
    const now = new Date().toISOString().slice(0, 10);
    const newPage = { ...page, lastUpdated: now };
    const nextPages = [...pages.filter((p) => p.slug !== newPage.slug), newPage];
    void saveAdminContent('pages', nextPages).then(() => {
      setPages(nextPages);
      addAuditLog('PAGE_CREATED', `Created CMS page "${newPage.title}" (/${newPage.slug})`);
      showToast(`Page "${newPage.title}" saved to database`, 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Page could not be saved.', 'error'));
  };

  const updatePage = (updated: StaticPageContent) => {
    const now = new Date().toISOString().slice(0, 10);
    const updatedPage = { ...updated, lastUpdated: now };
    const nextPages = pages.map((p) => (p.slug === updatedPage.slug ? updatedPage : p));
    void saveAdminContent('pages', nextPages).then(() => {
      setPages(nextPages);
      addAuditLog('PAGE_UPDATED', `Updated CMS page "${updatedPage.title}" (/${updatedPage.slug})`);
      showToast(`Page "${updatedPage.title}" saved to database`, 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Page could not be saved.', 'error'));
  };

  const deletePage = (slug: string) => {
    const page = pages.find((p) => p.slug === slug);
    const nextPages = pages.filter((p) => p.slug !== slug);
    void saveAdminContent('pages', nextPages).then(() => {
      setPages(nextPages);
      addAuditLog('PAGE_DELETED', `Deleted CMS page "${page?.title || slug}"`);
      showToast(`Page "${page?.title || slug}" deleted from database`, 'info');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Page could not be deleted.', 'error'));
  };

  const updateStorefrontCMS = async (cmsUpdate: Partial<StorefrontCMS>): Promise<StorefrontCMS> => {
    const merged: StorefrontCMS = {
      ...storefrontCMS,
      ...cmsUpdate,
      hero: { ...storefrontCMS.hero, ...(cmsUpdate.hero || {}) },
      banners: cmsUpdate.banners ?? storefrontCMS.banners,
      announcement: { ...storefrontCMS.announcement, ...(cmsUpdate.announcement || {}) },
      sectionVisibility: { ...storefrontCMS.sectionVisibility, ...(cmsUpdate.sectionVisibility || {}) },
    };

    const previousImageUrls = [
      storefrontCMS.hero?.imageUrl,
      storefrontCMS.hero?.mobileImageUrl,
      ...(storefrontCMS.banners || []).flatMap((banner) => [banner.imageUrl, banner.mobileImageUrl || '']),
    ].filter((url): url is string => Boolean(url && /^https:\/\//i.test(url)));
    const dataUrls = [...new Set([
      merged.hero?.imageUrl,
      merged.hero?.mobileImageUrl,
      ...(merged.banners || []).flatMap((banner) => [banner.imageUrl, banner.mobileImageUrl || '']),
    ].filter((url): url is string => Boolean(url && url.startsWith('data:'))))];

    let uploadedUrls: string[] = [];
    try {
      const hostedUrls = dataUrls.length
        ? await persistProductImageUrls(dataUrls, 'storefront')
        : [];
      uploadedUrls = hostedUrls.filter((url, index) => url !== dataUrls[index]);

      const urlMap = new Map(dataUrls.map((url, index) => [url, hostedUrls[index]]));
      const resolveImage = (url?: string) => (url && urlMap.has(url) ? urlMap.get(url)! : url || '');

      merged.hero = {
        ...merged.hero,
        imageUrl: resolveImage(merged.hero.imageUrl),
        mobileImageUrl: resolveImage(merged.hero.mobileImageUrl),
        imagePublicId: getCloudinaryPublicId(resolveImage(merged.hero.imageUrl)),
        mobileImagePublicId: getCloudinaryPublicId(resolveImage(merged.hero.mobileImageUrl)),
      };
      if (Array.isArray(merged.banners)) {
        merged.banners = merged.banners.map((banner) => {
          const imageUrl = resolveImage(banner.imageUrl);
          const mobileImageUrl = resolveImage(banner.mobileImageUrl);
          return {
            ...banner,
            imageUrl,
            mobileImageUrl,
            imagePublicId: getCloudinaryPublicId(imageUrl),
            mobileImagePublicId: getCloudinaryPublicId(mobileImageUrl),
          };
        });
      }

      await saveAdminContent('storefront_cms', merged);
    } catch (error) {
      if (uploadedUrls.length) await removeProductImageUrls(uploadedUrls, 'storefront');
      throw error;
    }

    // Reflect the published state only after the server confirms the database write.
    setStorefrontCMS(merged);
    const nextImageUrls = [
      merged.hero?.imageUrl,
      merged.hero?.mobileImageUrl,
      ...(merged.banners || []).flatMap((banner) => [banner.imageUrl, banner.mobileImageUrl || '']),
    ].filter((url): url is string => Boolean(url));
    await removeProductImageUrls(previousImageUrls, 'storefront', nextImageUrls);
    addAuditLog('STOREFRONT_CMS_UPDATED', 'Published homepage hero banners and storefront appearance settings');
    showToast('Storefront appearance saved and published.', 'success');
    return merged;
  };

  const updateCustomer = (customer: CustomerRecord) => {
    setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
    addAuditLog('CUSTOMER_UPDATED', `Updated customer record for ${customer.fullName} (${customer.phone})`);
    showToast('Customer record updated', 'success');
  };

  const updateCustomerStatus = (customerId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status } : c))
    );
    addAuditLog('CUSTOMER_STATUS_CHANGED', `Customer ID ${customerId} status changed to ${status}`);
    showToast(`Customer status updated to ${status}`, 'success');
  };

  const updateCustomerNotes = (customerId: string, notes: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, notes } : c))
    );
    addAuditLog('CUSTOMER_NOTES_UPDATED', `Updated internal notes for customer ID ${customerId}`);
    showToast('Customer notes saved', 'success');
  };

  const refundOrder = async (
    orderId: string,
    _amount: number,
    _reason: string,
    _adminActor: string = 'Admin Superuser'
  ): Promise<{ success: boolean; message: string }> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      showToast('Order not found', 'error');
      return { success: false, message: 'Order not found' };
    }

    if (target.paymentStatus === 'REFUNDED') {
      showToast('This order is already marked as refunded', 'info');
      return { success: false, message: 'Order already marked as refunded' };
    }

    // Fail closed: this frontend has no trusted payment provider refund API.
    // Never mark an order as refunded or report success when no money was returned.
    const message =
      'Refund automation is not configured. No money was returned and the order status was not changed. Process the refund through the payment provider or bank, then reconcile it in a trusted backend.';
    showToast(message, 'error');
    return { success: false, message };
  };

  const adjustStock = (productId: string, newStock: number, reason: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      showToast('Product not found', 'error');
      return;
    }
    const updated = { ...product, stock: newStock };
    void saveProductToDatabase(updated, 'PATCH').then((saved) => {
      setProducts((prev) => prev.map((p) => p.id === productId ? saved : p));
      const logItem: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        actor: 'Admin (Inventory)',
        action: 'STOCK_ADJUSTMENT',
        details: `Stock updated for product ID ${productId} to ${newStock}. Reason: ${reason}`,
      };
      setAuditLogs((prev) => [logItem, ...prev]);
      showToast('Stock inventory saved', 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Stock adjustment could not be saved.', 'error'));
  };

  const addCoupon = (coupon: Coupon) => {
    const normalizedCode = coupon.code.trim().toUpperCase();
    const existing = coupons.find((item) => item.code.trim().toUpperCase() === normalizedCode);
    const normalizedCoupon: Coupon = {
      ...coupon,
      code: normalizedCode,
      perUserLimit: coupon.perUserLimit ?? existing?.perUserLimit ?? 1,
      usedBy: existing?.usedBy || coupon.usedBy || [],
    };
    const nextCoupons = existing
      ? coupons.map((item) => item.code.trim().toUpperCase() === normalizedCode ? { ...item, ...normalizedCoupon } : item)
      : [normalizedCoupon, ...coupons];
    void saveAdminContent('coupons', nextCoupons).then(() => {
      setCoupons(nextCoupons);
      showToast(`Coupon ${normalizedCode} ${existing ? 'updated' : 'saved'}`, 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Coupon could not be saved.', 'error'));
  };

  const toggleCouponActive = (code: string) => {
    const nextCoupons = coupons.map((c) => (c.code === code ? { ...c, active: !c.active } : c));
    void saveAdminContent('coupons', nextCoupons).then(() => {
      setCoupons(nextCoupons);
      showToast('Coupon status saved', 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Coupon status could not be saved.', 'error'));
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    const merged = { ...settings, ...newSettings };
    void saveAdminContent('settings', merged).then(() => {
      setSettings(merged);
      showToast('Settings saved to database', 'success');
    }).catch((error) => showToast(error instanceof Error ? error.message : 'Settings could not be saved.', 'error'));
  };

  const addAuditLog = (action: string, details: string, actor: string = 'Admin') => {
    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      actor,
      action,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        cart,
        wishlist,
        orders,
        coupons,
        appliedCoupon,
        settings,
        auditLogs,
        reviews,
        questions,
        customers,
        pages,
        storefrontCMS,
        recentlyViewed,
        compareList,
        isCompareOpen,
        isSizeGuideOpen,
        language,
        activeView,
        activeFilterTab,
        selectedCategoryFilter,
        searchQuery,
        selectedProduct,
        isCartOpen,
        isCheckoutOpen,
        lastCreatedOrder,
        activeTrackingId,
        activeStaticPage,
        toast,
        setLanguage,
        setActiveView,
        setActiveFilterTab,
        setActiveStaticPage,
        setSelectedCategoryFilter,
        setSearchQuery,
        setSelectedProduct,
        setIsCartOpen,
        setIsCheckoutOpen,
        setLastCreatedOrder,
        setActiveTrackingId,
        setIsCompareOpen,
        setIsSizeGuideOpen,
        toggleCompare,
        clearCompare,
        addRecentlyViewed,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
        applyCoupon,
        isCouponUsedByUser,
        removeCoupon,
        createOrder,
        acceptOrderAndBookCourier,
        retryCourierBooking,
        syncCourierStatus,
        requestOrderCancellation,
        requestOrderReturn,
        addReview,
        askQuestion,
        answerQuestion,
        updateOrderStatus,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        bulkUpdateProducts,
        adjustStock,
        addCategory,
        updateCategory,
        deleteCategory,
        addPage,
        updatePage,
        deletePage,
        updateStorefrontCMS,
        updateCustomer,
        updateCustomerStatus,
        updateCustomerNotes,
        refundOrder,
        addCoupon,
        toggleCouponActive,
        updateSettings,
        addAuditLog,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
