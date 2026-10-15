import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/formatters';
import {
  Search,
  Truck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { OrderStatus, Order } from '../../types';

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: 'Order Placed' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'PROCESSING', label: 'Packed & Ready' },
  { status: 'SHIPPED', label: 'Shipped with Courier' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export const OrderTrackingView: React.FC = () => {
  const { orders, activeTrackingId } = useStore();

  const [searchKey, setSearchKey] = useState(() => {
    if (activeTrackingId) return activeTrackingId;
    return orders[0]?.id || 'ZLX-2601';
  });

  const [searchedOrder, setSearchedOrder] = useState<Order | undefined>(() => {
    if (activeTrackingId) {
      const match = orders.find((o) => o.id === activeTrackingId);
      if (match) return match;
    }
    return orders[0];
  });

  const [searchError, setSearchError] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(false);
    const key = searchKey.trim().toLowerCase();

    const found = orders.find(
      (o) =>
        o.id.toLowerCase() === key ||
        o.customer.phone.replace(/[^0-9]/g, '').includes(key) ||
        o.courier.trackingCode?.toLowerCase() === key ||
        o.courier.consignmentId?.toLowerCase() === key
    );

    if (found) {
      setSearchedOrder(found);
    } else {
      setSearchError(true);
      setSearchedOrder(undefined);
    }
  };

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PROCESSING':
      case 'READY_TO_SHIP':
        return 2;
      case 'SHIPPED':
        return 3;
      case 'OUT_FOR_DELIVERY':
        return 4;
      case 'DELIVERED':
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIndex = searchedOrder ? getStepIndex(searchedOrder.status) : 0;

  return (
    <div className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 p-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
            <Truck className="w-4 h-4" />
            <span>Real-Time Parcel Logistics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Track Your Shipment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Enter your Order ID (e.g. AET-2601), phone number or courier consignment code.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Order ID / Phone / Tracking Code"
              className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            Track
          </button>
        </form>

        {/* Quick Demo links */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <span>Sample active orders:</span>
          {orders.slice(0, 3).map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setSearchKey(o.id);
                setSearchedOrder(o);
                setSearchError(false);
              }}
              className="font-mono text-indigo-600 hover:underline px-1"
            >
              #{o.id}
            </button>
          ))}
        </div>

        {searchError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>
              No shipment record found matching this search key. Please verify the ID or phone number.
            </span>
          </div>
        )}

        {/* Tracking Details Card */}
        {searchedOrder && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            {/* Top Bar of the Order */}
            <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    Order #{searchedOrder.id}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                    {searchedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {searchedOrder.createdAt} · {searchedOrder.customer.fullName}
                </p>
              </div>

              <div className="text-left sm:text-right space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  Courier Network
                </span>
                <span className="text-xs font-bold text-slate-800 block">
                  {searchedOrder.courier.provider === 'PATHAO' ? 'Pathao Express Logistics' : 'Steadfast Courier Network'}
                </span>
                {searchedOrder.courier.trackingCode ? (
                  <p className="text-xs font-mono text-indigo-600 font-semibold">
                    Tracking: {searchedOrder.courier.trackingCode}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">
                    Dispatch Booking Pending
                  </p>
                )}
                {searchedOrder.courier.consignmentId && (
                  <p className="text-[11px] font-mono text-slate-500">
                    Consignment: {searchedOrder.courier.consignmentId}
                  </p>
                )}
              </div>
            </div>

            {/* Stepper Pipeline */}
            <div className="p-6 sm:p-8 border-b border-slate-100">
              <div className="relative">
                {/* Connecting Line */}
                <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 relative z-10">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <div key={step.status} className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${
                            isCurrent
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div>
                          <p
                            className={`text-xs font-semibold leading-tight ${
                              isCurrent
                                ? 'text-indigo-600'
                                : isDone
                                ? 'text-slate-900'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Shipment Milestones Timeline */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: History Events */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Shipment Activity Log
                </h4>
                <div className="space-y-4">
                  {searchedOrder.statusHistory.map((hist, i) => (
                    <div key={i} className="flex gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-800">{hist.status}</span>
                        <span className="text-slate-400 text-[11px] block">{hist.timestamp}</span>
                        <p className="text-slate-600 text-xs mt-0.5">{hist.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Delivery Details */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Delivery Destination
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p className="font-semibold text-slate-900">{searchedOrder.customer.fullName}</p>
                  <p>{searchedOrder.customer.addressDetails}</p>
                  <p>{searchedOrder.customer.thanaCity}, {searchedOrder.customer.district}, {searchedOrder.customer.division}</p>
                  <p className="text-slate-500">Phone: {searchedOrder.customer.phone}</p>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <p className="font-bold text-slate-900 mb-2">
                    Package Contents:
                  </p>
                  <div className="space-y-2">
                    {searchedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-slate-700 truncate max-w-xs">{item.productName} (x{item.quantity})</span>
                        <span className="font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                    <span>Total Paid/Payable:</span>
                    <span className="text-indigo-700 tabular-nums">{formatPrice(searchedOrder.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
