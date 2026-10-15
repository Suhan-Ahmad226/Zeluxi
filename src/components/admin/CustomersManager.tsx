import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CustomerRecord, Order } from '../../types';
import { formatPrice } from '../../utils/formatters';
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Save,
  X,
  ShoppingBag,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface CustomersManagerProps {
  onViewOrderDetails?: (order: Order) => void;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({ onViewOrderDetails }) => {
  const {
    customers,
    orders,
    updateCustomerStatus,
    updateCustomerNotes,
    language,
    showToast,
  } = useStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const openCustomerModal = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setNotesInput(customer.notes || '');
    setIsEditingNotes(false);
  };

  const handleSaveNotes = () => {
    if (!selectedCustomer) return;
    updateCustomerNotes(selectedCustomer.id, notesInput.trim());
    setSelectedCustomer((prev) => (prev ? { ...prev, notes: notesInput.trim() } : null));
    setIsEditingNotes(false);
  };

  const handleToggleStatus = (customer: CustomerRecord) => {
    const nextStatus = customer.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    updateCustomerStatus(customer.id, nextStatus);
    setSelectedCustomer((prev) => (prev && prev.id === customer.id ? { ...prev, status: nextStatus } : prev));
  };

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter !== 'ALL') {
      const currentStatus = c.status || 'ACTIVE';
      if (currentStatus !== statusFilter) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Get orders placed by selected customer
  const customerOrders = selectedCustomer
    ? orders.filter(
        (o) =>
          o.customer.phone === selectedCustomer.phone ||
          (o.customer.email && o.customer.email.toLowerCase() === selectedCustomer.email.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Customer Accounts & Lifetime Value</h3>
          <p className="text-xs text-slate-500">
            Search verified buyers, inspect purchase frequency, update administrative notes, and manage account access
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Customers' : st === 'ACTIVE' ? 'Active' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5">Phone & Contact</th>
                <th className="p-3.5">City / Delivery Area</th>
                <th className="p-3.5 text-center">Orders Placed</th>
                <th className="p-3.5 text-right">Lifetime Spent (LTV)</th>
                <th className="p-3.5 text-center">Account Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((cust) => {
                const isSuspended = cust.status === 'SUSPENDED';

                return (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {cust.fullName.charAt(0)}
                        </div>
                        <div>
                          <span>{cust.fullName}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Joined: {cust.joinedDate}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-mono text-slate-800 font-semibold block">{cust.phone}</span>
                      <span className="text-[11px] text-slate-400">{cust.email}</span>
                    </td>

                    <td className="p-3.5 text-slate-600 font-medium">{cust.city}</td>

                    <td className="p-3.5 text-center font-mono font-bold text-indigo-600">
                      {cust.totalOrders}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatPrice(cust.totalSpent, language)}
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuspended
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => openCustomerModal(cust)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile & Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {selectedCustomer.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.fullName}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Customer ID: {selectedCustomer.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Account Quick Metrics & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Lifetime Spent</span>
                  <p className="font-bold font-mono text-sm text-slate-900 mt-0.5">
                    {formatPrice(selectedCustomer.totalSpent, language)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Total Orders</span>
                  <p className="font-bold font-mono text-sm text-indigo-600 mt-0.5">
                    {selectedCustomer.totalOrders}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Account Status</span>
                  <p
                    className={`font-bold text-xs mt-0.5 ${
                      selectedCustomer.status === 'SUSPENDED' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {selectedCustomer.status === 'SUSPENDED' ? 'Suspended' : 'Active'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Member Since</span>
                  <p className="font-bold font-mono text-xs text-slate-700 mt-0.5">
                    {selectedCustomer.joinedDate}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Contact & Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono font-semibold">{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedCustomer.city}</span>
                  </div>
                </div>
              </div>

              {/* Internal Staff Notes */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Internal Staff Notes (Administrative Only)</span>
                  </h4>
                  {!isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="e.g. VIP client, preferred courier is Pathao Banani Hub, prefers evening deliveries..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsEditingNotes(false)}
                        className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow-2xs"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {selectedCustomer.notes || 'No administrative notes recorded for this customer yet.'}
                  </p>
                )}
              </div>

              {/* Order History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Recent Purchases ({customerOrders.length} records)</span>
                </h4>

                {customerOrders.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px] p-3 bg-slate-50 rounded-lg">
                    No active orders linked with this phone number in the store database.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{ord.createdAt}</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {ord.items.length} items · {ord.paymentMethod}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-mono font-bold text-slate-900 block">
                              {formatPrice(ord.grandTotal, language)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                ord.status === 'DELIVERED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'CANCELLED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>

                          {onViewOrderDetails && (
                            <button
                              onClick={() => {
                                setSelectedCustomer(null);
                                onViewOrderDetails(ord);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="Inspect Order"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Account Status Control */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedCustomer)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                  selectedCustomer.status === 'SUSPENDED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {selectedCustomer.status === 'SUSPENDED' ? 'Reactivate Customer Account' : 'Suspend Customer Account'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
