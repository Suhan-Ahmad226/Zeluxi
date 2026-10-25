import PathaoCourierManager from './PathaoCourierManager';
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { StoreImage } from '../common/StoreImage';
import { StoreBrandMark } from '../common/StoreBrandMark';
import { useAuth } from '../../context/AuthContext';
import { formatPrice, formatDate, formatDateOnly } from '../../utils/formatters';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Sliders,
  Truck,
  Tag,
  Settings,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Search,
  Printer,
  ChevronRight,
  X,
  Users,
  Download,
  MessageCircle,
  AlertCircle,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Shield,
  RotateCw,
  Send,
  Menu,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  LogOut,
  ChevronDown,
  CreditCard,
  Layers,
  Bell,
  Palette,
  FileText,
  Copy,
  Archive,
  CheckSquare,
  Square,
  Sparkles,
  FolderPlus,
  Megaphone,
} from 'lucide-react';
import { OrderStatus, Product, Order } from '../../types';
import { CreateProductModal } from './CreateProductModal';
import { CategoriesManager } from './CategoriesManager';
import { StorefrontCMSManager } from './StorefrontCMSManager';
import { PagesCMSManager } from './PagesCMSManager';
import { InventoryManager } from './InventoryManager';
import { NotificationsManager } from './NotificationsManager';
import { CustomersManager } from './CustomersManager';
import { RefundModal } from './RefundModal';
import { SocialPostStudio } from './SocialPostStudio';
import { supabase } from '../../lib/supabase';
import { uploadCloudinaryMedia } from '../../lib/productImageStorage';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    categories,
    orders,
    coupons,
    settings,
    auditLogs,
    customers,
    questions,
    pages,
    storefrontCMS,
    answerQuestion,
    updateOrderStatus,
    acceptOrderAndBookCourier,
    retryCourierBooking,
    syncCourierStatus,
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
    language,
    showToast,
    setLastCreatedOrder,
    setActiveView,
  } = useStore();

  const {
    userProfile,
    isAdmin,
    loading: authLoading,
    setIsAuthModalOpen,
    setAuthModalMode,
    changePassword,
  } = useAuth();

  // Sidebar Desktop Collapsed & Mobile Drawer States with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ZELUX_ADMIN_SIDEBAR_COLLAPSED') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ZELUX_ADMIN_SIDEBAR_COLLAPSED', String(next));
      } catch {}
      return next;
    });
  };

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'orders'
    | 'products'
    | 'add-product'
    | 'categories'
    | 'inventory'
    | 'appearance'
    | 'pages'
    | 'customers'
    | 'logistics'
    | 'payments'
    | 'coupons'
    | 'social'
    | 'qa'
    | 'notifications'
    | 'audit'
    | 'settings'
    | 'security'
  >('overview');

  // Collapsible nested navigation groups
  const [isProductsGroupOpen, setIsProductsGroupOpen] = useState(true);
  const [isSettingsGroupOpen, setIsSettingsGroupOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const handleUnreadNotificationCountChange = React.useCallback((count: number) => setUnreadNotificationCount(count), []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('socialConnection')) {
      setActiveTab('social');
    }
  }, []);

  // Keep the sidebar badge current even before the Notifications tab is opened.
  React.useEffect(() => {
    if (authLoading || !isAdmin) return;
    let disposed = false;
    const refreshUnreadCount = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (error || !token) return;
        const response = await fetch('/api/admin/notifications?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({}));
        if (!disposed && Number.isFinite(payload.unreadCount)) {
          setUnreadNotificationCount(Math.max(0, payload.unreadCount));
        }
      } catch {
        // A transient badge refresh failure must not disrupt admin operations.
      }
    };
    void refreshUnreadCount();
    const intervalId = window.setInterval(() => void refreshUnreadCount(), 30_000);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [authLoading, isAdmin]);

  // Search & Filters in admin
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // New & Edit Product Page State
  const [editingProductForModal, setEditingProductForModal] = useState<Product | null>(null);

  // Products Tab Filters & Bulk Action States
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'LOW_STOCK' | 'ARCHIVED'>('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [socialTargetProduct, setSocialTargetProduct] = useState<Product | null>(null);
  const clearSocialTargetProduct = React.useCallback(() => setSocialTargetProduct(null), []);

  // Refund Target Order
  const [refundTargetOrder, setRefundTargetOrder] = useState<Order | null>(null);

  // Category Initial Action for triggering Add Category / Sub-Category from anywhere
  const [categoryInitialAction, setCategoryInitialAction] = useState<'add-category' | 'add-subcategory' | null>(null);

  // Quick Create Dropdown state
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  // New Coupon State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newCouponVal, setNewCouponVal] = useState(10);
  const [newCouponMin, setNewCouponMin] = useState(1500);

  // Admin Password Change States
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminCurrentPwd, setShowAdminCurrentPwd] = useState(false);
  const [showAdminNewPwd, setShowAdminNewPwd] = useState(false);
  const [showAdminConfirmPwd, setShowAdminConfirmPwd] = useState(false);
  const [isAdminPwdLoading, setIsAdminPwdLoading] = useState(false);
  const [adminPwdError, setAdminPwdError] = useState<string | null>(null);
  const [adminPwdSuccess, setAdminPwdSuccess] = useState<string | null>(null);

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPwdError(null);
    setAdminPwdSuccess(null);

    if (!adminNewPassword || adminNewPassword.length < 6) {
      setAdminPwdError('New administrator password must be at least 6 characters long.');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPwdError('New password and confirmation password do not match.');
      return;
    }

    setIsAdminPwdLoading(true);
    try {
      await changePassword(adminCurrentPassword, adminNewPassword);
      addAuditLog(
        'ADMIN_PASSWORD_CHANGED',
        `Admin credentials updated for ${userProfile?.email || '—'}`,
        userProfile?.displayName || 'Administrator'
      );
      setAdminPwdSuccess('Administrator password updated successfully.');
      setAdminCurrentPassword('');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      showToast('Admin password updated successfully', 'success');
    } catch (err: any) {
      setAdminPwdError(err?.message || 'Failed to update administrator password.');
    } finally {
      setIsAdminPwdLoading(false);
    }
  };

  // Settings State Form
  const [storeNameInput, setStoreNameInput] = useState(settings.storeName);
  const [logoUrlInput, setLogoUrlInput] = useState(settings.logoUrl || '');
  const [logoUploadBusy, setLogoUploadBusy] = useState(false);
  const [taglineInput, setTaglineInput] = useState(settings.tagline || '');
  const [phoneInput, setPhoneInput] = useState(settings.phone || '');
  const [emailInput, setEmailInput] = useState(settings.email || '');
  const [addressInput, setAddressInput] = useState(settings.address || '');
  const [footerDescriptionInput, setFooterDescriptionInput] = useState(settings.footerDescription || '');
  const [footerCopyrightInput, setFooterCopyrightInput] = useState(settings.footerCopyright || 'All rights reserved.');
  const [whatsappInput, setWhatsappInput] = useState(settings.whatsappNumber || '');
  const [facebookInput, setFacebookInput] = useState(settings.facebookUrl || '');
  const [instagramInput, setInstagramInput] = useState(settings.instagramUrl || '');
  const [tiktokInput, setTiktokInput] = useState(settings.tiktokUrl || '');
  const [youtubeInput, setYoutubeInput] = useState(settings.youtubeUrl || '');
  const [showPhoneInFooter, setShowPhoneInFooter] = useState(settings.showPhoneInFooter !== false);
  const [showEmailInFooter, setShowEmailInFooter] = useState(settings.showEmailInFooter !== false);
  const [showAddressInFooter, setShowAddressInFooter] = useState(settings.showAddressInFooter !== false);
  const [showSocialLinksInFooter, setShowSocialLinksInFooter] = useState(settings.showSocialLinksInFooter !== false);
  const [showPaymentBadgesInFooter, setShowPaymentBadgesInFooter] = useState(settings.showPaymentBadgesInFooter !== false);
  const [paymentMethodsInput, setPaymentMethodsInput] = useState((settings.footerPaymentMethods || ['Cash on delivery']).join(', '));
  const [footerContactVisible, setFooterContactVisible] = useState(settings.footerShowContact !== false);
  const [footerNavigationVisible, setFooterNavigationVisible] = useState(settings.footerShowNavigation !== false);
  const [footerCustomerCareVisible, setFooterCustomerCareVisible] = useState(settings.footerShowCustomerCare !== false);
  const [footerPaymentDeliveryVisible, setFooterPaymentDeliveryVisible] = useState(settings.footerShowPaymentDelivery !== false);
  const [footerPwaVisible, setFooterPwaVisible] = useState(settings.footerShowPwaInstall !== false);
  const [footerPaymentMethodsInput, setFooterPaymentMethodsInput] = useState((settings.footerPaymentMethods || ['Cash on delivery']).join('\n'));
  const [shippingDhakaInput, setShippingDhakaInput] = useState(settings.shippingDhaka);
  const [shippingOutsideInput, setShippingOutsideInput] = useState(settings.shippingOutsideDhaka);
  const [freeThresholdInput, setFreeThresholdInput] = useState(settings.freeShippingThreshold);

  // Settings may arrive asynchronously from the content API after this component mounts.
  React.useEffect(() => {
    setStoreNameInput(settings.storeName || 'Store');
    setLogoUrlInput(settings.logoUrl || '');
    setTaglineInput(settings.tagline || '');
    setPhoneInput(settings.phone || '');
    setEmailInput(settings.email || '');
    setAddressInput(settings.address || '');
    setFooterDescriptionInput(settings.footerDescription || '');
    setFooterCopyrightInput(settings.footerCopyright || 'All rights reserved.');
    setWhatsappInput(settings.whatsappNumber || '');
    setFacebookInput(settings.facebookUrl || '');
    setInstagramInput(settings.instagramUrl || '');
    setTiktokInput(settings.tiktokUrl || '');
    setYoutubeInput(settings.youtubeUrl || '');
    setShowPhoneInFooter(settings.showPhoneInFooter !== false);
    setShowEmailInFooter(settings.showEmailInFooter !== false);
    setShowAddressInFooter(settings.showAddressInFooter !== false);
    setShowSocialLinksInFooter(settings.showSocialLinksInFooter !== false);
    setShowPaymentBadgesInFooter(settings.showPaymentBadgesInFooter !== false);
    setPaymentMethodsInput((settings.footerPaymentMethods || ['Cash on delivery']).join(', '));
    setFooterContactVisible(settings.footerShowContact !== false);
    setFooterNavigationVisible(settings.footerShowNavigation !== false);
    setFooterCustomerCareVisible(settings.footerShowCustomerCare !== false);
    setFooterPaymentDeliveryVisible(settings.footerShowPaymentDelivery !== false);
    setFooterPwaVisible(settings.footerShowPwaInstall !== false);
    setFooterPaymentMethodsInput((settings.footerPaymentMethods || ['Cash on delivery']).join('\n'));
    setShippingDhakaInput(settings.shippingDhaka);
    setShippingOutsideInput(settings.shippingOutsideDhaka);
    setFreeThresholdInput(settings.freeShippingThreshold);
  }, [settings]);

  // Quick Edit Price & Delete Product States
  const [editingPriceProduct, setEditingPriceProduct] = useState<Product | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState<number>(0);
  const [deleteProductCandidate, setDeleteProductCandidate] = useState<Product | null>(null);

  // Q&A reply state
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  // Order Details Modal State & Booking Loading State
  const [selectedAdminOrder, setSelectedAdminOrder] = useState<Order | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const handleAdminAcceptOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const actor = userProfile?.displayName || userProfile?.email || 'Admin Staff';
      await acceptOrderAndBookCourier(orderId, actor);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleAdminRetryCourier = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const actor = userProfile?.displayName || userProfile?.email || 'Admin Staff';
      await retryCourierBooking(orderId, actor);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleAdminSyncCourier = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const actor = userProfile?.displayName || userProfile?.email || 'Admin Staff';
      await syncCourierStatus(orderId, actor);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleExportOrdersCSV = () => {
    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Phone',
      'Division',
      'Thana/City',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Courier Provider',
      'Tracking Code',
      'Total (BDT)',
    ];
    const rows = orders.map((o) => [
      o.orderNumber || o.id,
      formatDate(o.createdAt, language),
      `"${o.customer.fullName.replace(/"/g, '""')}"`,
      o.customer.phone,
      o.customer.division,
      (o.customer.upazila || o.customer.thanaCity),
      o.paymentMethod,
      o.paymentStatus,
      o.status,
      o.courier.provider,
      o.courier.trackingCode,
      o.grandTotal,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zelux_orders_${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Orders exported to CSV', 'success');
  };

  // Summary Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'PAID' ? o.grandTotal : 0), 0);
  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length;
  const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    addCoupon({
      code: newCouponCode.trim().toUpperCase(),
      type: newCouponType,
      value: Number(newCouponVal),
      minSpend: Number(newCouponMin),
      description: `${newCouponType === 'PERCENTAGE' ? `${newCouponVal}%` : `৳${newCouponVal}`} promotional discount`,
      expiresAt: '2026-12-31',
      usageCount: 0,
      active: true,
      perUserLimit: 1,
      usedBy: [],
    });
    setNewCouponCode('');
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoUploadBusy(true);
    try {
      const uploaded = await uploadCloudinaryMedia(file, 'store-brand', 'image', 'settings');
      setLogoUrlInput(uploaded.url);
      showToast('Store logo uploaded. Save settings to publish it.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Store logo upload failed.', 'error');
    } finally {
      setLogoUploadBusy(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const nonNegativeValues = [shippingDhakaInput, shippingOutsideInput, freeThresholdInput];
    if (nonNegativeValues.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) {
      showToast('Shipping fees and the free-shipping threshold must be valid non-negative amounts.', 'error');
      return;
    }
    const publicUrls = [
      ['Store logo', logoUrlInput],
      ['Facebook', facebookInput],
      ['Instagram', instagramInput],
      ['TikTok', tiktokInput],
      ['YouTube', youtubeInput],
    ] as const;
    for (const [label, value] of publicUrls) {
      if (!value.trim()) continue;
      try {
        if (new URL(value.trim()).protocol !== 'https:') throw new Error('HTTPS required');
      } catch {
        showToast(`${label} must use a valid HTTPS URL.`, 'error');
        return;
      }
    }
    updateSettings({
      storeName: storeNameInput.trim() || 'Store',
      logoUrl: logoUrlInput.trim().startsWith('https://') ? logoUrlInput.trim() : '',
      tagline: taglineInput.trim(),
      phone: phoneInput.trim(),
      email: emailInput.trim(),
      address: addressInput.trim(),
      footerDescription: footerDescriptionInput.trim(),
      footerCopyright: footerCopyrightInput.trim() || 'All rights reserved.',
      whatsappNumber: whatsappInput.trim(),
      facebookUrl: facebookInput.trim(),
      instagramUrl: instagramInput.trim(),
      tiktokUrl: tiktokInput.trim(),
      youtubeUrl: youtubeInput.trim(),
      showPhoneInFooter,
      showEmailInFooter,
      showAddressInFooter,
      showSocialLinksInFooter,
      showPaymentBadgesInFooter,
      footerPaymentMethods: [...new Set(footerPaymentMethodsInput.split(/[\n,]/).map((method) => method.trim()).filter(Boolean))].slice(0, 8),
      footerShowContact: footerContactVisible,
      footerShowNavigation: footerNavigationVisible,
      footerShowCustomerCare: footerCustomerCareVisible,
      footerShowPaymentDelivery: footerPaymentDeliveryVisible,
      footerShowPwaInstall: footerPwaVisible,
      shippingDhaka: Number(shippingDhakaInput),
      shippingOutsideDhaka: Number(shippingOutsideInput),
      freeShippingThreshold: Number(freeThresholdInput),
    });
  };

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
    if (adminOrderSearch.trim()) {
      const q = adminOrderSearch.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.orderNumber || '').toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.courier.trackingCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredProducts = products.filter((p) => {
    if (productCategoryFilter !== 'ALL' && p.category !== productCategoryFilter) return false;
    // Archived products must not reappear in the normal catalog after a reload.
    // Keep them visible only when the explicit Archived filter is selected.
    if (productStatusFilter === 'ARCHIVED') {
      if (!p.archived) return false;
    } else if (p.archived) {
      return false;
    }
    if (productStatusFilter === 'PUBLISHED' && !p.published) return false;
    if (productStatusFilter === 'DRAFT' && p.published) return false;
    if (productStatusFilter === 'LOW_STOCK' && p.stock > p.lowStockThreshold) return false;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200" role="status" aria-live="polite">Checking administrator access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center space-y-5">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-indigo-100">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Administrator Console Restricted</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              This portal is restricted to authorized store managers. Sign in with an authorized administrator account.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => {
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200/80 transition-colors"
            >
              <span>Sign In with Email & Password</span>
            </button>
            <button
              onClick={() => setActiveView('store')}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isProductActive = ['products', 'categories', 'inventory'].includes(activeTab);
  const isSettingActive = ['appearance', 'pages', 'settings', 'security'].includes(activeTab);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'orders': return 'Orders & Sales';
      case 'products': return 'Products / All Products';
      case 'categories': return 'Products / Categories';
      case 'inventory': return 'Products / Inventory & Stock';
      case 'appearance': return 'Storefront Appearance & CMS';
      case 'pages': return 'Pages & Legal CMS';
      case 'customers': return 'Customers';
      case 'logistics': return 'Delivery & Tracking';
      case 'payments': return 'Payments & Finance';
      case 'coupons': return 'Marketing & Coupons';
      case 'social': return 'Social Media Studio';
      case 'qa': return 'Reviews & Support';
      case 'notifications': return 'Notifications';
      case 'audit': return 'Audit Trail';
      case 'settings': return 'Settings / Store Settings';
      case 'security': return 'Settings / Admin Security';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Desktop Persistent Sidebar & Mobile Slide-In Drawer */}
      <aside
        id="admin-sidebar"
        aria-label="Admin Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200 ease-in-out md:static ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-20' : 'w-64 md:w-64'}`}
      >
        {/* Sidebar Header Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <StoreBrandMark
              name={settings.storeName}
              logoUrl={settings.logoUrl}
              className="h-10 w-10 rounded-xl"
              fallbackClassName="bg-indigo-600 text-white shadow-sm"
            />
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="block truncate text-sm font-black tracking-tight text-white">
                  {settings.storeName?.trim() || 'Store'} Admin
                </span>
                <span className="block truncate text-[10px] font-medium text-emerald-400">
                  Store management
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            onClick={toggleSidebarCollapse}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Drawer Close Button */}
          <button
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Close administration menu"
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Links List */}
        <nav
          aria-label="Admin Navigation"
          className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1 overflow-x-hidden"
        >
          {/* 1. Overview */}
          <button
            onClick={() => {
              setActiveTab('overview');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Overview' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'overview' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Overview</span>}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Overview
              </span>
            )}
          </button>

          {/* 2. Orders & Sales */}
          <button
            onClick={() => {
              setActiveTab('orders');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Orders & Sales' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'orders'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <ShoppingBag className={`w-4 h-4 shrink-0 ${activeTab === 'orders' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Orders & Sales</span>}
            {!isSidebarCollapsed && orders.length > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'orders' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-300'
              }`}>
                {orders.length}
              </span>
            )}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Orders & Sales ({orders.length})
              </span>
            )}
          </button>

          {/* 3. Products (Nested Collapsible Group) */}
          <div>
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setActiveTab('products');
                } else {
                  setIsProductsGroupOpen(!isProductsGroupOpen);
                }
              }}
              title={isSidebarCollapsed ? 'Products' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
                isProductActive && isSidebarCollapsed
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isProductActive
                  ? 'text-white bg-slate-800/60 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
            >
              <Package className={`w-4 h-4 shrink-0 ${isProductActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">Products</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {products.length}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isProductsGroupOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </>
              )}
              {isSidebarCollapsed && (
                <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                  Products ({products.length})
                </span>
              )}
            </button>

            {/* Nested Products Sub-navigation */}
            {!isSidebarCollapsed && isProductsGroupOpen && (
              <div className="pl-6 pr-1 pt-1 pb-1 space-y-0.5 border-l border-slate-800 ml-4 mt-1">
                <button
                  onClick={() => {
                    setActiveTab('products');
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeTab === 'products'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-2"><Package className="w-3.5 h-3.5 shrink-0" /><span>All Products</span></span>
                  <span className="text-[10px] text-slate-400">{products.length}</span>
                </button>

                <button
                  onClick={() => {
                    setEditingProductForModal(null);
                    setActiveTab('add-product');
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${activeTab === 'add-product' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'}`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>Add Product</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">+</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActiveTab('categories');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      activeTab === 'categories'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2"><Layers className="w-3.5 h-3.5 shrink-0" /><span>Categories & Sub-Categories</span></span>
                    <span className="text-[10px] text-slate-400 font-mono">{categories?.length || 4}</span>
                  </button>
                  <button
                    onClick={() => {
                      setCategoryInitialAction('add-category');
                      setActiveTab('categories');
                      setIsMobileDrawerOpen(false);
                    }}
                    title="Add New Category"
                    className="p-1 rounded-md text-emerald-400 hover:text-white hover:bg-emerald-600/30 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('inventory');
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeTab === 'inventory'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-2"><Archive className="w-3.5 h-3.5 shrink-0" /><span>Inventory & Stock</span></span>
                  {lowStockProducts.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-300 font-bold">
                      {lowStockProducts.length} low
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 4. Customers */}
          <button
            onClick={() => {
              setActiveTab('customers');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Customers' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'customers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Users className={`w-4 h-4 shrink-0 ${activeTab === 'customers' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Customers</span>}
            {!isSidebarCollapsed && customers.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {customers.length}
              </span>
            )}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Customers ({customers.length})
              </span>
            )}
          </button>

          {/* 5. Delivery & Tracking */}
          <button
            onClick={() => {
              setActiveTab('logistics');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Delivery & Tracking' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'logistics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Truck className={`w-4 h-4 shrink-0 ${activeTab === 'logistics' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Delivery & Tracking</span>}
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                Pathao
              </span>
            )}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Delivery & Tracking (Pathao)
              </span>
            )}
          </button>

          {/* 6. Payments & Finance */}
          <button
            onClick={() => {
              setActiveTab('payments');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Payments & Finance' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'payments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <CreditCard className={`w-4 h-4 shrink-0 ${activeTab === 'payments' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Payments & Finance</span>}
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                BDT
              </span>
            )}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Payments & Finance
              </span>
            )}
          </button>

          {/* 7. Marketing & Coupons */}
          <button
            onClick={() => {
              setActiveTab('coupons');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Marketing & Coupons' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'coupons'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Tag className={`w-4 h-4 shrink-0 ${activeTab === 'coupons' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Marketing & Coupons</span>}
            {!isSidebarCollapsed && coupons.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {coupons.length}
              </span>
            )}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Marketing & Coupons ({coupons.length})
              </span>
            )}
          </button>

          {/* Social Media Studio */}
          <button
            onClick={() => {
              setSocialTargetProduct(null);
              setActiveTab('social');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Social Media Studio' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'social'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Megaphone className={`w-4 h-4 shrink-0 ${activeTab === 'social' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Social Media Studio</span>}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Social Media Studio
              </span>
            )}
          </button>

          {/* 8. Reviews & Support */}
          <button
            onClick={() => {
              setActiveTab('qa');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Reviews & Support' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'qa'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <MessageCircle className={`w-4 h-4 shrink-0 ${activeTab === 'qa' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Reviews & Support</span>}
            {!isSidebarCollapsed && questions.filter(q => !q.answer).length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-200">
                {questions.filter(q => !q.answer).length}
              </span>
            )}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Reviews & Support
              </span>
            )}
          </button>

          {/* Notifications: real operational alerts, separate from audit history */}
          <button
            onClick={() => {
              setActiveTab('notifications');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Notifications' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <Bell className={`w-4 h-4 shrink-0 ${activeTab === 'notifications' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Notifications</span>}
            {!isSidebarCollapsed && unreadNotificationCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Notifications ({unreadNotificationCount})
              </span>
            )}
          </button>

          {/* Audit trail remains separate from actionable notifications */}
          <button
            onClick={() => {
              setActiveTab('audit');
              setIsMobileDrawerOpen(false);
            }}
            title={isSidebarCollapsed ? 'Audit Trail' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            <ShieldAlert className={`w-4 h-4 shrink-0 ${activeTab === 'audit' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Audit Trail</span>}
            {isSidebarCollapsed && (
              <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                Audit Trail
              </span>
            )}
          </button>

          {/* Storefront & Content: one home for all public-site configuration */}
          <div>
            <button
              onClick={() => {
                if (isSidebarCollapsed && !isMobileDrawerOpen) {
                  setActiveTab('settings');
                } else {
                  setIsSettingsGroupOpen(!isSettingsGroupOpen);
                }
              }}
              title={isSidebarCollapsed && !isMobileDrawerOpen ? 'Storefront & Content' : undefined}
              aria-expanded={(!isSidebarCollapsed || isMobileDrawerOpen) && isSettingsGroupOpen}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
                isSettingActive && isSidebarCollapsed
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isSettingActive
                  ? 'text-white bg-slate-800/60 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              } ${isSidebarCollapsed && !isMobileDrawerOpen ? 'md:justify-center md:px-0' : ''}`}
            >
              <Palette className={`w-4 h-4 shrink-0 ${isSettingActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
              {(!isSidebarCollapsed || isMobileDrawerOpen) && (
                <>
                  <span className="truncate flex-1 text-left">Storefront & Content</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isSettingsGroupOpen ? 'rotate-180 text-white' : ''}`} />
                </>
              )}
              {isSidebarCollapsed && !isMobileDrawerOpen && (
                <span className="hidden md:group-hover:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-slate-800 pointer-events-none">
                  Storefront & Content
                </span>
              )}
            </button>

            {(!isSidebarCollapsed || isMobileDrawerOpen) && isSettingsGroupOpen && (
              <div className="pl-6 pr-1 pt-1 pb-1 space-y-0.5 border-l border-slate-800 ml-4 mt-1">
                <button
                  onClick={() => { setActiveTab('appearance'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeTab === 'appearance' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5"><Palette className="w-3 h-3" /> Homepage Design</span>
                </button>
                <button
                  onClick={() => { setActiveTab('pages'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeTab === 'pages' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5"><FileText className="w-3 h-3" /> Pages & Navigation</span>
                  {pages?.length > 0 && <span className="text-[10px] rounded-full bg-slate-800 px-1.5 py-0.5">{pages.length}</span>}
                </button>
                <button
                  onClick={() => { setActiveTab('settings'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeTab === 'settings' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5"><Settings className="w-3 h-3" /> Store Information & Fees</span>
                </button>
                <button
                  onClick={() => { setActiveTab('security'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeTab === 'security' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5"><Lock className="w-3 h-3 text-slate-400" /> Admin Security</span>
                </button>
              </div>
            )}
          </div>

        </nav>

        {/* Sidebar Footer with Return to Store */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-2">
          <button
            onClick={() => setActiveView('store')}
            title="Return to Public Storefront"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
              isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
            }`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-slate-400" />
            {!isSidebarCollapsed && <span className="truncate">Exit to Store</span>}
          </button>
        </div>
      </aside>

      {/* Main Admin Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Admin Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Drawer Hamburger */}
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                aria-label="Open administration navigation"
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 md:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">Admin /</span>
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                    {getBreadcrumbTitle()}
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
              <div className="relative">
                <button
                  onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Quick Create</span>
                  <ChevronDown className="w-3 h-3 text-indigo-200" />
                </button>

                {isQuickCreateOpen && (
                  <div
                    onMouseLeave={() => setIsQuickCreateOpen(false)}
                    className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs"
                  >
                    <button
                      onClick={() => {
                        setEditingProductForModal(null);
                        setActiveTab('add-product');
                        setIsQuickCreateOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Add Product</span>
                    </button>
                    <button
                      onClick={() => {
                        setCategoryInitialAction('add-category');
                        setActiveTab('categories');
                        setIsQuickCreateOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>+ New Main Category</span>
                    </button>
                    <button
                      onClick={() => {
                        setCategoryInitialAction('add-subcategory');
                        setActiveTab('categories');
                        setIsQuickCreateOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>+ New Sub-Category</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('pages');
                        setIsQuickCreateOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>New CMS Page</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('coupons');
                        setIsQuickCreateOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                      <span>New Coupon</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('inventory');
                        setIsQuickCreateOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium border-t border-slate-100"
                    >
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Adjust Stock</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveView('store')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-200 transition-colors"
                title="View storefront in customer mode"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">View Store</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Overview heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Store control center</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">Overview</h1>
                <p className="mt-1.5 text-sm text-slate-500">A clear snapshot of orders, paid revenue, and inventory that needs attention.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  View orders
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingProductForModal(null); setActiveTab('add-product'); }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <Plus className="h-4 w-4" />
                  Add product
                </button>
              </div>
            </div>

            {/* High-frequency actions */}
            <section aria-label="Quick actions" className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Quick actions</h2>
                  <p className="text-xs text-slate-500">Get to common tasks in one tap</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" onClick={() => { setEditingProductForModal(null); setActiveTab('add-product'); }} className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-white"><Plus className="h-5 w-5" /></span>
                  <span className="min-w-0"><span className="block text-xs sm:text-sm font-semibold text-slate-800">Add product</span><span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">Create a listing</span></span>
                </button>
                <button type="button" onClick={() => { setCategoryInitialAction('add-category'); setActiveTab('categories'); }} className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 group-hover:bg-white"><Layers className="h-5 w-5" /></span>
                  <span className="min-w-0"><span className="block text-xs sm:text-sm font-semibold text-slate-800">Categories</span><span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">Organize catalog</span></span>
                </button>
                <button type="button" onClick={() => setActiveTab('inventory')} className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-200 hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:bg-white"><Package className="h-5 w-5" /></span>
                  <span className="min-w-0"><span className="block text-xs sm:text-sm font-semibold text-slate-800">Inventory</span><span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">{lowStockProducts.length} need attention</span></span>
                </button>
                <button type="button" onClick={() => setActiveTab('appearance')} className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-200 hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-white"><Palette className="h-5 w-5" /></span>
                  <span className="min-w-0"><span className="block text-xs sm:text-sm font-semibold text-slate-800">Storefront</span><span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">Update homepage</span></span>
                </button>
              </div>
            </section>

            {/* Store metrics */}
            <section aria-label="Store metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="text-xs sm:text-sm font-medium text-slate-500">Paid revenue</p><p className="mt-2 break-words text-xl sm:text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{formatPrice(totalRevenue, language)}</p></div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="h-4.5 w-4.5" /></span>
                </div>
                <p className="mt-3 text-[11px] leading-4 text-slate-500">Sum of orders marked as paid</p>
              </article>
              <button type="button" onClick={() => setActiveTab('orders')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="text-xs sm:text-sm font-medium text-slate-500">Total orders</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{orders.length}</p></div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ShoppingBag className="h-4.5 w-4.5" /></span>
                </div>
                <p className="mt-3 text-[11px] leading-4 text-indigo-700">{pendingOrders} awaiting dispatch <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></p>
              </button>
              <button type="button" onClick={() => setActiveTab('orders')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="text-xs sm:text-sm font-medium text-slate-500">Needs attention</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{pendingOrders}</p></div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock className="h-4.5 w-4.5" /></span>
                </div>
                <p className="mt-3 text-[11px] leading-4 text-slate-500">Pending or confirmed orders</p>
              </button>
              <button type="button" onClick={() => setActiveTab('inventory')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-rose-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="text-xs sm:text-sm font-medium text-slate-500">Low-stock products</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{lowStockProducts.length}</p></div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="h-4.5 w-4.5" /></span>
                </div>
                <p className="mt-3 text-[11px] leading-4 text-rose-700">{lowStockProducts.length > 0 ? 'Review stock levels' : 'No low-stock alerts'}</p>
              </button>
            </section>

            {/* Order pipeline at a glance */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-sm font-bold text-slate-900">Order pipeline</h2><p className="mt-0.5 text-xs text-slate-500">Current status of orders available to this dashboard</p></div>
                <button type="button" onClick={() => setActiveTab('orders')} className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 sm:mt-0">Manage orders <ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-amber-50 p-3"><p className="text-[11px] font-semibold text-amber-800">Pending</p><p className="mt-1 text-xl font-bold text-amber-950 tabular-nums">{orders.filter((o) => o.status === 'PENDING').length}</p></div>
                <div className="rounded-xl bg-indigo-50 p-3"><p className="text-[11px] font-semibold text-indigo-800">Processing</p><p className="mt-1 text-xl font-bold text-indigo-950 tabular-nums">{orders.filter((o) => o.status === 'PROCESSING' || o.status === 'CONFIRMED').length}</p></div>
                <div className="rounded-xl bg-sky-50 p-3"><p className="text-[11px] font-semibold text-sky-800">Shipped</p><p className="mt-1 text-xl font-bold text-sky-950 tabular-nums">{orders.filter((o) => o.status === 'SHIPPED').length}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] font-semibold text-emerald-800">Delivered</p><p className="mt-1 text-xl font-bold text-emerald-950 tabular-nums">{orders.filter((o) => o.status === 'DELIVERED').length}</p></div>
              </div>
            </section>

            {/* Recent orders: cards on small screens, table on desktop */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                <div className="min-w-0"><h2 className="text-sm sm:text-base font-bold text-slate-900">Recent orders</h2><p className="mt-1 text-xs text-slate-500">Latest order records currently available</p></div>
                <button type="button" onClick={() => setActiveTab('orders')} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800">View all <ChevronRight className="h-4 w-4" /></button>
              </div>
              {orders.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ShoppingBag className="h-6 w-6" /></span>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">No orders to show yet</h3>
                  <p className="mt-1 text-xs text-slate-500">New customer orders will appear here when they are available.</p>
                  <button type="button" onClick={() => setActiveTab('orders')} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open order management <ArrowUpRight className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {orders.slice(0, 5).map((ord) => (
                      <article key={ord.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">#{ord.orderNumber || ord.id}</p><p className="mt-1 truncate text-xs text-slate-500">{ord.customer.fullName}</p><p className="mt-0.5 text-[11px] text-slate-400">{formatDate(ord.createdAt, language)}</p></div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${ord.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : ord.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : ord.status === 'SHIPPED' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>{ord.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="min-w-0"><p className="text-xs font-semibold text-slate-700">{ord.paymentMethod}</p><p className="mt-0.5 text-[11px] text-slate-500">{ord.courier.provider}{ord.courier.trackingCode ? ` · ${ord.courier.trackingCode}` : ''}</p></div>
                          <p className="shrink-0 text-sm font-bold text-slate-950 tabular-nums">{formatPrice(ord.grandTotal, language)}</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => setSelectedAdminOrder(ord)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" /> Details</button>
                          <button type="button" onClick={() => setLastCreatedOrder(ord)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer className="h-3.5 w-3.5" /> Invoice</button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Order</th><th className="px-5 py-3 font-semibold">Customer</th><th className="px-5 py-3 font-semibold">Payment</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Courier</th><th className="px-5 py-3 text-right font-semibold">Total</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.slice(0, 5).map((ord) => (
                          <tr key={ord.id} className="transition hover:bg-slate-50/80">
                            <td className="px-5 py-3"><button type="button" onClick={() => setSelectedAdminOrder(ord)} className="font-semibold text-indigo-700 hover:underline">#{ord.orderNumber || ord.id}</button><p className="mt-1 text-[11px] text-slate-400">{formatDate(ord.createdAt, language)}</p></td>
                            <td className="px-5 py-3"><p className="font-semibold text-slate-800">{ord.customer.fullName}</p><p className="mt-1 text-xs text-slate-500">{ord.customer.phone}</p></td>
                            <td className="px-5 py-3"><p className="text-xs font-medium text-slate-700">{ord.paymentMethod}</p><p className={`mt-1 text-[10px] font-bold ${ord.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-slate-500'}`}>{ord.paymentStatus}</p></td>
                            <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ord.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : ord.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : ord.status === 'SHIPPED' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>{ord.status.replace(/_/g, ' ')}</span></td>
                            <td className="px-5 py-3"><p className="text-xs font-medium text-slate-700">{ord.courier.provider}</p><p className="mt-1 max-w-32 truncate text-[11px] text-slate-500">{ord.courier.trackingCode || 'Not booked'}</p></td>
                            <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{formatPrice(ord.grandTotal, language)}</td>
                            <td className="px-5 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedAdminOrder(ord)} className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700" aria-label={`View order ${ord.orderNumber || ord.id} details`} title="View details"><Eye className="h-4 w-4" /></button><button type="button" onClick={() => setLastCreatedOrder(ord)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={`Print invoice for order ${ord.orderNumber || ord.id}`} title="Print invoice"><Printer className="h-4 w-4" /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* Low-stock action center */}
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></span>
                  <div><h2 className="text-sm font-bold text-amber-950">Inventory attention</h2><p className="mt-1 text-xs leading-5 text-amber-900/80">{lowStockProducts.length > 0 ? `${lowStockProducts.length} product(s) are at or below their low-stock threshold. Review them before accepting more demand.` : 'No products are currently at or below their low-stock threshold.'}</p></div>
                </div>
                <button type="button" onClick={() => setActiveTab('inventory')} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><Package className="h-4 w-4" /> Manage inventory <ChevronRight className="h-4 w-4" /></button>
              </div>
              {lowStockProducts.length > 0 && <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{lowStockProducts.slice(0, 3).map((p) => <div key={p.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white p-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{p.name}</p><p className="mt-1 text-[11px] text-slate-500">Stock: <span className="font-bold text-amber-700">{p.stock}</span> · Alert at {p.lowStockThreshold}</p></div><span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">{p.stock <= 0 ? 'Out of stock' : 'Low stock'}</span></div>)}</div>}
            </section>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Customer Orders & Consignments</h3>
                <p className="text-xs text-slate-500">Review local order records; courier dispatch and status webhooks are not configured</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={adminOrderSearch}
                    onChange={(e) => setAdminOrderSearch(e.target.value)}
                    placeholder="Search by ID, name, phone..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="RETURN_REQUESTED">RETURN REQUESTED</option>
                </select>

                <button
                  onClick={handleExportOrdersCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-y border-slate-200">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Customer & Location</th>
                    <th className="p-3">Courier Provider</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono">
                        <button
                          onClick={() => setSelectedAdminOrder(ord)}
                          className="font-bold text-indigo-600 hover:text-indigo-900 hover:underline block text-left"
                        >
                          #{ord.orderNumber || ord.id}
                        </button>
                        <span className="text-[11px] text-slate-400">{formatDate(ord.createdAt, language)}</span>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900">{ord.customer.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{ord.customer.phone}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{ord.customer.addressDetails}, {(ord.customer.upazila || ord.customer.thanaCity)}</p>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-800 block">{ord.courier.provider}</span>
                          {ord.courier.bookingStatus === 'BOOKED' && ord.courier.trackingCode ? (
                            <span className="font-mono text-[11px] text-emerald-700 font-bold block">
                              {ord.courier.trackingCode}
                            </span>
                          ) : ord.courier.bookingStatus === 'BOOKING_FAILED' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Booking Failed
                            </span>
                          ) : ord.courier.bookingStatus === 'BOOKING_IN_PROGRESS' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 animate-pulse">
                              Booking...
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Not Booked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="block font-bold">{ord.paymentMethod}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'SHIPPED'
                              ? 'bg-blue-100 text-blue-800'
                              : ord.status === 'CONFIRMED'
                              ? 'bg-indigo-100 text-indigo-800'
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatPrice(ord.grandTotal, language)}
                      </td>
                      <td className="p-3 text-center space-x-1 whitespace-nowrap">
                        {/* Requirement: When order is placed, admin clicks Accept Order to book courier */}
                        {(ord.status === 'PENDING' || ord.status === 'CONFIRMED') && !['BOOKED', 'BOOKING_IN_PROGRESS', 'BOOKING_UNKNOWN'].includes(ord.courier.bookingStatus || 'NOT_BOOKED') && (
                          <button
                            onClick={() => handleAdminAcceptOrder(ord.id)}
                            disabled={processingOrderId === ord.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
                            title="Accept order and automatically create consignment in Pathao Courier"
                          >
                            {processingOrderId === ord.id ? (
                              <RotateCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Accept Order</span>
                          </button>
                        )}

                        {ord.courier.bookingStatus === 'BOOKING_FAILED' && (
                          <button
                            onClick={() => handleAdminRetryCourier(ord.id)}
                            disabled={processingOrderId === ord.id}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
                            title="Retry courier booking attempt"
                          >
                            <RotateCw className={`w-3 h-3 ${processingOrderId === ord.id ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        )}

                        {ord.courier.bookingStatus === 'BOOKED' && (
                          <button
                            onClick={() => handleAdminSyncCourier(ord.id)}
                            disabled={processingOrderId === ord.id}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                            title="Courier status sync is unavailable until a provider API is configured"
                          >
                            <RefreshCw className={`w-3 h-3 ${processingOrderId === ord.id ? 'animate-spin' : ''}`} />
                            <span>Sync</span>
                          </button>
                        )}

                        {ord.status === 'CONFIRMED' && ord.courier.bookingStatus === 'BOOKED' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'PROCESSING', 'Packed with protective sleeve')}
                            className="px-2 py-1 bg-slate-800 text-white rounded text-[11px] font-semibold hover:bg-slate-700"
                          >
                            Mark Packed
                          </button>
                        )}
                        {['PENDING', 'CONFIRMED', 'PROCESSING'].includes(ord.status) && !['BOOKED', 'BOOKING_IN_PROGRESS', 'BOOKING_UNKNOWN'].includes(ord.courier.bookingStatus || 'NOT_BOOKED') && (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(`Cancel order #${ord.orderNumber || ord.id}? Inventory will be restored if cancellation succeeds.`);
                              if (confirmed) updateOrderStatus(ord.id, 'CANCELLED', 'Cancelled by administrator');
                            }}
                            disabled={processingOrderId === ord.id}
                            className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold hover:bg-rose-100 disabled:opacity-50"
                            title="Cancel this order if no Pathao booking is active or unresolved"
                          >
                            Cancel Order
                          </button>
                        )}

                        {ord.paymentStatus === 'PAID' && (
                          <button
                            onClick={() => setRefundTargetOrder(ord)}
                            className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold hover:bg-rose-100 transition-colors"
                            title="Refund processing is not configured"
                          >
                            Refund
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedAdminOrder(ord)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold hover:bg-slate-200"
                          title="View order details, delivery address, and courier tracking history"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => setLastCreatedOrder(ord)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold hover:bg-slate-200"
                          title="Print Invoice"
                        >
                          Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADD PRODUCT PAGE */}
        {activeTab === 'add-product' && (
          <div className="space-y-4 sm:space-y-5">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('products');
                  setEditingProductForModal(null);
                }}
                className="hover:text-indigo-600 transition-colors"
              >
                Admin
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => {
                  setActiveTab('products');
                  setEditingProductForModal(null);
                }}
                className="hover:text-indigo-600 transition-colors"
              >
                Products
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">
                {editingProductForModal ? 'Edit product' : 'Create product'}
              </span>
            </nav>
            <CreateProductModal
              isOpen={true}
              presentation="page"
              productToEdit={editingProductForModal}
              onClose={() => {
                setEditingProductForModal(null);
                setActiveTab('products');
              }}
            />
          </div>
        )}

        {/* TAB 3: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Product Catalog Management</h3>
                <p className="text-xs text-slate-500">
                  Create, edit details, variants, multi-image gallery, SEO metadata, duplicate, and bulk actions
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <button
                  onClick={() => {
                    setCategoryInitialAction('add-category');
                    setActiveTab('categories');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-2xs transition-colors active:scale-95"
                  title="Add a new main category"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ Add Category</span>
                </button>

                <button
                  onClick={() => {
                    setCategoryInitialAction('add-subcategory');
                    setActiveTab('categories');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-2xs transition-colors active:scale-95"
                  title="Add a new sub-category"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Add Sub-Category</span>
                </button>

                <button
                  onClick={() => {
                    setEditingProductForModal(null);
                    setActiveTab('add-product');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by product name, SKU, or category..."
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="ALL">All Categories ({products.length})</option>
                    {(categories || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({products.filter((p) => p.category === cat.id).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-2.5">
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-2">Status:</span>
                {(
                  [
                    { id: 'ALL', label: `All (${products.filter((p) => !p.archived).length})` },
                    { id: 'PUBLISHED', label: `Published (${products.filter((p) => !p.archived && p.published).length})` },
                    { id: 'DRAFT', label: `Draft (${products.filter((p) => !p.archived && !p.published).length})` },
                    {
                      id: 'LOW_STOCK',
                      label: `Low Stock (${products.filter((p) => !p.archived && p.stock <= p.lowStockThreshold).length})`,
                    },
                    { id: 'ARCHIVED', label: `Archived (${products.filter((p) => p.archived).length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setProductStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      productStatusFilter === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedProductIds.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-900 px-2 py-0.5 bg-indigo-100 rounded-md">
                    {selectedProductIds.length}
                  </span>
                  <span className="font-semibold text-indigo-900">
                    {selectedProductIds.length === 1 ? 'product selected' : 'products selected'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {productStatusFilter === 'ARCHIVED' && (
                    <button
                      onClick={() => {
                        bulkUpdateProducts(selectedProductIds, 'restore');
                        setSelectedProductIds([]);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
                    >
                      Restore Selected
                    </button>
                  )}
                  <button
                    onClick={() => {
                      bulkUpdateProducts(selectedProductIds, 'publish');
                      setSelectedProductIds([]);
                      showToast('Selected products published to storefront', 'success');
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
                  >
                    Publish Selected
                  </button>
                  <button
                    onClick={() => {
                      bulkUpdateProducts(selectedProductIds, 'unpublish');
                      setSelectedProductIds([]);
                      showToast('Selected products saved as draft', 'info');
                    }}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
                  >
                    Unpublish (Draft)
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Archive ${selectedProductIds.length} selected products and remove them from the storefront?`)) {
                        bulkUpdateProducts(selectedProductIds, 'delete');
                        setSelectedProductIds([]);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
                  >
                    Archive Selected
                  </button>
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="px-2 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-indigo-100/60 rounded-lg transition-colors font-medium ml-1"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            {/* Products Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <button
                          onClick={() => {
                            const allFilteredSelected =
                              filteredProducts.length > 0 &&
                              filteredProducts.every((p) => selectedProductIds.includes(p.id));
                            if (allFilteredSelected) {
                              setSelectedProductIds((prev) =>
                                prev.filter((id) => !filteredProducts.some((p) => p.id === id))
                              );
                            } else {
                              const newIds = new Set([
                                ...selectedProductIds,
                                ...filteredProducts.map((p) => p.id),
                              ]);
                              setSelectedProductIds(Array.from(newIds));
                            }
                          }}
                          className="text-slate-500 hover:text-indigo-600"
                          title="Select all filtered"
                        >
                          {filteredProducts.length > 0 &&
                          filteredProducts.every((p) => selectedProductIds.includes(p.id)) ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock Level</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedProductIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                                );
                              }}
                              className="text-slate-400 hover:text-indigo-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 flex items-center gap-3">
                            <StoreImage
                              src={p.images?.[0]}
                              alt={p.name}
                              className="w-10 h-10 rounded object-cover border border-slate-200 bg-white shrink-0"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-xs">{p.name}</p>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-700 font-semibold">{p.sku}</td>
                          <td className="p-3 text-slate-600">{p.category}</td>
                          <td className="p-3 font-bold text-slate-900 tabular-nums">
                            {formatPrice(p.price, language)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-mono font-bold ${
                                p.stock <= 0
                                  ? 'text-rose-600'
                                  : p.stock <= p.lowStockThreshold
                                  ? 'text-amber-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {p.stock} units
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => updateProduct({ ...p, published: !p.published })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                p.published
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title="Click to toggle publish status"
                            >
                              {p.published ? 'Published' : 'Draft'}
                            </button>
                          </td>
                          <td className="p-3 text-center space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSocialTargetProduct(p);
                                setActiveTab('social');
                                setIsMobileDrawerOpen(false);
                              }}
                              disabled={!p.published || p.stock <= 0}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title={!p.published ? 'Publish this product before promoting it' : p.stock <= 0 ? 'Out-of-stock products cannot be promoted' : 'Create an AI social post for this product'}
                            >
                              <Megaphone className="w-3 h-3" /> Boost
                            </button>
                            <button
                              onClick={() => {
                                setEditingProductForModal(p);
                                setActiveTab('add-product');
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                              title="Full Edit (Details, Images, Variants, Specifications, SEO)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                duplicateProduct(p.id);
                                showToast(`Product "${p.name}" duplicated as draft`, 'info');
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                              title="Duplicate Product"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingPriceProduct(p);
                                setTempPriceInput(p.price);
                              }}
                              className="p-1 text-slate-500 hover:text-amber-600 rounded hover:bg-slate-100 transition-colors"
                              title="Quick Edit Price"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteProductCandidate(p)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                              title="Archive Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          <p className="font-semibold text-slate-600 text-sm">No products found</p>
                          <p className="text-xs mt-1">Try adjusting your search terms or filter selection.</p>
                          {(productSearch || productCategoryFilter !== 'ALL' || productStatusFilter !== 'ALL') && (
                            <button
                              onClick={() => {
                                setProductSearch('');
                                setProductCategoryFilter('ALL');
                                setProductStatusFilter('ALL');
                              }}
                              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                            >
                              Reset Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Quick Edit Price */}
        {editingPriceProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-slate-900 text-sm">Update Retail Price</h3>
                <button onClick={() => setEditingPriceProduct(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-2 truncate">
                  Product: <strong className="text-slate-900">{editingPriceProduct.name}</strong>
                </p>
                <label className="font-semibold block text-xs text-slate-700 mb-1">New Price (৳ BDT)</label>
                <input
                  type="number"
                  min="1"
                  value={tempPriceInput}
                  onChange={(e) => setTempPriceInput(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold font-mono text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPriceProduct(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempPriceInput > 0) {
                      updateProduct({ ...editingPriceProduct, price: tempPriceInput });
                      setEditingPriceProduct(null);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Save Price
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Product Confirmation */}
        {deleteProductCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-sm">Archive Product</h3>
                </div>
                <button onClick={() => setDeleteProductCandidate(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-900">{deleteProductCandidate.name}</strong> from the storefront? It will be archived so existing order history remains intact.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteProductCandidate(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteProduct(deleteProductCandidate.id);
                    setDeleteProductCandidate(null);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Archive Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Order Details & Courier Inspection Modal */}
        {selectedAdminOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 text-lg">Order #{selectedAdminOrder.orderNumber || selectedAdminOrder.id}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedAdminOrder.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedAdminOrder.status === 'SHIPPED'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedAdminOrder.status === 'CONFIRMED'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedAdminOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Placed on {formatDate(selectedAdminOrder.createdAt, language)}</p>
                </div>
                <button
                  onClick={() => setSelectedAdminOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Quick Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Customer Details</span>
                  <p className="font-bold text-slate-900">{selectedAdminOrder.customer.fullName}</p>
                  <p className="font-mono text-slate-700">{selectedAdminOrder.customer.phone}</p>
                  <p className="text-slate-500 truncate">{selectedAdminOrder.customer.email}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Delivery Address</span>
                  <p className="text-slate-800 font-medium">{selectedAdminOrder.customer.addressDetails}</p>
                  <p className="text-slate-600">{(selectedAdminOrder.customer.upazila || selectedAdminOrder.customer.thanaCity)}, {selectedAdminOrder.customer.district}</p>
                  <p className="text-slate-500 font-semibold">{selectedAdminOrder.customer.division} Division</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Payment & COD</span>
                  <p className="font-bold text-slate-900">Method: {selectedAdminOrder.paymentMethod}</p>
                  <p className="font-mono font-bold text-indigo-700">Total: {formatPrice(selectedAdminOrder.grandTotal, language)}</p>
                  <p className="text-slate-600">Status: <strong className={selectedAdminOrder.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-slate-700'}>{selectedAdminOrder.paymentStatus}</strong></p>
                </div>
              </div>

              {/* Courier Logistics Section */}
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900">Courier Logistics ({selectedAdminOrder.courier.provider})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedAdminOrder.courier.bookingStatus === 'BOOKED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedAdminOrder.courier.bookingStatus === 'BOOKING_FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedAdminOrder.courier.bookingStatus === 'BOOKING_IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {selectedAdminOrder.courier.bookingStatus || 'NOT_BOOKED'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Accept Order Action */}
                    {['PENDING', 'CONFIRMED'].includes(selectedAdminOrder.status) && !['BOOKED', 'BOOKING_IN_PROGRESS', 'BOOKING_FAILED', 'BOOKING_UNKNOWN'].includes(selectedAdminOrder.courier.bookingStatus || 'NOT_BOOKED') && (
                      <button
                        onClick={async () => {
                          await handleAdminAcceptOrder(selectedAdminOrder.id);
                          const updated = orders.find(o => o.id === selectedAdminOrder.id);
                          if (updated) setSelectedAdminOrder(updated);
                        }}
                        disabled={processingOrderId === selectedAdminOrder.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {processingOrderId === selectedAdminOrder.id ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Accept & Book Courier</span>
                      </button>
                    )}

                    {/* Retry Action */}
                    {selectedAdminOrder.courier.bookingStatus === 'BOOKING_FAILED' && (
                      <button
                        onClick={async () => {
                          await handleAdminRetryCourier(selectedAdminOrder.id);
                          const updated = orders.find(o => o.id === selectedAdminOrder.id);
                          if (updated) setSelectedAdminOrder(updated);
                        }}
                        disabled={processingOrderId === selectedAdminOrder.id}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${processingOrderId === selectedAdminOrder.id ? 'animate-spin' : ''}`} />
                        <span>Retry Booking</span>
                      </button>
                    )}

                    {/* Live Sync Action */}
                    {selectedAdminOrder.courier.bookingStatus === 'BOOKED' && (
                      <button
                        onClick={async () => {
                          await handleAdminSyncCourier(selectedAdminOrder.id);
                          const updated = orders.find(o => o.id === selectedAdminOrder.id);
                          if (updated) setSelectedAdminOrder(updated);
                        }}
                        disabled={processingOrderId === selectedAdminOrder.id}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${processingOrderId === selectedAdminOrder.id ? 'animate-spin' : ''}`} />
                        <span>Sync Status</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tracking Code:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {selectedAdminOrder.courier.trackingCode || 'Pending Booking'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Consignment ID:</span>
                    <span className="font-mono text-slate-800">
                      {selectedAdminOrder.courier.consignmentId || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Estimated Delivery:</span>
                    <span className="text-slate-800">{selectedAdminOrder.courier.estimatedDelivery}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Booked At:</span>
                    <span className="font-mono text-slate-600">{selectedAdminOrder.courier.bookedAt || 'Not booked'}</span>
                  </div>
                </div>

                {selectedAdminOrder.courier.bookingError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span><strong>Booking Error:</strong> {selectedAdminOrder.courier.bookingError}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-900">Order Items ({selectedAdminOrder.items.length})</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {selectedAdminOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <StoreImage src={item.image} alt={item.productName} className="w-10 h-10 rounded object-cover border bg-white" loading="lazy" decoding="async" />
                        <div>
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          {item.variantLabel && <p className="text-[11px] text-slate-500">{item.variantLabel}</p>}
                          {item.variantSku && <p className="text-[10px] text-slate-400">Variant SKU: {item.variantSku}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-slate-700">Qty: {item.quantity} × {formatPrice(item.price, language)}</p>
                        <p className="font-bold text-slate-900">{formatPrice(item.price * item.quantity, language)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History & Audit Trail */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-900">Status History & Audit Trail</h4>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 text-xs font-mono">
                  {selectedAdminOrder.statusHistory.map((sh, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                      <span className="text-slate-400 shrink-0">{formatDate(sh.timestamp, language)}</span>
                      <span className="font-bold text-indigo-700 shrink-0">[{sh.status}]</span>
                      <span className="text-slate-700 font-sans">{sh.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                {['PENDING', 'CONFIRMED', 'PROCESSING'].includes(selectedAdminOrder.status) && !['BOOKED', 'BOOKING_IN_PROGRESS', 'BOOKING_UNKNOWN'].includes(selectedAdminOrder.courier.bookingStatus || 'NOT_BOOKED') && (
                  <button
                    type="button"
                    onClick={() => {
                      const orderLabel = selectedAdminOrder.orderNumber || selectedAdminOrder.id;
                      const paymentWarning = selectedAdminOrder.paymentStatus === 'PAID'
                        ? '\\n\\nThis order is marked PAID. Cancellation will not automatically refund the payment.'
                        : '';
                      if (window.confirm(`Cancel order #${orderLabel}? Inventory will be restored if cancellation succeeds.${paymentWarning}`)) {
                        updateOrderStatus(selectedAdminOrder.id, 'CANCELLED', 'Cancelled by administrator');
                        setSelectedAdminOrder(null);
                      }
                    }}
                    disabled={processingOrderId === selectedAdminOrder.id}
                    className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg hover:bg-rose-100 disabled:opacity-50"
                    title="Cancel eligible order after server-side courier checks"
                  >
                    Cancel Order
                  </button>
                )}
                {selectedAdminOrder.paymentStatus === 'PAID' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefundTargetOrder(selectedAdminOrder);
                      setSelectedAdminOrder(null);
                    }}
                    className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Initiate Refund</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLastCreatedOrder(selectedAdminOrder);
                    setSelectedAdminOrder(null);
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                >
                  Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAdminOrder(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CATEGORIES */}
        {activeTab === 'categories' && (
          <CategoriesManager
            initialAction={categoryInitialAction}
            onActionConsumed={() => setCategoryInitialAction(null)}
            onViewCategoryProducts={(catId) => {
              setProductCategoryFilter(catId);
              setActiveTab('products');
            }}
          />
        )}

        {/* TAB: INVENTORY CONTROL & ATOMIC ADJUSTMENTS */}
        {activeTab === 'inventory' && <InventoryManager />}

        {/* TAB: DELIVERY & TRACKING — PATHAO */}
        {activeTab === 'logistics' && <PathaoCourierManager />}

        {/* TAB: PAYMENTS & FINANCE */}
        {activeTab === 'payments' && (() => {
          const paidOrders = orders.filter((order) => order.paymentStatus === 'PAID');
          const pendingPayments = orders.filter((order) => order.paymentStatus !== 'PAID');
          const refundedOrders = orders.filter((order) => order.paymentStatus === 'REFUNDED');
          const paymentTotal = paidOrders.reduce((sum, order) => sum + order.grandTotal, 0);
          const currency = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;
          return (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payments & Finance</h2>
                <p className="mt-1 text-sm text-slate-500">Payment status, order transactions, and refund actions.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Paid Revenue</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">{currency(paymentTotal)}</p>
                  <p className="mt-1 text-xs text-slate-500">{paidOrders.length} paid orders</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Pending Payments</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">{pendingPayments.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Orders not marked paid</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Total Orders</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{orders.length}</p>
                  <p className="mt-1 text-xs text-slate-500">All recorded orders</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Refunded Orders</p>
                  <p className="mt-2 text-2xl font-bold text-rose-700">{refundedOrders.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Marked as refunded</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Payment Transactions</h3>
                    <p className="mt-1 text-xs text-slate-500">Transaction status is based on the current order record.</p>
                  </div>
                  <button type="button" onClick={handleExportOrdersCSV} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                </div>
                {orders.length === 0 ? (
                  <div className="p-10 text-center">
                    <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-700">No payment transactions yet</p>
                    <p className="mt-1 text-sm text-slate-500">Orders will appear here when customers place them.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Order</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Payment Status</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">#{order.orderNumber || order.id}</td>
                            <td className="px-4 py-3 text-slate-700">{order.customer.fullName}</td>
                            <td className="px-4 py-3 text-slate-600">{order.paymentMethod}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{currency(order.grandTotal)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : order.paymentStatus === 'REFUNDED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{order.paymentStatus}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(order.createdAt, language)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setSelectedAdminOrder(order)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Details</button>
                                {order.paymentStatus === 'PAID' && <button type="button" onClick={() => setRefundTargetOrder(order)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Refund</button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">Note: this screen summarizes saved order records. Gateway verification and settlement reconciliation must be configured separately; an order status alone does not confirm a bank or mobile-wallet settlement.</p>
            </div>
          );
        })()}

        {/* TAB: APPEARANCE & STOREFRONT CMS */}
        {activeTab === 'appearance' && <StorefrontCMSManager />}

        {/* TAB: PAGES & LEGAL POLICIES CMS */}
        {activeTab === 'pages' && <PagesCMSManager />}

        {/* TAB: CUSTOMERS DIRECTORY & SEGMENTS */}
        {activeTab === 'customers' && (
          <CustomersManager onViewOrderDetails={(ord) => setSelectedAdminOrder(ord)} />
        )}

        {/* TAB: ANALYTICS & REPORTS */}
                {/* TAB 6: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Coupon Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Create Promotional Coupon</h3>
              <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DHAKA20"
                    className="w-full px-3 py-2 border rounded-lg font-mono uppercase focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Type</label>
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="PERCENTAGE">% Percentage</option>
                      <option value="FIXED">Fixed (৳ BDT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Value</label>
                    <input
                      type="number"
                      required
                      value={newCouponVal}
                      onChange={(e) => setNewCouponVal(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Minimum Order (৳ BDT)</label>
                  <input
                    type="number"
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Create Promo Coupon
                </button>
              </form>
            </div>

            {/* Existing Coupons */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Active Coupons</h3>
              <div className="space-y-3">
                {coupons.map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-indigo-700">{c.code}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
                          {c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `৳${c.value} OFF`}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded font-semibold text-[10px]">
                          1 Use / Customer Limit
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{c.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Min spend: ৳{c.minSpend.toLocaleString()} · Used: {c.usageCount} orders
                        {c.usedBy && c.usedBy.length > 0 ? ` (${c.usedBy.length} unique buyers)` : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleCouponActive(c.code)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        c.active ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {c.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Q&A MODERATION */}
        {activeTab === 'qa' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Customer Inquiries & Product Q&A</h3>
              <p className="text-xs text-slate-500">Answer buyer questions regarding sizing, shipping, and warranty</p>
            </div>

            <div className="space-y-4">
              {questions.map((q) => {
                const prod = products.find((p) => p.id === q.productId);
                return (
                  <div key={q.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        Product: {prod?.name || 'General Inquiry'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{formatDateOnly(q.createdAt, language)}</span>
                    </div>

                    <p className="text-slate-800">
                      <strong className="text-indigo-600">Question from {q.userName}:</strong> {q.question}
                    </p>

                    {q.answer ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-emerald-900">
                          <strong>Concierge Published Answer:</strong> {q.answer}
                        </p>
                        <span className="text-[10px] text-emerald-700 font-mono mt-0.5 block">
                          Answered on {formatDate(q.answeredAt, language)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={replyTextMap[q.id] || ''}
                          onChange={(e) =>
                            setReplyTextMap((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Type authoritative answer for this customer..."
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const ans = replyTextMap[q.id];
                            if (ans?.trim()) {
                              answerQuestion(q.id, ans.trim());
                              setReplyTextMap((prev) => ({ ...prev, [q.id]: '' }));
                            }
                          }}
                          className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                        >
                          Publish
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & CMS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-3xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Store Information & Delivery Fees</h3>
              <p className="text-xs text-slate-500">Manage store contact details, footer content, and delivery pricing. Homepage announcements are managed under Homepage Design.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Brand & Store Name</label>
                <input
                  type="text"
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-1 block font-semibold">Store logo</label>
                <p id="store-logo-help" className="mb-3 text-[11px] leading-5 text-slate-500">Upload a logo from your device or paste a public HTTPS image URL. The logo will appear beside the store name in the header and footer. Use a transparent PNG or WebP for best results.</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="sr-only" disabled={logoUploadBusy} onChange={handleLogoFileChange} aria-label="Upload store logo from device" />
                    {logoUploadBusy ? 'Uploading logo…' : 'Upload from device'}
                  </label>
                  {logoUrlInput && <button type="button" onClick={() => setLogoUrlInput('')} className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white">Remove logo</button>}
                </div>
                <label htmlFor="store-logo-url" className="mt-4 mb-1 block font-semibold">Or use logo URL</label>
                <input id="store-logo-url" type="url" maxLength={2048} value={logoUrlInput} onChange={(e) => setLogoUrlInput(e.target.value)} placeholder="https://res.cloudinary.com/.../logo.webp" className="w-full rounded-lg border bg-white px-3 py-2 focus:border-indigo-600 focus:outline-none" aria-describedby="store-logo-help" />
                {logoUrlInput.trim().startsWith('https://') && <div className="mt-3 flex min-h-16 items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3"><img src={logoUrlInput.trim()} alt="Store logo preview" className="h-12 w-12 object-contain" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /><span className="min-w-0 break-words text-sm font-bold text-slate-900">{storeNameInput.trim() || 'Store'}</span><span className="text-[11px] text-slate-500">Header & footer preview</span></div>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Inside Dhaka Shipping (৳)</label>
                  <input
                    type="number"
                    value={shippingDhakaInput}
                    onChange={(e) => setShippingDhakaInput(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Outside Dhaka Shipping (৳)</label>
                  <input
                    type="number"
                    value={shippingOutsideInput}
                    onChange={(e) => setShippingOutsideInput(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Free Shipping Min (৳)</label>
                  <input
                    type="number"
                    value={freeThresholdInput}
                    onChange={(e) => setFreeThresholdInput(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="mb-1 text-sm font-bold text-slate-900">Footer & Contact Details</h4>
                <p className="mb-4 text-xs text-slate-500">These details appear in the public storefront footer after saving.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-semibold">Store tagline</label>
                    <input type="text" maxLength={180} value={taglineInput} onChange={(e) => setTaglineInput(e.target.value)} placeholder="Thoughtfully selected essentials..." className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Contact phone</label>
                    <input type="tel" maxLength={40} value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="+8801XXXXXXXXX" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Contact email</label>
                    <input type="email" maxLength={254} value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="support@example.com" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Store address</label>
                    <input type="text" maxLength={300} value={addressInput} onChange={(e) => setAddressInput(e.target.value)} placeholder="Area, city, Bangladesh" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-semibold">Footer description (optional)</label>
                    <textarea rows={2} maxLength={500} value={footerDescriptionInput} onChange={(e) => setFooterDescriptionInput(e.target.value)} placeholder="Short description about your store" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-semibold">Copyright text</label>
                    <input type="text" maxLength={160} value={footerCopyrightInput} onChange={(e) => setFooterCopyrightInput(e.target.value)} placeholder="All rights reserved." className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="mb-1 text-sm font-bold text-slate-900">Social Media Links</h4>
                <p className="mb-4 text-xs text-slate-500">Only secure HTTPS links are shown on the storefront. Leave a field empty to hide that social icon.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-semibold">WhatsApp number (international format)</label>
                    <input type="tel" maxLength={24} value={whatsappInput} onChange={(e) => setWhatsappInput(e.target.value)} placeholder="8801XXXXXXXXX" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Facebook page URL</label>
                    <input type="url" maxLength={500} value={facebookInput} onChange={(e) => setFacebookInput(e.target.value)} placeholder="https://facebook.com/yourpage" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Instagram URL</label>
                    <input type="url" maxLength={500} value={instagramInput} onChange={(e) => setInstagramInput(e.target.value)} placeholder="https://instagram.com/yourpage" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">TikTok URL</label>
                    <input type="url" maxLength={500} value={tiktokInput} onChange={(e) => setTiktokInput(e.target.value)} placeholder="https://tiktok.com/@yourpage" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">YouTube URL</label>
                    <input type="url" maxLength={500} value={youtubeInput} onChange={(e) => setYoutubeInput(e.target.value)} placeholder="https://youtube.com/@yourchannel" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="mb-1 text-sm font-bold text-slate-900">Payment Badges</h4>
                <p className="mb-3 text-xs text-slate-500">Comma-separated labels shown in the footer, e.g. COD, bKash, Nagad. Add only payment methods that your store actually supports.</p>
                <input type="text" maxLength={200} value={paymentMethodsInput} onChange={(e) => setPaymentMethodsInput(e.target.value)} placeholder="COD, bKash" className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="mb-1 text-sm font-bold text-slate-900">Payment method badges</h4>
                <p className="mb-3 text-xs text-slate-500">Enter only payment methods that are actually available at checkout. Use one per line or separate them with commas.</p>
                <textarea rows={3} maxLength={600} value={footerPaymentMethodsInput} onChange={(e) => setFooterPaymentMethodsInput(e.target.value)} placeholder={'Cash on delivery\nbKash'} className="w-full rounded-lg border px-3 py-2 focus:border-indigo-600 focus:outline-none" />
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="mb-3 text-sm font-bold text-slate-900">Footer Visibility</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Show phone number', checked: showPhoneInFooter, onChange: setShowPhoneInFooter },
                    { label: 'Show email address', checked: showEmailInFooter, onChange: setShowEmailInFooter },
                    { label: 'Show store address', checked: showAddressInFooter, onChange: setShowAddressInFooter },
                    { label: 'Show social media icons', checked: showSocialLinksInFooter, onChange: setShowSocialLinksInFooter },
                    { label: 'Show payment badges', checked: showPaymentBadgesInFooter, onChange: setShowPaymentBadgesInFooter },
                    { label: 'Show all contact details', checked: footerContactVisible, onChange: setFooterContactVisible },
                    { label: 'Show explore navigation', checked: footerNavigationVisible, onChange: setFooterNavigationVisible },
                    { label: 'Show customer care links', checked: footerCustomerCareVisible, onChange: setFooterCustomerCareVisible },
                    { label: 'Show payment & delivery section', checked: footerPaymentDeliveryVisible, onChange: setFooterPaymentDeliveryVisible },
                    { label: 'Show app install button', checked: footerPwaVisible, onChange: setFooterPwaVisible },
                  ].map((item) => (
                    <label key={item.label} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-slate-700">
                      <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
              >
                Save Store Configuration
              </button>
            </form>

            {/* Admin Security Card Shortcut */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Admin Password & Credential Security</h4>
                  <p className="text-[11px] text-slate-500">Manage administrator login password and account credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: ADMIN PROFILE & SECURITY */}
        {activeTab === 'security' && (
          <div className="max-w-2xl space-y-6">
            {/* Super Admin Status Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Administrator Credentials</h3>
                    <p className="text-xs text-slate-400">
                      Primary administrative account with full operational control
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-bold">
                  Superuser Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800 text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Admin User</span>
                  <strong className="text-white">{userProfile?.displayName || '—'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <strong className="text-white font-mono">{userProfile?.email || 'unknown administrator'}</strong>
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Change Administrator Password</h3>
                  <p className="text-xs text-slate-500">
                    Update your dashboard master password. All changes are logged into the system audit trail.
                  </p>
                </div>
              </div>

              {/* Status alerts */}
              {adminPwdError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Password Update Error</strong>
                    <span>{adminPwdError}</span>
                  </div>
                </div>
              )}

              {adminPwdSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Password Updated</strong>
                    <span>{adminPwdSuccess}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleAdminChangePassword} className="space-y-4 text-xs">
                {/* Current Admin Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminCurrentPwd ? 'text' : 'password'}
                      value={adminCurrentPassword}
                      onChange={(e) => setAdminCurrentPassword(e.target.value)}
                      placeholder="Enter current admin password"
                      className="w-full px-3 py-2 pr-10 bg-slate-50/50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminCurrentPwd(!showAdminCurrentPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Use your administrator account password.
                  </p>
                </div>

                {/* New Admin Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminNewPwd ? 'text' : 'password'}
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Enter new strong password (min 6 characters)"
                      className="w-full px-3 py-2 pr-10 bg-slate-50/50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminNewPwd(!showAdminNewPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {adminNewPassword.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            adminNewPassword.length < 6
                              ? 'w-1/4 bg-rose-500'
                              : adminNewPassword.length < 8
                              ? 'w-2/3 bg-amber-500'
                              : 'w-full bg-emerald-500'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {adminNewPassword.length < 6
                          ? 'Too short'
                          : adminNewPassword.length < 8
                          ? 'Moderate'
                          : 'Strong'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Admin Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminConfirmPwd ? 'text' : 'password'}
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2 pr-10 bg-slate-50/50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminConfirmPwd(!showAdminConfirmPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {adminConfirmPassword && adminNewPassword !== adminConfirmPassword && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Logged to Audit Trail</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isAdminPwdLoading}
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isAdminPwdLoading ? (
                      <span>Updating...</span>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Update Admin Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: SOCIAL MEDIA STUDIO */}
        {activeTab === 'social' && (
          <SocialPostStudio
            products={products}
            initialProduct={socialTargetProduct}
            onInitialProductHandled={clearSocialTargetProduct}
          />
        )}

        {/* TAB: OPERATIONAL NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <NotificationsManager
            onUnreadCountChange={handleUnreadNotificationCountChange}
            onOpenOrder={(orderId) => {
              const order = orders.find((item) => item.id === orderId);
              setActiveTab('orders');
              if (order) setSelectedAdminOrder(order);
              setIsMobileDrawerOpen(false);
            }}
          />
        )}

        {/* TAB: SECURITY & OPERATIONAL AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Security & Operational Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable record of inventory adjustments, order states, and financial events</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-y border-slate-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action Type</th>
                    <th className="p-3">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(log.timestamp, language)}</td>
                      <td className="p-3 text-slate-800 whitespace-nowrap">{log.actor}</td>
                      <td className="p-3 font-bold text-indigo-700">{log.action}</td>
                      <td className="p-3 text-slate-600 font-sans">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Process Refund */}
        {refundTargetOrder && (
          <RefundModal
            order={refundTargetOrder}
            onClose={() => setRefundTargetOrder(null)}
          />
        )}
        </div>
      </div>
    </div>
  );
};
