import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { verifyCustomerOrderEligibility } from '../../lib/auth/verifyCustomer';
import { formatPrice, calculateShipping } from '../../utils/formatters';
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

const BANGLADESH_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Sylhet',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
];

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    appliedCoupon,
    isCouponUsedByUser,
    removeCoupon,
    settings,
    createOrder,
    setActiveView,
  } = useStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka City');
  const [thanaCity, setThanaCity] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [notes, setNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [bkashNumber, setBkashNumber] = useState('');
  const [bkashTrxId, setBkashTrxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      if (userProfile.address && !addressDetails) setAddressDetails(userProfile.address);
      if (userProfile.division) setDivision(userProfile.division);
    }
  }, [userProfile, isCheckoutOpen]);

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

  const shippingInfo = calculateShipping(
    division,
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
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (paymentMethod !== 'COD') {
      setFormError('Only Cash on Delivery is currently enabled. Online payments have not been integrated yet.');
      return;
    }

    if (appliedCoupon) {
      setFormError('Coupon discounts are not yet supported by secure server-side checkout. Please click "Remove coupon" below to proceed.');
      return;
    }

    // Zod Address Validation
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    const candidateAddress = {
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email.trim() || activeUserEmail || '',
      division: division as any,
      district: district.trim() || division,
      thanaCity: thanaCity.trim() || division,
      addressDetails: addressDetails.trim(),
      notes: notes.trim(),
    };

    const parseResult = shippingAddressSchema.safeParse(candidateAddress);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message;
      setFormError(issue || 'Please verify your delivery address details.');
      return;
    }

    // Per-user coupon limit validation
    if (appliedCoupon) {
      const isUsedByPhone = isCouponUsedByUser(appliedCoupon.code, candidateAddress.phone);
      const isUsedByEmail = candidateAddress.email ? isCouponUsedByUser(appliedCoupon.code, candidateAddress.email) : false;
      if (isUsedByPhone || isUsedByEmail) {
        setFormError(`Coupon "${appliedCoupon.code}" has already been used by this phone number or email. Limit: 1 use per customer.`);
        removeCoupon();
        return;
      }
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
      thanaCity: candidateAddress.thanaCity,
      addressDetails: candidateAddress.addressDetails,
      notes: candidateAddress.notes,
    };

    const courierPartner: CourierProvider = shippingInfo.provider;

    try {
      await createOrder(
        address,
        paymentMethod,
        courierPartner
      );

      setIsProcessing(false);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      setIsProcessing(false);
      setFormError(err.message || 'Failed to place order. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col">
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
        <form onSubmit={handleSubmitOrder} className="overflow-y-auto p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

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
                  onChange={(e) => setDivision(e.target.value)}
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
                  Thana / Area *
                </label>
                <input
                  type="text"
                  required
                  value={thanaCity}
                  onChange={(e) => setThanaCity(e.target.value)}
                  placeholder="e.g. Gulshan / Dhanmondi"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Street address & house details *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    value={addressDetails}
                    onChange={(e) => setAddressDetails(e.target.value)}
                    placeholder="House #, Road #, Flat #, Sector or landmark..."
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
                  placeholder="e.g. Call before delivery"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Courier Dispatch Alert */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-semibold block">
                    {shippingInfo.provider === 'PATHAO' ? 'Pathao Express Logistics' : 'Steadfast Courier'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Estimated arrival: {shippingInfo.eta}
                  </span>
                </div>
              </div>
              <span className="font-bold text-slate-900 tabular-nums">
                {shippingInfo.isFree ? 'FREE' : `৳${shippingInfo.fee}`}
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

          {/* Section 4: Order Financial Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900 tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {shippingInfo.isFree ? 'FREE' : `৳${shippingInfo.fee}`}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount</span>
                <span className="tabular-nums">-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="text-lg font-extrabold text-slate-950 tabular-nums">
                {formatPrice(grandTotal)}
              </span>
            </div>
          </div>

          {/* Coupon Checkout Resolution Notice */}
          {appliedCoupon && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-900">
              <div className="space-y-0.5">
                <p className="font-semibold">Coupon Applied: {appliedCoupon.code}</p>
                <p className="text-[11px] text-amber-700">Server-side automated coupon verification is currently being upgraded.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  removeCoupon();
                  setFormError(null);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors self-start sm:self-auto"
              >
                Remove coupon to proceed
              </button>
            </div>
          )}

          {/* Customer Verification Status Banner */}
          {isAuthenticated && isEmailConfirmed ? (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs flex items-center justify-between text-emerald-900">
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
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
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
            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-2">
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
          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors active:scale-98 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {isProcessing ? 'Processing order...' : `Place order · ${formatPrice(grandTotal)}`}
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
