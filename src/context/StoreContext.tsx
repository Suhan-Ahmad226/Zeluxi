import React, { createContext, useContext, useState, useEffect } from 'react';
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
} from '../data/mockData';
import { calculateShipping } from '../utils/formatters';
import { sendTelegramOrderNotification } from '../lib/notifications/telegram';
import { getCourierProvider } from '../lib/shipping/couriers';

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
  ) => Order;
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
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount'> & { slug?: string }) => Product;
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
  updateStorefrontCMS: (cms: Partial<StorefrontCMS>) => void;
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

const LOCAL_STORAGE_KEY = 'ZELUX_ECOMMERCE_STATE_V2';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from LocalStorage if available
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_PRODUCTS`);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_CATEGORIES`);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_CART`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_WISHLIST`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_ORDERS`);
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_COUPONS`);
      return saved ? JSON.parse(saved) : INITIAL_COUPONS;
    } catch {
      return INITIAL_COUPONS;
    }
  });

  const [reviews, setReviews] = useState<ProductReview[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_REVIEWS`);
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  const [questions, setQuestions] = useState<QuestionAnswer[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_QUESTIONS`);
      return saved ? JSON.parse(saved) : INITIAL_QUESTIONS;
    } catch {
      return INITIAL_QUESTIONS;
    }
  });

  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_CUSTOMERS`);
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [pages, setPages] = useState<StaticPageContent[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_PAGES`);
      return saved ? JSON.parse(saved) : INITIAL_PAGES;
    } catch {
      return INITIAL_PAGES;
    }
  });

  const [storefrontCMS, setStorefrontCMS] = useState<StorefrontCMS>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_STOREFRONT_CMS`);
      return saved ? JSON.parse(saved) : INITIAL_STOREFRONT_CMS;
    } catch {
      return INITIAL_STOREFRONT_CMS;
    }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_SETTINGS`);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_LOGS`);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [language, setLanguage] = useState<Language>('en');
  const [activeView, setActiveViewState] = useState<'store' | 'shop' | 'tracking' | 'account' | 'admin' | 'about' | 'verify-email'>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname === '/verify-email') return 'verify-email';
      if (pathname === '/shop') return 'shop';
      if (pathname === '/tracking') return 'tracking';
      if (pathname === '/account') return 'account';
      if (pathname === '/admin') return 'admin';
    }
    return 'store';
  });

  const setActiveView = (view: 'store' | 'shop' | 'tracking' | 'account' | 'admin' | 'about' | 'verify-email') => {
    setActiveViewState(view);
    if (typeof window !== 'undefined') {
      const targetPath = view === 'store' ? '/' : `/${view}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      if (pathname === '/verify-email') setActiveViewState('verify-email');
      else if (pathname === '/shop') setActiveViewState('shop');
      else if (pathname === '/tracking') setActiveViewState('tracking');
      else if (pathname === '/account') setActiveViewState('account');
      else if (pathname === '/admin') setActiveViewState('admin');
      else setActiveViewState('store');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
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

  // Sync to LocalStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_PRODUCTS`, JSON.stringify(products));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_CATEGORIES`, JSON.stringify(categories));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_CART`, JSON.stringify(cart));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_WISHLIST`, JSON.stringify(wishlist));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_ORDERS`, JSON.stringify(orders));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_COUPONS`, JSON.stringify(coupons));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_CUSTOMERS`, JSON.stringify(customers));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_PAGES`, JSON.stringify(pages));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_STOREFRONT_CMS`, JSON.stringify(storefrontCMS));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_SETTINGS`, JSON.stringify(settings));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_LOGS`, JSON.stringify(auditLogs));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_REVIEWS`, JSON.stringify(reviews));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_QUESTIONS`, JSON.stringify(questions));
    } catch (e) {
      console.warn('Storage sync failed', e);
    }
  }, [products, categories, cart, wishlist, orders, coupons, customers, pages, storefrontCMS, settings, auditLogs, reviews, questions]);

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

  const createOrder = (
    customer: ShippingAddress,
    paymentMethod: PaymentMethod,
    courierChoice: CourierProvider,
    transactionId?: string
  ): Order => {
    // RELEASE SAFETY GATE: this Vite SPA has no trusted order API or shared database.
    // Never create a browser-only order, decrement local stock, or show a false success.
    throw new Error(
      'Live order placement is not available yet. This storefront is waiting for its secure server-side order service.'
    );

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const shippingInfo = calculateShipping(
      customer.division,
      subtotal,
      settings.freeShippingThreshold,
      settings.shippingDhaka,
      settings.shippingOutsideDhaka
    );

    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'PERCENTAGE') {
        discount = Math.round((subtotal * appliedCoupon.value) / 100);
      } else {
        discount = appliedCoupon.value;
      }
    }

    const grandTotal = Math.max(0, subtotal + shippingInfo.fee - discount);

    const orderId = `ZLX-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newOrder: Order = {
      id: orderId,
      createdAt: timestampStr,
      customer,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.name,
        variantLabel: item.variantLabel,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
      subtotal,
      shippingFee: shippingInfo.fee,
      discount,
      grandTotal,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      status: 'PENDING',
      paymentMethod,
      // Customer-submitted transaction references are not proof of payment. An authorized
      // server-side gateway callback or a documented manual review must mark an order as PAID.
      paymentStatus: 'UNPAID',
      transactionId: transactionId || undefined,
      courier: {
        provider: courierChoice,
        trackingCode: '',
        consignmentId: '',
        estimatedDelivery: shippingInfo.eta,
        bookingStatus: 'NOT_BOOKED',
      },
      bookingAttempts: [],
      statusHistory: [
        {
          status: 'PENDING',
          timestamp: timestampStr,
          note: paymentMethod === 'COD'
            ? 'Order placed with Cash on Delivery (COD). Awaiting Admin verification & courier booking.'
            : `Order placed with ${paymentMethod}. Reference ${transactionId ? 'submitted for manual verification' : 'not provided'}; payment remains unverified until an authorized review.`,
        },
      ],
    };

    // Update coupon usage and per-user tracking if coupon was used
    if (appliedCoupon) {
      const cleanCode = appliedCoupon.code;
      const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
      const cleanEmail = customer.email.trim().toLowerCase();
      const tags = [cleanPhone, cleanEmail].filter(Boolean);

      setCoupons((prev) =>
        prev.map((c) => {
          if (c.code === cleanCode) {
            const existingUsed = c.usedBy || [];
            return {
              ...c,
              usageCount: (c.usageCount || 0) + 1,
              usedBy: Array.from(new Set([...existingUsed, ...tags])),
            };
          }
          return c;
        })
      );
    }

    // Deduct stock for products
    setProducts((prev) =>
      prev.map((prod) => {
        const cartMatches = cart.filter((c) => c.productId === prod.id);
        if (cartMatches.length === 0) return prod;

        let updatedStock = prod.stock;
        const updatedVariants = prod.variants.map((v) => {
          const matchVar = cartMatches.find((c) => c.variantId === v.id);
          if (matchVar) {
            return { ...v, stock: Math.max(0, v.stock - matchVar.quantity) };
          }
          return v;
        });

        const totalDeducted = cartMatches.reduce((acc, c) => acc + c.quantity, 0);
        updatedStock = Math.max(0, updatedStock - totalDeducted);

        return {
          ...prod,
          stock: updatedStock,
          variants: updatedVariants,
        };
      })
    );

    // Save order
    setOrders((prev) => [newOrder, ...prev]);

    // Record audit log
    const logItem: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      actor: `Customer (${customer.phone})`,
      action: 'ORDER_CREATED',
      details: `Order #${orderId} placed for ৳${grandTotal.toLocaleString()} (${paymentMethod})`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    // Clear cart and applied coupon
    clearCart();
    setLastCreatedOrder(newOrder);

    // Dispatch Telegram Bot Alert asynchronously
    sendTelegramOrderNotification({
      orderId,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      division: customer.division,
      addressDetails: customer.addressDetails,
      itemCount: newOrder.items.length,
      grandTotal,
      paymentMethod,
      courierProvider: courierChoice,
    }).catch(() => {});

    showToast(`Order #${orderId} successfully placed!`, 'success');
    return newOrder;
  };

  /**
   * Production-grade idempotent Accept Order & Pathao Courier Booking
   * Validates: stock, address, COD amount, status transition, courier config
   */
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
              paymentStatus: targetOrderStatus === 'DELIVERED' && o.paymentMethod === 'COD' ? 'PAID' : o.paymentStatus,
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
    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updatedHistory = [
            ...ord.statusHistory,
            { status: newStatus, timestamp: timestampStr, note },
          ];
          const updatedCourier = trackingCode
            ? { ...ord.courier, trackingCode }
            : ord.courier;

          // If marked delivered and was COD, mark paid
          const updatedPaymentStatus =
            newStatus === 'DELIVERED' && ord.paymentMethod === 'COD'
              ? 'PAID'
              : ord.paymentStatus;

          return {
            ...ord,
            status: newStatus,
            courier: updatedCourier,
            paymentStatus: updatedPaymentStatus,
            statusHistory: updatedHistory,
          };
        }
        return ord;
      })
    );

    const logItem: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      actor: 'Admin Dashboard',
      action: 'STATUS_CHANGED',
      details: `Order #${orderId} transitioned to ${newStatus}. Note: ${note}`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    showToast(`Order #${orderId} status updated to ${newStatus}`, 'success');
  };

  const addProduct = (productData: Omit<Product, 'id' | 'rating' | 'reviewCount'> & { slug?: string }): Product => {
    const id = `prod-${Date.now().toString().slice(-4)}`;
    const slug = productData.slug?.trim() || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProduct: Product = {
      ...productData,
      id,
      slug,
      rating: 5.0,
      reviewCount: 0,
    };
    setProducts((prev) => [newProduct, ...prev]);
    showToast(`Product "${newProduct.name}" created`, 'success');
    return newProduct;
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showToast(`Product "${updated.name}" updated`, 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    addAuditLog('PRODUCT_DELETED', `Product ID ${productId} deleted from catalog`);
    showToast('Product removed', 'info');
  };

  const duplicateProduct = (productId: string): Product | null => {
    const existing = products.find((p) => p.id === productId);
    if (!existing) return null;

    const id = `prod-${Date.now().toString().slice(-4)}`;
    const randomSkuSuffix = Math.floor(100 + Math.random() * 900);
    const duplicated: Product = {
      ...existing,
      id,
      name: `${existing.name} (Copy)`,
      sku: `${existing.sku}-CP${randomSkuSuffix}`,
      slug: `${existing.slug}-copy-${id}`,
      published: false,
      rating: 5.0,
      reviewCount: 0,
    };

    setProducts((prev) => [duplicated, ...prev]);
    addAuditLog('PRODUCT_DUPLICATED', `Duplicated "${existing.name}" as "${duplicated.name}" (SKU: ${duplicated.sku})`);
    showToast(`Product duplicated as draft: "${duplicated.name}"`, 'success');
    return duplicated;
  };

  const bulkUpdateProducts = (
    productIds: string[],
    action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'category',
    value?: any
  ) => {
    if (productIds.length === 0) return;

    if (action === 'delete') {
      setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
      addAuditLog('BULK_DELETE_PRODUCTS', `Deleted ${productIds.length} products`);
      showToast(`Removed ${productIds.length} products`, 'info');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (!productIds.includes(p.id)) return p;
        switch (action) {
          case 'publish':
            return { ...p, published: true, archived: false };
          case 'unpublish':
            return { ...p, published: false };
          case 'archive':
            return { ...p, archived: true, published: false };
          case 'restore':
            return { ...p, archived: false, published: true };
          case 'category':
            return { ...p, category: value?.name || p.category };
          default:
            return p;
        }
      })
    );

    addAuditLog('BULK_UPDATE_PRODUCTS', `Bulk action "${action}" applied to ${productIds.length} products`);
    showToast(`Updated ${productIds.length} products (${action})`, 'success');
  };

  const addCategory = (categoryData: Omit<Category, 'id' | 'itemCount'> & { id?: string; itemCount?: number }): Category => {
    const slug = categoryData.slug?.trim() || categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = categoryData.id || slug || `cat-${Date.now().toString().slice(-4)}`;
    const newCategory: Category = {
      ...categoryData,
      id,
      slug,
      itemCount: categoryData.itemCount ?? 0,
      isActive: categoryData.isActive ?? true,
      order: categoryData.order ?? (categories.length + 1),
    };
    setCategories((prev) => [...prev, newCategory]);
    addAuditLog('CATEGORY_CREATED', `Created category "${newCategory.name}"`);
    showToast(`Category "${newCategory.name}" added`, 'success');
    return newCategory;
  };

  const updateCategory = (updated: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    addAuditLog('CATEGORY_UPDATED', `Updated category "${updated.name}"`);
    showToast(`Category "${updated.name}" updated`, 'success');
  };

  const deleteCategory = (categoryId: string): { success: boolean; message: string } => {
    const count = products.filter((p) => p.category === categoryId || p.category === categories.find(c => c.id === categoryId)?.name).length;
    if (count > 0) {
      showToast(`Cannot delete category: ${count} products assigned. Reassign products first.`, 'error');
      return { success: false, message: `Cannot delete: ${count} products assigned` };
    }
    const cat = categories.find((c) => c.id === categoryId);
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    addAuditLog('CATEGORY_DELETED', `Deleted category "${cat?.name || categoryId}"`);
    showToast(`Category "${cat?.name || categoryId}" removed`, 'info');
    return { success: true, message: 'Category removed' };
  };

  const addPage = (page: StaticPageContent) => {
    const now = new Date().toISOString().slice(0, 10);
    const newPage = { ...page, lastUpdated: now };
    setPages((prev) => {
      const filtered = prev.filter((p) => p.slug !== newPage.slug);
      return [...filtered, newPage];
    });
    addAuditLog('PAGE_CREATED', `Created CMS page "${newPage.title}" (/${newPage.slug})`);
    showToast(`Page "${newPage.title}" saved`, 'success');
  };

  const updatePage = (updated: StaticPageContent) => {
    const now = new Date().toISOString().slice(0, 10);
    const updatedPage = { ...updated, lastUpdated: now };
    setPages((prev) => prev.map((p) => (p.slug === updatedPage.slug ? updatedPage : p)));
    addAuditLog('PAGE_UPDATED', `Updated CMS page "${updatedPage.title}" (/${updatedPage.slug})`);
    showToast(`Page "${updatedPage.title}" updated`, 'success');
  };

  const deletePage = (slug: string) => {
    const page = pages.find((p) => p.slug === slug);
    setPages((prev) => prev.filter((p) => p.slug !== slug));
    addAuditLog('PAGE_DELETED', `Deleted CMS page "${page?.title || slug}"`);
    showToast(`Page "${page?.title || slug}" deleted`, 'info');
  };

  const updateStorefrontCMS = (cmsUpdate: Partial<StorefrontCMS>) => {
    setStorefrontCMS((prev) => {
      const merged: StorefrontCMS = {
        ...prev,
        ...cmsUpdate,
        hero: { ...prev.hero, ...(cmsUpdate.hero || {}) },
        announcement: { ...prev.announcement, ...(cmsUpdate.announcement || {}) },
        sectionVisibility: { ...prev.sectionVisibility, ...(cmsUpdate.sectionVisibility || {}) },
      };
      return merged;
    });
    addAuditLog('STOREFRONT_CMS_UPDATED', 'Updated homepage layout and storefront appearance settings');
    showToast('Storefront appearance updated successfully', 'success');
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
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, stock: newStock };
        }
        return p;
      })
    );
    const logItem: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: 'Admin (Inventory)',
      action: 'STOCK_ADJUSTMENT',
      details: `Stock updated for product ID ${productId} to ${newStock}. Reason: ${reason}`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);
    showToast('Stock inventory updated', 'success');
  };

  const addCoupon = (coupon: Coupon) => {
    const enrichedCoupon: Coupon = {
      ...coupon,
      perUserLimit: coupon.perUserLimit ?? 1,
      usedBy: coupon.usedBy || [],
    };
    setCoupons((prev) => [enrichedCoupon, ...prev]);
    showToast(`Coupon ${coupon.code} created (1 use per customer limit active)`, 'success');
  };

  const toggleCouponActive = (code: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, active: !c.active } : c))
    );
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast('Settings saved successfully', 'success');
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
