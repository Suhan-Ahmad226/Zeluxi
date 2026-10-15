import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/formatters';
import { ShoppingBag, X, Trash2, ArrowRight, Tag, Sparkles, Check } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    settings,
    setIsCheckoutOpen,
  } = useStore();

  const [couponCodeInput, setCouponCodeInput] = useState('');

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'PERCENTAGE') {
      discount = (subtotal * appliedCoupon.value) / 100;
    } else {
      discount = appliedCoupon.value;
    }
  }

  const freeShippingThreshold = settings.freeShippingThreshold;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    applyCoupon(couponCodeInput.trim());
    setCouponCodeInput('');
  };

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Shopping bag
              </h2>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Milestone bar */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {remainingForFreeShipping === 0
                  ? 'Free delivery unlocked'
                  : `Add ${formatPrice(remainingForFreeShipping)} more for free delivery`}
              </span>
              <span className="text-[11px] font-mono text-slate-600 font-bold">
                {Math.round(freeShippingProgress)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  Your shopping bag is empty
                </p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Discover our artisan menswear, handcrafted leather goods, and timepieces.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'std'}`}
                  className="flex items-center gap-3 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">
                      {item.name}
                    </h4>
                    {item.variantLabel && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity steppers */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center border border-slate-300 rounded bg-white">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1, item.variantId)}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-slate-800 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1, item.variantId)}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer & Checkout Controls */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-white space-y-4">
              {/* Coupon form */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{appliedCoupon.code} applied (-{appliedCoupon.type === 'PERCENTAGE' ? `${appliedCoupon.value}%` : `৳${appliedCoupon.value}`})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-emerald-700 hover:text-emerald-900 font-bold underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      placeholder="Promo Code (e.g. DHAKA100)"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg uppercase tracking-wider font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Shipping</span>
                  <span>{remainingForFreeShipping === 0 ? 'Free' : 'Calculated at checkout'}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Estimated total</span>
                  <span className="text-base tabular-nums">
                    {formatPrice(Math.max(0, subtotal - discount))}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedCheckout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors active:scale-98 shadow-xs"
              >
                <span>Proceed to checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
