'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Activity, ExternalLink, MapPin, PackageCheck, RefreshCw, ShieldCheck, Truck, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useStore } from '@/src/context/StoreContext';

type MerchantStore = { store_id: number; store_name: string; store_address: string; is_active: number; city_id: number; zone_id: number; hub_id: number };
type Overview = { configured: boolean; environment: string; storeIdConfigured: boolean; message: string; stores?: MerchantStore[]; shipments?: Array<{ order_id: string; status: string; consignment_id: string | null; delivery_fee: number | null; updated_at: string }> };
async function token() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sign in as an administrator to manage courier operations.');
  return data.session.access_token;
}
export default function PathaoCourierManager() {
  const { orders, acceptOrderAndBookCourier, syncCourierStatus } = useStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [workingOrder, setWorkingOrder] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState('');
  const load = useCallback(async () => {
    try {
      const accessToken = await token();
      const response = await fetch('/api/admin/courier', { headers: { Authorization: 'Bearer ' + accessToken }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Courier status could not be loaded.');
      setOverview((old) => ({ ...data, stores: old?.stores })); setLastChecked(new Date().toLocaleString());
    } catch (e) { setError(e instanceof Error ? e.message : 'Courier status could not be loaded.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const runAction = async (action: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const accessToken = await token();
      const response = await fetch('/api/admin/courier', { method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ action }), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Courier request failed.');
      setMessage(data.message || 'Request completed.');
      if (Array.isArray(data.stores)) setOverview((old) => ({ ...(old || { configured: false, environment: 'unconfigured', storeIdConfigured: false, message: '' }), stores: data.stores }));
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Courier request failed.'); }
    finally { setBusy(false); }
  };
  const book = async (orderId: string) => {
    setWorkingOrder(orderId); setError(''); setMessage('');
    const result = await acceptOrderAndBookCourier(orderId, 'Admin');
    if (result.success) setMessage(result.message); else setError(result.message);
    await load(); setWorkingOrder('');
  };
  const sync = async (orderId: string) => {
    setWorkingOrder(orderId); setError(''); setMessage('');
    const result = await syncCourierStatus(orderId);
    if (result.success) setMessage(result.message); else setError(result.message);
    await load(); setWorkingOrder('');
  };
  const needsBooking = orders.filter((o) => ['PENDING','CONFIRMED','PROCESSING','READY_TO_SHIP'].includes(o.status) && o.courier?.bookingStatus !== 'BOOKED').slice(0, 20);
  const booked = orders.filter((o) => Boolean(o.courier?.consignmentId) && o.courier?.bookingStatus === 'BOOKED').slice(0, 20);
  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"><Truck className="h-4 w-4" /> Courier operations</div><h3 className="text-lg font-bold text-slate-900">Pathao Merchant API</h3><p className="mt-1 max-w-2xl text-sm text-slate-500">Booking, merchant stores, price/location APIs and short-info tracking are managed from Zeluxi. API credentials remain server-side.</p></div>
        <a href="https://merchant.pathao.com/" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open Pathao Panel <ExternalLink className="h-4 w-4" /></a>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4" /> Connection</div><div className="mt-2 flex items-center gap-2 text-sm font-bold">{overview?.configured ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}{overview?.configured ? 'Credentials configured' : 'Setup required'}</div><p className="mt-1 text-xs text-slate-500">{overview?.message || 'Checking configuration…'}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" /> Environment</div><div className="mt-2 text-sm font-bold capitalize">{overview?.environment || 'Checking…'}</div><p className="mt-1 text-xs text-slate-500">Use sandbox until production credentials and merchant approval are verified.</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-4 w-4" /> Pickup store</div><div className="mt-2 text-sm font-bold">{overview?.storeIdConfigured ? 'Store ID configured' : 'Store ID missing'}</div><p className="mt-1 text-xs text-slate-500">Configured using PATHAO_STORE_ID on the server.</p></div>
      </div>
      {(error || message) && <div role="status" className={'mt-4 rounded-lg border p-3 text-sm ' + (error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error || message}</div>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => void runAction('test')} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Wifi className="h-4 w-4" /> Test connection</button>
        <button disabled={busy} onClick={() => void runAction('stores')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"><MapPin className="h-4 w-4" /> Sync stores</button>
        <button disabled={busy} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} /> Refresh status</button>
      </div>
      {lastChecked && <p className="mt-3 text-xs text-slate-400">Last checked: {lastChecked}</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><PackageCheck className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">Merchant stores</h3><p className="mt-1 text-sm text-slate-500">Synced directly from Pathao after the connection is tested.</p></div></div>
      {overview?.stores?.length ? <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{overview.stores.map((store) => <div key={store.store_id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{store.store_name} <span className="ml-1 text-xs font-normal text-slate-500">#{store.store_id}</span></p><p className="mt-1 text-xs text-slate-500">{store.store_address}</p></div><span className={'w-fit rounded-full px-2.5 py-1 text-xs font-semibold ' + (store.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{store.is_active ? 'Active' : 'Inactive'}</span></div>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No merchant store data loaded. Test the connection and sync stores.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="font-bold text-slate-900">Orders ready for courier</h3><p className="mt-1 text-sm text-slate-500">Booking sends a real request to Pathao. If the outcome is unknown, reconcile it in Pathao before retrying.</p>
      {needsBooking.length ? <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{needsBooking.map((order) => <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">Order #{order.id}</p><p className="mt-1 text-xs text-slate-500">{order.customer.fullName} · {order.customer.phone} · BDT {order.grandTotal.toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">Booking: {order.courier?.bookingStatus || 'NOT_BOOKED'} {order.courier?.bookingError ? ' · ' + order.courier.bookingError : ''}</p></div><button disabled={busy || Boolean(workingOrder) || !overview?.configured || !overview?.storeIdConfigured} onClick={() => void book(order.id)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{workingOrder === order.id ? 'Working…' : 'Book Pathao'}</button></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No orders are waiting for booking.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="font-bold text-slate-900">Booked shipments</h3>
      {booked.length ? <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{booked.map((order) => <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">Order #{order.id}</p><p className="mt-1 text-xs text-slate-500">Consignment: {order.courier.consignmentId} · {order.status}</p></div><button disabled={Boolean(workingOrder)} onClick={() => void sync(order.id)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{workingOrder === order.id ? 'Syncing…' : 'Sync status'}</button></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No booked shipments are available in the current order list.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="font-bold text-slate-900">Operational safeguards</h3><ul className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2"><li className="rounded-lg bg-slate-50 p-3">Duplicate booking protection and persistent shipment status</li><li className="rounded-lg bg-slate-50 p-3">Ambiguous outcomes must be reconciled before retry</li><li className="rounded-lg bg-slate-50 p-3">COD collection is separated from courier delivery fees</li><li className="rounded-lg bg-slate-50 p-3">Credentials and tokens never reach browser code</li></ul></section>
  </div>;
}
