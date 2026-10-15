import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { formatPrice } from '../../utils/formatters';
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCcw,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface RefundModalProps {
  order: Order | null;
  onClose: () => void;
  onRefundCompleted?: (orderId: string) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  order,
  onClose,
  onRefundCompleted,
}) => {
  const { refundOrder, language, showToast } = useStore();

  const [refundAmount, setRefundAmount] = useState<number>(order ? order.grandTotal : 0);
  const [refundReason, setRefundReason] = useState('Customer returned goods in good condition');
  const [customReason, setCustomReason] = useState('');
  const [adminStaffName, setAdminStaffName] = useState('Admin Finance Officer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (refundAmount <= 0 || refundAmount > order.grandTotal) {
      showToast(`Refund amount must be between ৳1 and ৳${order.grandTotal.toLocaleString()}`, 'error');
      return;
    }

    const finalReason = refundReason === 'Other' ? (customReason.trim() || 'Manual adjustment') : refundReason;

    setIsSubmitting(true);
    try {
      const res = await refundOrder(order.id, refundAmount, finalReason, adminStaffName);
      if (res.success) {
        if (onRefundCompleted) onRefundCompleted(order.id);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Initiate Gateway Refund</h3>
              <p className="text-[11px] text-slate-500 font-mono">Order #{order.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmitRefund} className="p-6 space-y-4 text-xs">
          {/* Order Details Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-900">{order.customer.fullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-mono font-bold text-slate-800">{order.paymentMethod}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">Total Settled:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatPrice(order.grandTotal, language)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Refund Amount (BDT) *
            </label>
            <input
              type="number"
              min="1"
              max={order.grandTotal}
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Maximum allowable refund: <strong>{formatPrice(order.grandTotal, language)}</strong>
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Refund *</label>
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="Customer returned goods in good condition">
                Customer returned goods in verified condition
              </option>
              <option value="Damaged / defective item replaced with refund">
                Damaged or defective item discrepancy
              </option>
              <option value="Parcel undelivered / courier lost package">
                Parcel undelivered / courier return
              </option>
              <option value="Duplicate payment settlement discrepancy">
                Duplicate payment settlement discrepancy
              </option>
              <option value="Customer cancelled before courier dispatch">
                Customer cancelled before dispatch
              </option>
              <option value="Other">Other (Custom specification)</option>
            </select>
          </div>

          {refundReason === 'Other' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Custom Reason</label>
              <input
                type="text"
                required
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter justification for finance audit..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Authorizing Staff Member *
            </label>
            <input
              type="text"
              required
              value={adminStaffName}
              onChange={(e) => setAdminStaffName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              Issuing this refund will automatically transition the order payment status to <strong>REFUNDED</strong> and record a permanent entry in the store financial audit trail.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Processing Refund...' : 'Confirm & Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
