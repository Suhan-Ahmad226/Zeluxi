import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { StoreImage } from '../common/StoreImage';
import { Product } from '../../types';
import { formatPrice, formatDate } from '../../utils/formatters';
import {
  Boxes,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  History,
  TrendingDown,
  ArrowUpDown,
  X,
  Edit2,
  Check,
  ShieldCheck,
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const { products, auditLogs, adjustStock, language, showToast } = useStore();

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'HEALTHY' | 'LOW' | 'OUT'>('ALL');
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<'set' | 'delta'>('delta');
  const [adjustValue, setAdjustValue] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Supplier batch arrival');
  const [customReason, setCustomReason] = useState('');

  // Inventory Metrics
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalRetailValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const totalCostValue = products.reduce((sum, p) => sum + p.stock * (p.costPrice || p.price * 0.6), 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  const filteredProducts = products.filter((p) => {
    // Filter by stock level
    if (stockFilter === 'OUT' && p.stock > 0) return false;
    if (stockFilter === 'LOW' && (p.stock === 0 || p.stock > p.lowStockThreshold)) return false;
    if (stockFilter === 'HEALTHY' && p.stock <= p.lowStockThreshold) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openAdjustModal = (product: Product, initialDelta: number = 0) => {
    setAdjustingProduct(product);
    setAdjustMode(initialDelta !== 0 ? 'delta' : 'set');
    setAdjustValue(initialDelta !== 0 ? initialDelta : product.stock);
    setAdjustReason('Supplier batch arrival');
    setCustomReason('');
  };

  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    let targetStock = adjustingProduct.stock;
    if (adjustMode === 'set') {
      targetStock = Math.max(0, Number(adjustValue));
    } else {
      targetStock = Math.max(0, adjustingProduct.stock + Number(adjustValue));
    }

    const finalReason = adjustReason === 'Other' ? (customReason.trim() || 'Manual adjustment') : adjustReason;
    adjustStock(adjustingProduct.id, targetStock, finalReason);
    setAdjustingProduct(null);
  };

  // Recent Stock Audit Logs
  const stockLogs = auditLogs
    .filter((log) => log.action === 'STOCK_ADJUSTMENT' || log.action === 'ORDER_CREATED')
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Inventory Control & Stock Adjustments</h3>
          <p className="text-xs text-slate-500">
            Real-time stock levels, inventory valuation, atomic restocks and audit trail logs
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Total In-Stock Units</span>
          <p className="text-2xl font-bold font-mono text-slate-900">{totalUnits.toLocaleString()}</p>
          <span className="text-[10px] text-indigo-600 font-semibold">{products.length} catalog items</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Low Stock Alerts</span>
          <p className="text-2xl font-bold font-mono text-amber-600">{lowStockCount}</p>
          <span className="text-[10px] text-amber-700 font-semibold">Below threshold limit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Out of Stock</span>
          <p className="text-2xl font-bold font-mono text-rose-600">{outOfStockCount}</p>
          <span className="text-[10px] text-rose-700 font-semibold">Immediate reorder required</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Retail Valuation (BDT)</span>
          <p className="text-xl font-bold font-mono text-slate-900 truncate">
            {formatPrice(totalRetailValue, language)}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            Est Cost: {formatPrice(totalCostValue, language)}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or collection..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Stock Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'HEALTHY', label: 'Healthy Stock' },
            { id: 'LOW', label: `Low Stock (${lowStockCount})` },
            { id: 'OUT', label: `Out of Stock (${outOfStockCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStockFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                stockFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Retail Unit Price</th>
                <th className="p-3.5 text-center">Available Stock</th>
                <th className="p-3.5 text-center">Threshold</th>
                <th className="p-3.5 text-center">Stock Health</th>
                <th className="p-3.5 text-right">Inventory Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const isOut = prod.stock === 0;
                const isLow = prod.stock > 0 && prod.stock <= prod.lowStockThreshold;

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <StoreImage
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-xs">{prod.name}</p>
                          <p className="font-mono text-[11px] text-slate-500 font-semibold">{prod.sku}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600 font-medium">{prod.category}</td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatPrice(prod.price, language)}
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-base text-slate-900">
                      {prod.stock}
                    </td>

                    <td className="p-3.5 text-center font-mono text-slate-500">
                      {prod.lowStockThreshold}
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isOut
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => adjustStock(prod.id, Math.max(0, prod.stock - 1), 'Counter decrement by staff')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                          title="Quick -1 unit"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => adjustStock(prod.id, prod.stock + 5, 'Quick batch arrival restock')}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs"
                          title="Quick +5 units"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => openAdjustModal(prod)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-2xs"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Adjust Inventory Stock</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{adjustingProduct.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjustment} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{adjustingProduct.name}</p>
                  <p className="text-slate-500 text-[11px]">Category: {adjustingProduct.category}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Current Stock</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{adjustingProduct.stock}</span>
                </div>
              </div>

              {/* Adjustment Mode */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustMode('delta')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    adjustMode === 'delta' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Add / Deduct Quantity (+/-)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('set')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    adjustMode === 'set' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Set Absolute Stock
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {adjustMode === 'delta' ? 'Adjustment Amount (e.g. +10 or -5)' : 'New Total Stock Level'}
                </label>
                <input
                  type="number"
                  required
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Resulting stock: <strong>
                    {adjustMode === 'delta'
                      ? Math.max(0, adjustingProduct.stock + Number(adjustValue))
                      : Math.max(0, Number(adjustValue))}
                  </strong> units
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Log Reason *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Supplier batch arrival">Supplier batch arrival (Restock)</option>
                  <option value="Damaged in atelier transit">Damaged in atelier storage / transit</option>
                  <option value="Inventory audit recount">Physical inventory audit discrepancy</option>
                  <option value="Customer return restock">Customer return verified & restocked</option>
                  <option value="Internal PR & sampling">Internal display / sample giveaway</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>

              {adjustReason === 'Other' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custom Reason</label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Provide detailed justification for audit..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs active:scale-95 transition-all"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <span>Recent Inventory Adjustment Audit Trail</span>
        </h4>
        <div className="divide-y divide-slate-100">
          {stockLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">{log.action}: </span>
                <span className="text-slate-600">{log.details}</span>
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className="text-[10px] text-slate-400 font-mono block">{formatDate(log.timestamp, language)}</span>
                <span className="text-[10px] text-indigo-600 font-medium">{log.actor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
