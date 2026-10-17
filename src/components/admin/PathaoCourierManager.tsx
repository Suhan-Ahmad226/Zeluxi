'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Activity, ExternalLink, MapPin, PackageCheck, RefreshCw, ShieldCheck, Truck, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useStore } from '@/src/context/StoreContext';

type MerchantStore = { store_id: number; store_name: string; store_address: string; is_active: number; city_id: number; zone_id: number; hub_id: number };
type City = { city_id: number; city_name: string };
type Zone = { zone_id: number; zone_name: string };
type Area = { area_id: number; area_name: string; home_delivery_available: boolean; pickup_available: boolean };
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
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [newStore, setNewStore] = useState({ name: '', contactName: '', contactNumber: '', address: '' });
  const [weightKg, setWeightKg] = useState('0.5');
  const [deliveryType, setDeliveryType] = useState<'48' | '12'>('48');
  const [quote, setQuote] = useState<{ final_price: number; price: number; discount: number; cod_percentage: number; additional_charge: number } | null>(null);
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
  const runAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const accessToken = await token();
      const response = await fetch('/api/admin/courier', { method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Courier request failed.');
      setMessage(data.message || 'Request completed.');
      if (Array.isArray(data.cities)) setCities(data.cities);
      if (Array.isArray(data.zones)) setZones(data.zones);
      if (Array.isArray(data.areas)) setAreas(data.areas);
      if (data.quote) setQuote(data.quote);
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
  const needsBooking = orders.filter((o) =>
    ['PENDING','CONFIRMED','PROCESSING','READY_TO_SHIP'].includes(o.status) &&
    !['BOOKED','BOOKING_IN_PROGRESS','BOOKING_UNKNOWN'].includes(o.courier?.bookingStatus || 'NOT_BOOKED')
  ).slice(0, 20);
  const booked = orders.filter((o) =>
    Boolean(o.courier?.consignmentId) && ['BOOKED','BOOKING_UNKNOWN'].includes(o.courier?.bookingStatus || '')
  ).slice(0, 20);
  const unresolvedWithoutConsignment = orders.filter((o) =>
    o.courier?.bookingStatus === 'BOOKING_UNKNOWN' && !o.courier?.consignmentId
  ).slice(0, 20);
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
      <h3 className="font-bold text-slate-900">Delivery locations & price calculator</h3>
      <p className="mt-1 text-sm text-slate-500">Fetch official Pathao city and zone IDs, then request a merchant price plan for the configured pickup store.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600">City
          <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedZone(''); setSelectedArea(''); setZones([]); setAreas([]); setQuote(null); if (e.target.value) void runAction('zones', { cityId: Number(e.target.value) }); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">Select city</option>{cities.map((city) => <option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Zone
          <select value={selectedZone} onChange={(e) => { setSelectedZone(e.target.value); setSelectedArea(''); setAreas([]); setQuote(null); if (e.target.value) void runAction('areas', { zoneId: Number(e.target.value) }); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" disabled={!zones.length}>
            <option value="">Select zone</option>{zones.map((zone) => <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Parcel weight (kg)
          <input type="number" min="0.5" max="10" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Delivery type
          <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as '48' | '12')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="48">Normal delivery</option><option value="12">On-demand delivery</option></select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => void runAction('cities')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Load cities</button>
        <button disabled={busy || !selectedCity || !selectedZone || !overview?.storeIdConfigured} onClick={() => void runAction('price', { cityId: Number(selectedCity), zoneId: Number(selectedZone), weightKg: Number(weightKg), deliveryType: Number(deliveryType) })} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Calculate Pathao price</button>
      </div>
      {quote && <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-4">
        <div><p className="text-xs text-emerald-800">Final estimated fee</p><p className="mt-1 text-xl font-bold text-emerald-950">৳{Number(quote.final_price).toLocaleString()}</p></div>
        <div><p className="text-xs text-emerald-800">Base price</p><p className="mt-1 font-semibold text-emerald-950">৳{Number(quote.price).toLocaleString()}</p></div>
        <div><p className="text-xs text-emerald-800">Discount</p><p className="mt-1 font-semibold text-emerald-950">৳{Number(quote.discount).toLocaleString()}</p></div>
        <div><p className="text-xs text-emerald-800">COD percentage</p><p className="mt-1 font-semibold text-emerald-950">{Number(quote.cod_percentage) * 100}%</p></div>
      </div>}
      {areas.length > 0 && <p className="mt-3 text-xs text-slate-500">Loaded {areas.length} areas for this zone; home delivery is available in {areas.filter((area) => area.home_delivery_available).length} of them.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="font-bold text-slate-900">Create a Pathao merchant store</h3>
      <p className="mt-1 text-sm text-slate-500">Choose a city, zone and area above first. Pathao may require approval before a new store can be used for pickup.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Store name<input value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} maxLength={50} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Contact person<input value={newStore.contactName} onChange={(e) => setNewStore({ ...newStore, contactName: e.target.value })} maxLength={50} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Contact number<input value={newStore.contactNumber} onChange={(e) => setNewStore({ ...newStore, contactNumber: e.target.value })} placeholder="01XXXXXXXXX" maxLength={11} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Area
          <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" disabled={!areas.length}><option value="">Select area</option>{areas.map((area) => <option key={area.area_id} value={area.area_id}>{area.area_name}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Full store address<textarea value={newStore.address} onChange={(e) => setNewStore({ ...newStore, address: e.target.value })} minLength={15} maxLength={120} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
      </div>
      <button disabled={busy || !overview?.configured || !selectedCity || !selectedZone || !selectedArea || newStore.name.trim().length < 3 || newStore.contactName.trim().length < 3 || !/^01[3-9]\d{8}$/.test(newStore.contactNumber) || newStore.address.trim().length < 15} onClick={() => void runAction('createStore', { name: newStore.name, contactName: newStore.contactName, contactNumber: newStore.contactNumber, address: newStore.address, cityId: Number(selectedCity), zoneId: Number(selectedZone), areaId: Number(selectedArea) })} className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Submit store for Pathao approval</button>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="font-bold text-slate-900">Orders ready for courier</h3><p className="mt-1 text-sm text-slate-500">Booking sends a real request to Pathao. If the outcome is unknown, reconcile it in Pathao before retrying.</p>
      {needsBooking.length ? <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{needsBooking.map((order) => <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">Order #{order.id}</p><p className="mt-1 text-xs text-slate-500">{order.customer.fullName} · {order.customer.phone} · BDT {order.grandTotal.toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">Booking: {order.courier?.bookingStatus || 'NOT_BOOKED'} {order.courier?.bookingError ? ' · ' + order.courier.bookingError : ''}</p></div><button disabled={busy || Boolean(workingOrder) || !overview?.configured || !overview?.storeIdConfigured} onClick={() => void book(order.id)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{workingOrder === order.id ? 'Working…' : 'Book Pathao'}</button></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No orders are waiting for booking.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="font-bold text-slate-900">Booked shipments</h3>
      {booked.length ? <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{booked.map((order) => <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">Order #{order.id}</p><p className="mt-1 text-xs text-slate-500">Consignment: {order.courier.consignmentId} · {order.status}</p>{order.courier.bookingStatus === 'BOOKING_UNKNOWN' && <p className="mt-1 text-xs font-semibold text-amber-700">Booking state needs reconciliation. Sync this consignment before any retry.</p>}</div><button disabled={Boolean(workingOrder)} onClick={() => void sync(order.id)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{workingOrder === order.id ? 'Syncing…' : 'Sync status'}</button></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No booked shipments are available in the current order list.</p>}
    </section>
    {unresolvedWithoutConsignment.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
      <h3 className="font-bold text-amber-900">Booking outcome requires manual reconciliation</h3>
      <p className="mt-1 text-sm text-amber-800">Pathao may have accepted the parcel even though Zeluxi did not receive a confirmed consignment ID. Open the Pathao Merchant Panel and search using the merchant order ID before retrying. Automated retry is disabled for safety.</p>
      <div className="mt-3 space-y-2">{unresolvedWithoutConsignment.map((order) => <div key={order.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm"><strong>Order #{order.id}</strong><p className="mt-1 text-xs text-slate-600">{order.courier.bookingError || 'Booking outcome is unknown.'}</p></div>)}</div>
    </section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="font-bold text-slate-900">Operational safeguards</h3><ul className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2"><li className="rounded-lg bg-slate-50 p-3">Duplicate booking protection and persistent shipment status</li><li className="rounded-lg bg-slate-50 p-3">Ambiguous outcomes must be reconciled before retry</li><li className="rounded-lg bg-slate-50 p-3">COD collection is separated from courier delivery fees</li><li className="rounded-lg bg-slate-50 p-3">Credentials and tokens never reach browser code</li></ul></section>
  </div>;
}
