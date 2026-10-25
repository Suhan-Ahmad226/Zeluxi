import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { verifyCustomerOrderEligibility } from '../../lib/auth/verifyCustomer';
import { formatPrice } from '../../utils/formatters';
import {
  X,
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  CheckCircle2,
  Lock,
  MapPin,
  Phone,
  User,
  Mail,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { PaymentMethod, CourierProvider, ShippingAddress } from '../../types';
import { shippingAddressSchema } from '../../lib/validation/schemas';
import { BANGLADESH_DIVISIONS, getDistrictsByDivision, getUpazilasByDistrict } from '../../lib/address/bangladesh-locations';

import { StoreImage } from '../common/StoreImage';
export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    removeFromCart,
    updateCartQuantity,
    createOrder,
    setActiveView,
  } = useStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [pathaoCityId, setPathaoCityId] = useState('');
  const [pathaoZoneId, setPathaoZoneId] = useState('');
  const [pathaoCities, setPathaoCities] = useState<Array<{ city_id: number; city_name: string }>>([]);
  const [pathaoZones, setPathaoZones] = useState<Array<{ zone_id: number; zone_name: string }>>([]);
  const [pathaoAreaId, setPathaoAreaId] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [notes, setNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [bkashNumber, setBkashNumber] = useState('');
  const [bkashTrxId, setBkashTrxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [shippingQuote, setShippingQuote] = useState<any>(null);
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  const {
    supabaseUser,
    currentUser,
    userProfile,
    isVerified,
    setIsAuthModalOpen,
    setAuthModalMode,
    setPendingVerifyEmail,
  } = useAuth();

  useEffect(() => {
    if (userProfile && isCheckoutOpen) {
      if (userProfile.displayName && !fullName) setFullName(userProfile.displayName);
      if (userProfile.phone && !phone) setPhone(userProfile.phone);
      if (userProfile.email && !email) setEmail(userProfile.email);
      if ((userProfile.addressDetails || userProfile.address) && !addressDetails) setAddressDetails(userProfile.addressDetails || userProfile.address || '');
      if (userProfile.division) setDivision(userProfile.division);
      if (userProfile.district) setDistrict(userProfile.district);
      if (userProfile.upazila || (userProfile as any).thanaCity) setUpazila(userProfile.upazila || (userProfile as any).thanaCity || '');
      if ((userProfile as any).pathaoCityId) setPathaoCityId(String((userProfile as any).pathaoCityId));
      if ((userProfile as any).pathaoZoneId) setPathaoZoneId(String((userProfile as any).pathaoZoneId));
      if ((userProfile as any).pathaoAreaId) setPathaoAreaId(String((userProfile as any).pathaoAreaId));
      if (typeof userProfile.notes === 'string') setNotes(userProfile.notes);
    }
  }, [userProfile, isCheckoutOpen]);

  useEffect(() => {
    if (!isCheckoutOpen || pathaoCities.length) return;
    let active = true;
    fetch('/api/shipping/locations?action=cities', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Pathao cities are unavailable.');
        if (active) setPathaoCities(Array.isArray(payload.data) ? payload.data : []);
      })
      .catch((error) => { if (active) setShippingQuoteError(error instanceof Error ? error.message : 'Pathao cities are unavailable.'); });
    return () => { active = false; };
  }, [isCheckoutOpen, pathaoCities.length]);

  useEffect(() => {
    if (!pathaoCityId) { setPathaoZones([]); return; }
    let active = true;
    fetch('/api/shipping/locations?action=zones&id=' + encodeURIComponent(pathaoCityId), { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Pathao zones are unavailable.');
        if (active) setPathaoZones(Array.isArray(payload.data) ? payload.data : []);
      })
      .catch((error) => { if (active) setShippingQuoteError(error instanceof Error ? error.message : 'Pathao zones are unavailable.'); });
    return () => { active = false; };
  }, [pathaoCityId]);

  useEffect(() => {
    let active = true;
    const requestQuote = async () => {
      if (!isCheckoutOpen || !district || !upazila || !pathaoCityId || !pathaoZoneId || cart.length === 0) {
        setShippingQuote(null);
        setShippingQuoteError(null);
        setIsQuoteLoading(false);
        return;
      }
      setIsQuoteLoading(true);
      setShippingQuoteError(null);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (sessionError || !token) throw new Error('Sign in again to calculate Pathao delivery.');
        const response = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({
            district,
            upazila,
            cityId: Number(pathaoCityId),
            zoneId: Number(pathaoZoneId),
            areaId: pathaoAreaId ? Number(pathaoAreaId) : undefined,
            items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
          }),
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.quote) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Pathao delivery price could not be calculated.');
        }
        if (active) setShippingQuote(payload.quote);
      } catch (error) {
        if (active) {
          setShippingQuote(null);
          setShippingQuoteError(error instanceof Error ? error.message : 'Pathao delivery price could not be calculated.');
        }
      } finally {
        if (active) setIsQuoteLoading(false);
      }
    };
    void requestQuote();
    return () => { active = false; };
  }, [isCheckoutOpen, district, upazila, pathaoCityId, pathaoZoneId, pathaoAreaId, cart]);

  if (!isCheckoutOpen) return null;

  const activeUserEmail = supabaseUser?.email || currentUser?.email || userProfile?.email;
  const isAuthenticated = Boolean(supabaseUser || currentUser);
  const isEmailConfirmed = Boolean(
    isVerified ||
    supabaseUser?.email_confirmed_at ||
    supabaseUser?.confirmed_at ||
    supabaseUser?.app_metadata?.provider === 'google' ||
    supabaseUser?.app_metadata?.provider === 'facebook'
  );

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const pricingSubtotal = Number.isFinite(Number(shippingQuote?.subtotal)) ? Number(shippingQuote.subtotal) : subtotal;
  const shippingInfo = {
    fee: Number(shippingQuote?.shippingFee || 0),
    isFree: Boolean(shippingQuote?.freeShipping),
    provider: 'PATHAO' as CourierProvider,
    eta: shippingQuote ? 'Live Pathao rate' : 'Calculated after selecting a supported delivery area',
  };

  let discount = 0;
  if (appliedCoupon && appliedCoupon.active && (!appliedCoupon.expiresAt || new Date(appliedCoupon.expiresAt).getTime() >= Date.now()) && pricingSubtotal >= Number(appliedCoupon.minSpend || 0)) {
    if (appliedCoupon.type === 'PERCENTAGE') {
      discount = Math.round((pricingSubtotal * appliedCoupon.value) / 100 * 100) / 100;
    } else {
      discount = Math.min(pricingSubtotal, appliedCoupon.value);
    }
  }
  discount = Math.min(pricingSubtotal, Math.max(0, discount));
  // COD fee is a fixed 1% of the discounted order value including delivery, rounded up to the next BDT.
  const codFee = shippingQuote ? Math.ceil(Math.max(0, pricingSubtotal + shippingInfo.fee - discount) * 0.01) : 0;
  const grandTotal = Math.max(0, pricingSubtotal + shippingInfo.fee + codFee - discount);
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (paymentMethod !== 'COD') {
      setFormError('Only Cash on Delivery is currently enabled. Online payments have not been integrated yet.');
      return;
    }

    if (!shippingQuote || !shippingQuote.areaId || isQuoteLoading || shippingQuoteError) {
      setFormError(shippingQuoteError || 'Wait for a valid Pathao delivery quote before placing your order.');
      return;
    }

    // Zod Address Validation
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    const candidateAddress = {
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email.trim() || activeUserEmail || '',
      division: division as any,
      district: district.trim(),
      upazila: upazila.trim(),
      addressDetails: addressDetails.trim(),
      notes: notes.trim(),
      pathaoCityId: Number(shippingQuote.cityId),
      pathaoCityName: String(shippingQuote.cityName || ''),
      pathaoZoneId: Number(shippingQuote.zoneId),
      pathaoZoneName: String(shippingQuote.zoneName || ''),
      pathaoAreaId: Number(shippingQuote.areaId),
      pathaoAreaName: String(shippingQuote.areaName || ''),
    };

    const parseResult = shippingAddressSchema.safeParse(candidateAddress);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message;
      setFormError(issue || 'Please verify your delivery address details.');
      return;
    }

    setIsProcessing(true);

    try {
      const verificationStatus = await verifyCustomerOrderEligibility();
      if (!verificationStatus.isVerified) {
        setIsProcessing(false);
        if (verificationStatus.reason === 'UNVERIFIED_EMAIL') {
          const target = verificationStatus.email || email.trim() || activeUserEmail || '';
          setPendingVerifyEmail(target);
          setFormError('Email verification required. Please verify your account with the 6-digit numeric OTP before placing an order.');
          return;
        }

        setFormError('A verified account is required to place an order. Please sign in or register.');
        setAuthModalMode('signin');
        setIsAuthModalOpen(true);
        return;
      }
    } catch (err: any) {
      console.error('Identity verification failed; checkout has been blocked.', err);
      setIsProcessing(false);
      setFormError('We could not verify your account. Please try again after signing in.');
      return;
    }

    const address: ShippingAddress = {
      fullName: candidateAddress.fullName,
      phone: candidateAddress.phone,
      email: candidateAddress.email,
      division: candidateAddress.division,
      district: candidateAddress.district,
      upazila: candidateAddress.upazila,
      addressDetails: candidateAddress.addressDetails,
      notes: candidateAddress.notes,
      pathaoCityId: candidateAddress.pathaoCityId,
      pathaoCityName: candidateAddress.pathaoCityName,
      pathaoZoneId: candidateAddress.pathaoZoneId,
      pathaoZoneName: candidateAddress.pathaoZoneName,
      pathaoAreaId: candidateAddress.pathaoAreaId,
      pathaoAreaName: candidateAddress.pathaoAreaName,
    };

    const courierPartner: CourierProvider = shippingInfo.provider;

    try {
      await createOrder(
        address,
        paymentMethod,
        courierPartner,
        undefined,
        appliedCoupon?.code
      );

      setIsProcessing(false);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      setIsProcessing(false);
      setFormError(err.message || 'Failed to place order. Please try again.');
    }
  };

  const handleApplyCoupon = () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;
    const result = applyCoupon(code, phone.trim() || activeUserEmail || undefined);
    setFormError(result.success ? null : result.message);
    if (result.success) setCouponCodeInput('');
  };

  return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-50 animate-in fade-in duration-150">
      <div className="mx-auto min-h-full w-full max-w-6xl bg-white shadow-xl sm:border-x sm:border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Checkout
            </h2>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)] lg:gap-8 lg:p-8">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Cart and checkout are one continuous page. */}
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Your items</h3>
                <p className="mt-1 text-xs text-slate-500">{cart.reduce((count, item) => count + item.quantity, 0)} items · Review options and quantities before ordering</p>
              </div>
              <button type="button" onClick={() => { setIsCheckoutOpen(false); setActiveView('store'); }} className="text-xs font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-950">Continue shopping</button>
            </div>
            {cart.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Your cart is empty. Add a product before checkout.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.productId + ':' + (item.variantId || 'default')} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <StoreImage src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-contain sm:h-20 sm:w-20" loading="lazy" decoding="async" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                      {item.variantLabel && <p className="mt-1 text-xs text-slate-500">{item.variantLabel}</p>}
                      <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">{formatPrice(item.price)}</p>
                      <div className="mt-2 inline-flex items-center rounded-lg border border-slate-200 bg-white">
                        <button type="button" aria-label={'Decrease quantity of ' + item.name} onClick={() => updateCartQuantity(item.productId, item.quantity - 1, item.variantId)} className="min-h-9 min-w-9 rounded-l-lg text-base hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">−</button>
                        <span className="min-w-8 text-center text-xs font-semibold tabular-nums">{item.quantity}</span>
                        <button type="button" aria-label={'Increase quantity of ' + item.name} disabled={item.quantity >= item.stock} onClick={() => updateCartQuantity(item.productId, item.quantity + 1, item.variantId)} className="min-h-9 min-w-9 rounded-r-lg text-base hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">+</button>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-3">
                      <p className="text-sm font-bold tabular-nums text-slate-900">{formatPrice(item.price * item.quantity)}</p>
                      <button type="button" onClick={() => removeFromCart(item.productId, item.variantId)} className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-5 lg:col-start-1">
          {/* Section 1: Contact Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Contact information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tanvir Hossain"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mobile number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Shipping Destination */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Delivery address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Division *
                </label>
                <select
                  value={division}
                  onChange={(e) => { setDivision(e.target.value); setDistrict(''); setUpazila(''); setPathaoAreaId(''); setShippingQuote(null); }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {BANGLADESH_DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  District *
                </label>
                <select
                  required
                  value={district}
                  onChange={(e) => { setDistrict(e.target.value); setUpazila(''); setPathaoAreaId(''); setShippingQuote(null); }}
                  disabled={!division}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                >
                  <option value="">Select district</option>
                  {getDistrictsByDivision(division).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Upazila / Thana *
                </label>
                <select
                  required
                  value={upazila}
                  onChange={(e) => { setUpazila(e.target.value); setPathaoAreaId(''); setShippingQuote(null); }}
                  disabled={!district}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                >
                  <option value="">Select upazila / thana</option>
                  {getUpazilasByDistrict(district).map((option) => (
                    <option key={option.kind + '-' + option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Pathao city *</label>
                <select required value={pathaoCityId} onChange={(e) => { setPathaoCityId(e.target.value); setPathaoZoneId(''); setPathaoAreaId(''); setShippingQuote(null); }} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600">
                  <option value="">Select Pathao city</option>
                  {pathaoCities.map((city) => <option key={city.city_id} value={String(city.city_id)}>{city.city_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Pathao zone *</label>
                <select required value={pathaoZoneId} onChange={(e) => { setPathaoZoneId(e.target.value); setPathaoAreaId(''); setShippingQuote(null); }} disabled={!pathaoCityId || pathaoZones.length === 0} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600 disabled:bg-slate-100">
                  <option value="">Select Pathao zone</option>
                  {pathaoZones.map((zone) => <option key={zone.zone_id} value={String(zone.zone_id)}>{zone.zone_name}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pathao delivery area *
                </label>
                <select
                  required
                  value={pathaoAreaId}
                  onChange={(e) => setPathaoAreaId(e.target.value)}
                  disabled={!shippingQuote || !Array.isArray(shippingQuote.areas) || shippingQuote.areas.length === 0 || isQuoteLoading}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                >
                  <option value="">{isQuoteLoading ? 'Loading Pathao areas…' : 'Select the nearest Pathao delivery area'}</option>
                  {(shippingQuote?.areas || []).map((area: { areaId: number; areaName: string }) => (
                    <option key={area.areaId} value={String(area.areaId)}>{area.areaName}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Used to validate courier serviceability and prevent incorrect delivery charges.</p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Address Details (House / Flat / Building) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    value={addressDetails}
                    onChange={(e) => setAddressDetails(e.target.value)}
                    placeholder="House / Flat / Building, Road, Block, Area..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  Delivery notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. Call before delivery"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {shippingQuoteError && (
              <div role="alert" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Pathao rate unavailable:</strong> {shippingQuoteError}
              </div>
            )}

            {/* Courier Dispatch Alert */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-semibold block">Pathao Express Logistics</span>
                  <span className="text-[11px] text-slate-500">
                    Estimated arrival: {shippingInfo.eta}
                  </span>
                </div>
              </div>
              <span className="font-bold text-slate-900 tabular-nums">
                {isQuoteLoading ? 'Calculating…' : shippingQuote ? (shippingInfo.isFree ? 'FREE' : formatPrice(shippingInfo.fee)) : '—'}
              </span>
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Payment method
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {/* COD */}
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  {paymentMethod === 'COD' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    Cash on delivery
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Pay upon delivery
                  </p>
                </div>
              </button>

              {/* bKash */}
              <button
                type="button"
                disabled
                title="Coming soon. Cash on Delivery is currently available."
                onClick={() => setPaymentMethod('BKASH')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'BKASH'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[11px] text-pink-600 px-1 py-0.5 bg-pink-50 rounded">bKash</span>
                  {paymentMethod === 'BKASH' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    bKash
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Mobile banking
                  </p>
                </div>
              </button>

              {/* Nagad */}
              <button
                type="button"
                disabled
                title="Coming soon. Cash on Delivery is currently available."
                onClick={() => setPaymentMethod('NAGAD')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'NAGAD'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[11px] text-amber-600 px-1 py-0.5 bg-amber-50 rounded">Nagad</span>
                  {paymentMethod === 'NAGAD' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    Nagad
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Instant wallet
                  </p>
                </div>
              </button>

              {/* Rocket */}
              <button
                type="button"
                disabled
                title="Coming soon. Cash on Delivery is currently available."
                onClick={() => setPaymentMethod('ROCKET')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'ROCKET'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[11px] text-purple-600 px-1 py-0.5 bg-purple-50 rounded">Rocket</span>
                  {paymentMethod === 'ROCKET' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    Rocket
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    DBBL Rocket
                  </p>
                </div>
              </button>

              {/* SSLCommerz */}
              <button
                type="button"
                disabled
                title="Coming soon. Cash on Delivery is currently available."
                onClick={() => setPaymentMethod('SSLCOMMERZ')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'SSLCOMMERZ'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  {paymentMethod === 'SSLCOMMERZ' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    Cards & Net Banking
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    SSLCommerz
                  </p>
                </div>
              </button>
            </div>

            {/* Payment instructions depending on choice */}
            {paymentMethod === 'BKASH' && (
              <div className="p-3.5 bg-pink-50/70 border border-pink-200 rounded-xl text-xs space-y-2 text-pink-900">
                <p className="font-semibold">
                  bKash Merchant Payment:
                </p>
                <p className="text-[11px] text-pink-800">
                  Send Money or Merchant Payment to <strong>01700-112233</strong> or enter your transaction ID:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="Sender bKash No (e.g. 017XXXXXXXX)"
                    className="px-2.5 py-1.5 text-xs bg-white border border-pink-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={bkashTrxId}
                    onChange={(e) => setBkashTrxId(e.target.value.toUpperCase())}
                    placeholder="Transaction ID (e.g. BKS849204)"
                    className="px-2.5 py-1.5 text-xs bg-white border border-pink-300 rounded-lg text-slate-900 font-mono uppercase focus:outline-none"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'NAGAD' && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
                <p className="font-semibold">
                  Nagad Wallet Payment:
                </p>
                <p className="text-[11px] text-amber-800">
                  Send Payment to Nagad Merchant <strong>01700-112233</strong> and input the TrxID below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="Sender Nagad No (e.g. 018XXXXXXXX)"
                    className="px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={bkashTrxId}
                    onChange={(e) => setBkashTrxId(e.target.value.toUpperCase())}
                    placeholder="Transaction ID (e.g. NGD928371)"
                    className="px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 font-mono uppercase focus:outline-none"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'ROCKET' && (
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs space-y-2 text-purple-900">
                <p className="font-semibold">
                  DBBL Rocket Payment:
                </p>
                <p className="text-[11px] text-purple-800">
                  Send Payment to Rocket Biller / Merchant <strong>01700-112233-0</strong> and enter TrxID below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="Rocket 12-digit No"
                    className="px-2.5 py-1.5 text-xs bg-white border border-purple-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={bkashTrxId}
                    onChange={(e) => setBkashTrxId(e.target.value.toUpperCase())}
                    placeholder="Transaction ID (e.g. RCK102948)"
                    className="px-2.5 py-1.5 text-xs bg-white border border-purple-300 rounded-lg text-slate-900 font-mono uppercase focus:outline-none"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'SSLCOMMERZ' && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2 text-blue-900">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>SSLCommerz Secured Payment Gateway</span>
                  </p>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">256-bit SSL</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  Upon clicking Confirm Order, you will be seamlessly authenticated through Visa, Mastercard, AMEX, or Bangladeshi Internet Banking (CityTouch, MTB, BRAC).
                </p>
              </div>
            )}
          </div>

          </div>

          {/* Order Summary and coupon controls */}
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 lg:sticky lg:top-5 lg:self-start">
            <h3 className="text-sm font-bold text-slate-900">Order summary</h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
                <div className="min-w-0"><p className="font-bold text-emerald-800">{appliedCoupon.code} applied</p><p className="mt-0.5 text-emerald-700">Discount will be revalidated when the order is saved.</p></div>
                <button type="button" onClick={() => { removeCoupon(); setFormError(null); }} className="shrink-0 rounded-lg px-2 py-1.5 font-semibold text-emerald-800 underline underline-offset-2 hover:bg-emerald-100">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="checkout-coupon-code">Coupon code</label>
                <input id="checkout-coupon-code" value={couponCodeInput} onChange={(event) => setCouponCodeInput(event.target.value.toUpperCase())} maxLength={40} autoComplete="off" placeholder="Enter coupon code" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm uppercase outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                <button type="button" onClick={handleApplyCoupon} disabled={!couponCodeInput.trim()} className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900 tabular-nums">{formatPrice(pricingSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pathao shipping</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {isQuoteLoading ? 'Calculating…' : shippingQuote ? (shippingInfo.isFree ? 'FREE' : formatPrice(shippingInfo.fee)) : '—'}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>{appliedCoupon ? `Coupon (${appliedCoupon.code})` : 'Discount'}</span>
                <span className="tabular-nums">-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>COD fee (1%)</span>
              <span className="font-semibold text-slate-900 tabular-nums">{shippingQuote ? formatPrice(codFee) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="text-lg font-extrabold text-slate-950 tabular-nums">
                {shippingQuote ? formatPrice(grandTotal) : 'Awaiting delivery quote'}
              </span>
            </div>
            </div>
          </section>

          {/* Customer Verification Status Banner */}
          {isAuthenticated && isEmailConfirmed ? (
            <div className="lg:col-span-2 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs flex items-center justify-between text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Verified Account:{' '}
                  <strong className="font-semibold">{activeUserEmail}</strong>
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 bg-emerald-200/70 text-emerald-900 rounded">
                Verified
              </span>
            </div>
          ) : isAuthenticated && !isEmailConfirmed ? (
            <div className="lg:col-span-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    6-Digit Email OTP Required
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 bg-amber-200 text-amber-900 rounded">
                  Pending Verification
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                Please enter the 6-digit numeric code sent to {activeUserEmail || email} before checkout.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPendingVerifyEmail(activeUserEmail || email);
                  setIsCheckoutOpen(false);
                  setActiveView('verify-email');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                <span>Verify with 6-Digit OTP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="lg:col-span-2 p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>
                    Verified Account Required for Checkout
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Required
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                For security and courier tracking, please sign in or register before completing your order.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          )}

          {/* Submit Action */}
          <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:col-span-2 lg:mx-0 lg:rounded-xl lg:border lg:p-4">
            <button
              type="submit"
              disabled={isProcessing || cart.length === 0 || !shippingQuote || !shippingQuote.areaId || isQuoteLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors active:scale-98 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {isProcessing ? 'Processing order...' : shippingQuote ? `Place order · ${formatPrice(grandTotal)}` : isQuoteLoading ? 'Calculating delivery...' : 'Select delivery area to continue'}
              </span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              By placing this order you accept our delivery terms and 7-day return policy.
            </p>
          </div>
        </form>
      </div>
      </div>
  );
};
