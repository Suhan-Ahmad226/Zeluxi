import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { StoreImage } from '../common/StoreImage';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../utils/formatters';
import {
  Package,
  Heart,
  Tag,
  User,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  Edit2,
  Save,
  Copy,
  Check,
  LogOut,
  LogIn,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  LayoutDashboard,
  Truck,
  MapPin,
  HelpCircle,
  Phone,
  MessageCircle,
  Clock,
  RotateCcw,
  Search,
  FileText,
  Download,
} from 'lucide-react';

function escapeInvoiceText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch);
}
function openOrderInvoice(order: import('../../types').Order, settings: import('../../types').StoreSettings, language: import('../../types').Language) {
  const popup = window.open('', '_blank', 'width=900,height=720');
  if (!popup) { window.alert('Allow pop-ups to print or save your invoice as PDF.'); return; }
  const rows = order.items.map((item) => {
    const attributes = Object.entries(item.variantAttributes || {}).map(([key, value]) => escapeInvoiceText(key) + ': ' + escapeInvoiceText(value)).join(' · ');
    const image = item.image ? '<img class="item-image" src="' + escapeInvoiceText(item.image) + '" alt="' + escapeInvoiceText(item.productName) + '">' : '';
    const specifications = Object.entries(item.specifications || {}).map(([key, value]) => escapeInvoiceText(key) + ': ' + escapeInvoiceText(value)).join(' · ');
    const details = [
      item.productSku ? 'Product SKU: ' + escapeInvoiceText(item.productSku) : '',
      item.brand ? 'Brand: ' + escapeInvoiceText(item.brand) : '',
      item.barcode ? 'Barcode: ' + escapeInvoiceText(item.barcode) : '',
      item.description ? escapeInvoiceText(item.description) : '',
      specifications,
    ].filter(Boolean).map((value) => '<div>' + value + '</div>').join('');
    return '<tr><td><div class="item"><div>' + image + '</div><div><strong>' + escapeInvoiceText(item.productName) + '</strong>' + (item.variantLabel ? '<div>' + escapeInvoiceText(item.variantLabel) + '</div>' : '') + (attributes ? '<div>' + attributes + '</div>' : '') + (item.variantSku ? '<div>Variant SKU: ' + escapeInvoiceText(item.variantSku) + '</div>' : '') + details + '</div></div></td><td>' + item.quantity + '</td><td>' + escapeInvoiceText(formatPrice(item.price, language)) + '</td><td>' + escapeInvoiceText(formatPrice(item.price * item.quantity, language)) + '</td></tr>';
  }).join('');
  const customer = order.customer;
  const address = [customer.addressDetails, customer.thanaCity, customer.district, customer.division, customer.postalCode].filter(Boolean).join(', ');
  popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Invoice ' + escapeInvoiceText(order.orderNumber || order.id) + '</title><style>body{font:14px Arial;color:#0f172a;padding:24px;max-width:850px;margin:auto}header{display:flex;justify-content:space-between;border-bottom:2px solid;padding-bottom:16px}section{margin:20px 0}table{width:100%;border-collapse:collapse}td,th{padding:10px 6px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.item{display:flex;gap:10px;align-items:flex-start}.item-image{width:56px;height:56px;object-fit:contain;border:1px solid #e5e7eb;border-radius:6px}.totals{max-width:330px;margin-left:auto}.total{display:flex;justify-content:space-between;padding:5px 0}.grand{border-top:1px solid #aaa;font-size:18px;font-weight:bold;padding-top:12px}@media print{.no-print{display:none}}@media(max-width:600px){header{display:block}td,th{font-size:11px;padding:5px 2px}}</style></head><body><header><div><h1>' + escapeInvoiceText(settings.storeName || 'Zeluxi') + '</h1><div>' + escapeInvoiceText(settings.address || '') + '</div><div>' + escapeInvoiceText(settings.phone || '') + ' · ' + escapeInvoiceText(settings.email || '') + '</div></div><div><h2>INVOICE</h2><strong>Order #' + escapeInvoiceText(order.orderNumber || order.id) + '</strong><div>' + escapeInvoiceText(formatDate(order.createdAt, language)) + '</div><div>Status: ' + escapeInvoiceText(order.status) + '</div></div></header><section><h2>Customer & delivery</h2><strong>' + escapeInvoiceText(customer.fullName) + '</strong><div>' + escapeInvoiceText(customer.phone) + ' · ' + escapeInvoiceText(customer.email || '') + '</div><div>' + escapeInvoiceText(address) + '</div>' + (customer.notes ? '<div>Delivery notes: ' + escapeInvoiceText(customer.notes) + '</div>' : '') + '</section><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table><section class="totals"><div class="total"><span>Subtotal</span><strong>' + escapeInvoiceText(formatPrice(order.subtotal, language)) + '</strong></div><div class="total"><span>Shipping</span><strong>' + escapeInvoiceText(formatPrice(order.shippingFee, language)) + '</strong></div>' + (order.discount > 0 ? '<div class="total"><span>Discount</span><strong>-' + escapeInvoiceText(formatPrice(order.discount, language)) + '</strong></div>' : '') + '<div class="total"><span>Payment method / status</span><strong>' + escapeInvoiceText(order.paymentMethod) + ' / ' + escapeInvoiceText(order.paymentStatus) + '</strong></div>' + (order.courier?.trackingCode ? '<div class="total"><span>Courier tracking</span><strong>' + escapeInvoiceText(order.courier.trackingCode) + '</strong></div>' : '') + '<div class="total grand"><span>Grand total</span><strong>' + escapeInvoiceText(formatPrice(order.grandTotal, language)) + '</strong></div></section><p>Thank you for shopping with ' + escapeInvoiceText(settings.storeName || 'Zeluxi') + '.</p><button class="no-print" onclick="window.print()">Print / Save as PDF</button></body></html>');
  popup.document.close(); popup.focus();
}

export const CustomerAccountView: React.FC = () => {
  const {
    orders,
    wishlist,
    products,
    coupons,
    language,
    settings,
    setActiveView,
    setActiveTrackingId,
    addToCart,
    setSelectedProduct,
    requestOrderCancellation,
    requestOrderReturn,
    applyCoupon,
    isCouponUsedByUser,
    showToast,
  } = useStore();

  const {
    userProfile,
    loading: authLoading,
    setIsAuthModalOpen,
    setAuthModalMode,
    logout,
    updateProfileDetails,
    changePassword,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'tracking' | 'wishlist' | 'addresses' | 'coupons' | 'profile' | 'security' | 'support'
  >('overview');

  const [quickTrackInput, setQuickTrackInput] = useState('');
  const [ordersFilter, setOrdersFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [persistedOrders, setPersistedOrders] = useState<import('../../types').Order[] | null>(null);
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);

  // Password Change Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Cancellation & Return Dialog States
  const [cancelModalOrder, setCancelModalOrder] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [returnModalOrder, setReturnModalOrder] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('Size exchange needed');

  // Customer Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileDivision, setProfileDivision] = useState('');

  // Restore optional profile draft data only in the browser, after hydration.
  useEffect(() => {
    try {
      setProfileName(localStorage.getItem('ZELUX_PROFILE_NAME') || '');
      setProfilePhone(localStorage.getItem('ZELUX_PROFILE_PHONE') || '');
      setProfileEmail(localStorage.getItem('ZELUX_PROFILE_EMAIL') || '');
      setProfileAddress(localStorage.getItem('ZELUX_PROFILE_ADDRESS') || '');
      setProfileDivision(localStorage.getItem('ZELUX_PROFILE_DIV') || '');
    } catch {
      // Browser storage can be unavailable; authenticated profile data remains usable.
    }
  }, []);

  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.displayName || profileName);
      setProfilePhone(userProfile.phone || profilePhone);
      setProfileEmail(userProfile.email || profileEmail);
      if (userProfile.address) setProfileAddress(userProfile.address);
      if (userProfile.division) setProfileDivision(userProfile.division);
    }
  }, [userProfile]);

  useEffect(() => {
    let cancelled = false;
    const loadCustomerOrders = async () => {
      if (!userProfile) { setPersistedOrders(null); return; }
      try {
        const { data, error } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (error || !token) throw new Error('Please sign in again to load your order history.');
        const response = await fetch('/api/orders?scope=mine', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Order history could not be loaded.');
        if (!cancelled) { setPersistedOrders(Array.isArray(payload.orders) ? payload.orders : []); setOrdersLoadError(null); }
      } catch (error) {
        if (!cancelled) { setOrdersLoadError(error instanceof Error ? error.message : 'Order history could not be loaded.'); setPersistedOrders([]); }
      }
    };
    void loadCustomerOrders();
    return () => { cancelled = true; };
  }, [userProfile?.uid]);

  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  if (authLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center bg-white text-slate-600" role="status" aria-live="polite">Checking your account…</div>;
  }

  if (!userProfile) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center bg-white px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"><Lock className="h-6 w-6" /></div>
          <h1 className="text-xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-600">Your profile, order history, and account settings are available after you sign in.</p>
          <button type="button" onClick={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Sign in securely</button>
        </div>
      </section>
    );
  }

  const accountOrders = persistedOrders ?? orders;
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ZELUX_PROFILE_NAME', profileName);
    localStorage.setItem('ZELUX_PROFILE_PHONE', profilePhone);
    localStorage.setItem('ZELUX_PROFILE_EMAIL', profileEmail);
    localStorage.setItem('ZELUX_PROFILE_ADDRESS', profileAddress);
    localStorage.setItem('ZELUX_PROFILE_DIV', profileDivision);
    updateProfileDetails({
      displayName: profileName,
      phone: profilePhone,
      email: profileEmail,
      address: profileAddress,
      division: profileDivision,
    });
    setIsEditingProfile(false);
    showToast('Profile information updated successfully', 'success');
  };

  const handleCustomerChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError(
        'New password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        'New password and confirmation password do not match.'
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(
        'Password has been updated successfully!'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully', 'success');
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleConfirmCancel = () => {
    if (cancelModalOrder) {
      requestOrderCancellation(cancelModalOrder, cancelReason);
      setCancelModalOrder(null);
    }
  };

  const handleConfirmReturn = () => {
    if (returnModalOrder) {
      requestOrderReturn(returnModalOrder, returnReason);
      setReturnModalOrder(null);
    }
  };

  const handleCopyCoupon = (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
    } catch {}
    const userIdentifier = profileEmail || profilePhone || userProfile?.email || userProfile?.phone || '';
    const res = applyCoupon(code, userIdentifier);
    if (res.success) {
      setCopiedCoupon(code);
      setTimeout(() => setCopiedCoupon(null), 2500);
    }
  };

  return (
    <div className="py-12 bg-white min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Profile Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold font-mono">
              {profileName.charAt(0) || userProfile.displayName.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{profileName}</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Verified Member
                </span>
              </div>
              <p className="text-xs text-slate-500">{profilePhone} · {profileEmail}</p>
              <p className="text-xs text-slate-400 mt-1">{userProfile.division || 'Bangladesh'} · Member since {userProfile.createdAt || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>'Edit Profile'</span>
            </button>
            {userProfile ? (
              <button
                onClick={logout}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>'Sign Out'</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>'Sign In'</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Secondary Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>'Account Overview'</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'orders' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>'My Orders'</span>
            {accountOrders.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'orders' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {accountOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'tracking' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>'Order Tracking'</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'wishlist' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>'Wishlist'</span>
            {wishlistedProducts.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'wishlist' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {wishlistedProducts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'addresses' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>'Saved Addresses'</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'coupons' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>'Coupons'</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'profile' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>'Profile & Security'</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              activeTab === 'support' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>'Help & Support'</span>
          </button>
        </div>

        {activeTab === 'orders' && ordersLoadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{ordersLoadError}</div>}

        {/* TAB 0: ACCOUNT OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">'Total Orders'</span>
                  <Package className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{accountOrders.length}</p>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-[11px] text-indigo-600 font-semibold hover:underline mt-1 block"
                >
                  'View orders →'
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">'In Transit'</span>
                  <Truck className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
                  {accountOrders.filter(o => ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(o.status)).length}
                </p>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className="text-[11px] text-amber-600 font-semibold hover:underline mt-1 block"
                >
                  'Live track →'
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">'Saved Wishlist'</span>
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{wishlistedProducts.length}</p>
                <button
                  onClick={() => setActiveTab('wishlist')}
                  className="text-[11px] text-rose-600 font-semibold hover:underline mt-1 block"
                >
                  'View saved →'
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">'Active Coupons'</span>
                  <Tag className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{coupons.length}</p>
                <button
                  onClick={() => setActiveTab('coupons')}
                  className="text-[11px] text-emerald-600 font-semibold hover:underline mt-1 block"
                >
                  'Apply coupon →'
                </button>
              </div>
            </div>

            {/* Latest Order Spotlight */}
            {accountOrders.length > 0 && (
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                      'Most Recent Order'
                    </span>
                    <h3 className="text-base font-bold font-mono text-white mt-0.5">
                      Order #{accountOrders[0].orderNumber || accountOrders[0].id}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
                      {accountOrders[0].status}
                    </span>
                    <button
                      onClick={() => {
                        setActiveTrackingId(accountOrders[0].id);
                        setActiveView('tracking');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>'Track Order'</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-300 text-[11px]">
                      'Courier Service:'{' '}
                      <strong className="text-white">{accountOrders[0].courier.provider}</strong>
                    </p>
                    {accountOrders[0].courier.trackingCode && (
                      <p className="font-mono text-indigo-300 text-[11px] mt-0.5">
                        Code: {accountOrders[0].courier.trackingCode}
                      </p>
                    )}
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      'Est. Delivery:' {accountOrders[0].courier.estimatedDelivery}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] text-slate-300 block">Total BDT</span>
                    <span className="text-lg font-bold font-mono text-white">
                      {formatPrice(accountOrders[0].grandTotal, language)}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {accountOrders[0].items.length} {accountOrders[0].items.length === 1 ? 'item' : 'items'} ({accountOrders[0].paymentMethod})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('orders')}
                className="p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 hover:shadow-xs transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">'Order History'</h4>
                <p className="text-xs text-slate-500 mt-1">
                  'Invoices, cancellations, and status'
                </p>
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className="p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 hover:shadow-xs transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">'Delivery Address'</h4>
                <p className="text-xs text-slate-500 mt-1">
                  'Manage your default shipping location'
                </p>
              </button>

              <button
                onClick={() => setActiveTab('support')}
                className="p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 hover:shadow-xs transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">'Help & Concierge'</h4>
                <p className="text-xs text-slate-500 mt-1">
                  'WhatsApp support & 7-day return policy'
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Orders List */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {accountOrders.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-700">No orders placed yet.</p>
              </div>
            ) : (
              accountOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors bg-white shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          Order #{ord.orderNumber || ord.id}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700">
                          {ord.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">({ord.paymentMethod})</span>
                      </div>
                      <p className="text-slate-400 mt-0.5">{ord.createdAt}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Total Amount</span>
                        <span className="font-bold text-slate-900 text-sm tabular-nums">
                          {formatPrice(ord.grandTotal, language)}
                        </span>
                      </div>
                      <button onClick={() => setSelectedOrderId((current) => current === ord.id ? null : ord.id)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold"><FileText className="w-3.5 h-3.5" />Order Details</button>
                      <button onClick={() => openOrderInvoice(ord, settings, language)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"><Download className="w-3.5 h-3.5" />Invoice / PDF</button>
                      <button
                        onClick={() => {
                          setActiveTrackingId(ord.id);
                          setActiveView('tracking');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      >
                        <span>Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        <StoreImage
                          src={item.image}
                          alt={item.productName}
                          className="w-12 h-12 rounded object-cover border border-slate-200 bg-white shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{item.productName}</p>
                          <p className="text-[11px] text-slate-500">
                            Qty: {item.quantity} · {formatPrice(item.price, language)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedOrderId === ord.id && (
                    <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
                      <div><h3 className="text-sm font-bold text-slate-900">Order details</h3><p className="mt-1 text-xs text-slate-500">Placed {formatDate(ord.createdAt, language)} · {ord.status.replaceAll('_', ' ')}</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-white border border-slate-200 p-3"><h4 className="text-xs font-bold mb-2">Delivery address</h4><p className="text-xs font-semibold">{ord.customer.fullName}</p><p className="text-xs mt-1">{ord.customer.phone}</p><p className="text-xs mt-1">{ord.customer.addressDetails}</p><p className="text-xs">{[ord.customer.thanaCity, ord.customer.district, ord.customer.division, ord.customer.postalCode].filter(Boolean).join(', ')}</p></div>
                        <div className="rounded-lg bg-white border border-slate-200 p-3"><h4 className="text-xs font-bold mb-2">Payment & delivery</h4><p className="text-xs">Method: <strong>{ord.paymentMethod}</strong></p><p className="text-xs mt-1">Payment status: <strong>{ord.paymentStatus}</strong></p><p className="text-xs mt-1">Courier: <strong>{ord.courier.provider}</strong></p><p className="text-xs mt-1">ETA: <strong>{ord.courier.estimatedDelivery || 'Not available yet'}</strong></p>{ord.courier.trackingCode && <p className="text-xs mt-1">Tracking code: <strong className="font-mono">{ord.courier.trackingCode}</strong></p>}{ord.courier.consignmentId && <p className="text-xs mt-1">Consignment: <strong className="font-mono">{ord.courier.consignmentId}</strong></p>}</div>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-2 text-xs"><h4 className="font-bold">Price summary</h4><div className="flex justify-between"><span>Subtotal</span><strong>{formatPrice(ord.subtotal, language)}</strong></div><div className="flex justify-between"><span>Shipping</span><strong>{formatPrice(ord.shippingFee, language)}</strong></div>{ord.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><strong>−{formatPrice(ord.discount, language)}</strong></div>}<div className="flex justify-between border-t pt-2 text-sm"><strong>Grand total</strong><strong className="text-indigo-700">{formatPrice(ord.grandTotal, language)}</strong></div></div>
                      {ord.statusHistory.length > 0 && <div className="rounded-lg bg-white border border-slate-200 p-3"><h4 className="text-xs font-bold mb-2">Order activity</h4><ol className="space-y-2">{ord.statusHistory.slice().reverse().map((event, index) => <li key={event.status + event.timestamp + index} className="text-xs"><strong>{event.status.replaceAll('_', ' ')}</strong><p className="text-slate-500">{event.timestamp}</p>{event.note && <p className="text-slate-600">{event.note}</p>}</li>)}</ol></div>}
                      <button onClick={() => openOrderInvoice(ord, settings, language)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"><Download className="h-4 w-4" />Print / Save invoice as PDF</button>
                    </section>
                  )}

                  {/* Courier dispatch note & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          Carrier: <strong>{ord.courier.provider}</strong>
                        </span>
                        {ord.courier.bookingStatus === 'BOOKED' && ord.courier.trackingCode ? (
                          <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            Tracking: {ord.courier.trackingCode}
                          </span>
                        ) : ord.courier.bookingStatus === 'BOOKING_IN_PROGRESS' ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                            Courier Dispatching...
                          </span>
                        ) : ord.status === 'PENDING' ? (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                            Awaiting Dispatch Acceptance
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>ETA: {ord.courier.estimatedDelivery}</span>
                        {ord.courier.consignmentId && (
                          <span>· Consignment: <strong className="font-mono text-slate-600">{ord.courier.consignmentId}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(ord.status === 'PENDING' || ord.status === 'CONFIRMED') && (
                        <button
                          onClick={() => {
                            setCancelModalOrder(ord.id);
                            setCancelReason('Ordered by mistake');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                        >
                          Cancel Order
                        </button>
                      )}

                      {ord.status === 'DELIVERED' && (
                        <button
                          onClick={() => {
                            setReturnModalOrder(ord.id);
                            setReturnReason('Size exchange needed');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors"
                        >
                          7-Day Return / Exchange
                        </button>
                      )}

                      {ord.status === 'RETURN_REQUESTED' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[11px]">
                          Return Under Review
                        </span>
                      )}

                      {ord.status === 'CANCELLED' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[11px]">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: ORDER TRACKING */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    'Nationwide Live Order Tracking'
                  </h3>
                  <p className="text-xs text-slate-500">
                    'Track with Pathao & Steadfast logistics in 64 districts'
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickTrackInput}
                    onChange={(e) => setQuickTrackInput(e.target.value)}
                    placeholder='Enter Order Number (e.g. ZLX-000125)'
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (quickTrackInput.trim()) {
                      setActiveTrackingId(quickTrackInput.trim());
                    }
                    setActiveView('tracking');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                >
                  'Track Package'
                </button>
              </div>
            </div>

            {/* List of customer's active orders */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                'Your Recent Shipments'
              </h4>
              {accountOrders.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                  'No active shipments found.'
                </div>
              ) : (
                accountOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-xs">#{ord.orderNumber || ord.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {ord.status}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Carrier: <strong>{ord.courier.provider}</strong>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Placed on {ord.createdAt} · ETA: {ord.courier.estimatedDelivery}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTrackingId(ord.id);
                        setActiveView('tracking');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>'Live Status'</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Wishlist */}
        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            {wishlistedProducts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">Your wishlist is empty</p>
                <p className="text-xs text-slate-400">Save items you adore by tapping the heart icon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlistedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-200 rounded-xl p-3 flex gap-3 bg-white shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <StoreImage
                      src={p.images?.[0]}
                      alt={p.name}
                      className="w-20 h-20 rounded-lg object-cover bg-slate-100 shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 truncate">{p.name}</h4>
                        <p className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                          {formatPrice(p.price, language)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => addToCart(p, p.variants[0]?.id, 1)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Add to Cart</span>
                        </button>
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 text-[11px] font-medium"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Coupons */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {coupons.map((c) => {
              const activeUserIdentifier = profileEmail || profilePhone || userProfile?.email || userProfile?.phone || '';
              const isUsed = activeUserIdentifier ? isCouponUsedByUser(c.code, activeUserIdentifier) : false;

              return (
                <div
                  key={c.code}
                  className={`border rounded-xl p-4 space-y-3 flex flex-col justify-between transition-all ${
                    isUsed
                      ? 'border-slate-200 bg-slate-50/80 opacity-75'
                      : 'border-dashed border-indigo-300 bg-indigo-50/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono font-bold text-sm ${isUsed ? 'text-slate-500 line-through' : 'text-indigo-700'}`}>
                        {c.code}
                      </span>
                      {isUsed ? (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                          Already Used (1-Time Offer)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `৳${c.value} OFF`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{c.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-slate-400">
                        Min. spend: ৳{c.minSpend.toLocaleString()} · Valid till {c.expiresAt}
                      </span>
                      <span className="inline-block text-[10px] font-medium text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                        1 use per customer
                      </span>
                    </div>
                  </div>

                  {isUsed ? (
                    <div className="w-full py-1.5 px-3 bg-slate-200 text-slate-500 text-xs font-medium rounded-lg text-center cursor-not-allowed">
                      Redeemed on previous order
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCopyCoupon(c.code)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      {copiedCoupon === c.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied & Applied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Apply Coupon</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: SAVED ADDRESSES */}
        {activeTab === 'addresses' && (
          <div className="space-y-6 max-w-2xl text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      'Saved Delivery Address'
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      'Primary address for courier dispatch (Pathao & Steadfast)'
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingProfile ? 'Cancel' : 'Edit Address'}</span>
                </button>
              </div>

              {!isEditingProfile ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{profileName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Default Shipping Address
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{profileAddress}</p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Phone: {profilePhone} · Division: {profileDivision}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Recipient Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Division</label>
                    <select
                      value={profileDivision}
                      onChange={(e) => setProfileDivision(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chattogram">Chattogram</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Barishal">Barishal</option>
                      <option value="Rangpur">Rangpur</option>
                      <option value="Mymensingh">Mymensingh</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Street Address & Landmarks</label>
                    <textarea
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      rows={2}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Address</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB: PROFILE & SECURITY */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl text-xs">
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm">Edit Profile Information</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Division</label>
                    <select
                      value={profileDivision}
                      onChange={(e) => setProfileDivision(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chattogram">Chattogram</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Barishal">Barishal</option>
                      <option value="Rangpur">Rangpur</option>
                      <option value="Mymensingh">Mymensingh</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Delivery Address</label>
                  <textarea
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    rows={2}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Customer Profile Details</h3>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Profile</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Name</span>
                    <strong className="text-slate-800">{profileName}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Phone</span>
                    <strong className="text-slate-800 font-mono">{profilePhone}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Email</span>
                    <span className="text-slate-800">{profileEmail}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Division</span>
                    <span className="text-slate-800">{profileDivision}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: HELP & SUPPORT */}
        {activeTab === 'support' && (
          <div className="space-y-6 max-w-3xl text-xs">
            {/* Concierge Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    'WhatsApp Concierge'
                  </h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    'Instant assistance for orders, returns, and questions'
                  </p>
                </div>
                <a
                  href="https://wa.me/8801712334455?text=Hello%20Zelux%20Team%2C%20I%20have%20an%20inquiry%20regarding%20my%20account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>'Chat on WhatsApp'</span>
                </a>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    'Helpline & Email'
                  </h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    'Available daily 10:00 AM - 10:00 PM BST'
                  </p>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-700">
                  <p>📞 +880 1712-334455</p>
                  <p>✉️ support@zelux.com.bd</p>
                </div>
              </div>
            </div>

            {/* Policy Highlights */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>'Guaranteed Customer Care & Return Policy'</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <h5 className="font-bold text-slate-900 mb-1">7-Day Easy Return</h5>
                  <p className="text-slate-500 text-[11px]">
                    Size or style not fitting? Request an instant replacement within 7 days of delivery.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <h5 className="font-bold text-slate-900 mb-1">Open-Box Inspection</h5>
                  <p className="text-slate-500 text-[11px]">
                    Inspect product quality in front of Pathao/Steadfast delivery personnel before COD payment.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <h5 className="font-bold text-slate-900 mb-1">Express Delivery</h5>
                  <p className="text-slate-500 text-[11px]">
                    Dhaka metro dispatched in 24-48 hrs. All 64 districts nationwide delivered in 48-72 hrs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Security & Change Password (accessible via Profile or direct) */}
        {(activeTab === 'profile' || activeTab === 'security') && (
          <div className="max-w-xl space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    'Change Your Account Password'
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    'Ensure your account is using a strong, unique password with at least 6 characters.'
                  </p>
                </div>
              </div>

              {/* Status alerts */}
              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">'Error'</strong>
                    <span>{passwordError}</span>
                  </div>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">'Success!'</strong>
                    <span>{passwordSuccess}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleCustomerChangePassword} className="space-y-4 text-xs">
                {/* Current Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    'Current Password'
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder='Enter current password'
                      className="w-full px-3 py-2 pr-10 bg-slate-50/50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    'For demo accounts, default is: 123456'
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    'New Password'
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder='Minimum 6 characters'
                      className="w-full px-3 py-2 pr-10 bg-slate-50/50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            newPassword.length < 6
                              ? 'w-1/4 bg-rose-500'
                              : newPassword.length < 8
                              ? 'w-2/3 bg-amber-500'
                              : 'w-full bg-emerald-500'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {newPassword.length < 6
                          ? 'Too short'
                          : newPassword.length < 8
                          ? 'Moderate'
                          : 'Strong'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    'Confirm New Password'
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder='Re-enter new password'
                      className="w-full px-3 py-2 pr-10 bg-slate-50/50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">
                      'Passwords do not match'
                    </p>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>256-bit Encrypted</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isChangingPassword ? (
                      <span>'Updating...'</span>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>'Update Password'</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {cancelModalOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900">Cancel Order #{accountOrders.find((order) => order.id === cancelModalOrder)?.orderNumber || cancelModalOrder}</h3>
                </div>
                <button onClick={() => setCancelModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Are you sure you want to cancel this order? Please select a reason:
              </p>

              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Need to change delivery address">Need to change delivery address</option>
                <option value="Selected wrong size or color variant">Selected wrong size or color variant</option>
                <option value="Shipping time too long">Shipping time too long</option>
                <option value="Found a better price">Found a better price</option>
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCancelModalOrder(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Request Modal */}
        {returnModalOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Package className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900">Return / Exchange #{returnModalOrder}</h3>
                </div>
                <button onClick={() => setReturnModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Zelux offers a 7-day hassle-free return and exchange policy. Select the reason for your return:
              </p>

              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Size exchange needed">Size exchange needed</option>
                <option value="Defective or damaged during transit">Defective or damaged during transit</option>
                <option value="Color or material mismatch">Color or material mismatch</option>
                <option value="Different item received">Different item received</option>
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setReturnModalOrder(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReturn}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Submit Return Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
