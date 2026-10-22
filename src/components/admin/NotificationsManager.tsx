'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Bell, Check, CheckCheck, CircleCheck, ExternalLink, LoaderCircle, RefreshCw, ShoppingBag, Package, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';
type AdminNotification = {
  id: string;
  type: 'NEW_ORDER' | 'ORDER_STATUS' | 'PAYMENT_STATUS' | 'LOW_STOCK' | 'COURIER_FAILURE' | 'SYSTEM';
  severity: NotificationSeverity;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

type Filter = 'all' | 'unread' | 'critical';

export function NotificationsManager({
  onUnreadCountChange,
  onOpenOrder,
}: {
  onUnreadCountChange: (count: number) => void;
  onOpenOrder: (orderId: string) => void;
}) {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('Sign in again to load administrator notifications.');
      const response = await fetch('/api/admin/notifications?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Notifications could not be loaded.');
      const nextItems = Array.isArray(payload.notifications) ? payload.notifications as AdminNotification[] : [];
      const nextUnread = Number.isFinite(payload.unreadCount) ? Math.max(0, payload.unreadCount) : 0;
      setItems(nextItems);
      setUnreadCount(nextUnread);
      onUnreadCountChange(nextUnread);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === 'unread') return !item.read_at;
    if (filter === 'critical') return item.severity === 'critical' || item.severity === 'warning';
    return true;
  }), [items, filter]);

  const updateReadState = async (item: AdminNotification | null, action: 'mark_read' | 'mark_unread' | 'mark_all_read') => {
    setBusyId(item?.id || 'all');
    setError(null);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('Sign in again to update notifications.');
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...(item ? { id: item.id } : {}) }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Notification could not be updated.');
      if (action === 'mark_all_read') {
        const now = new Date().toISOString();
        setItems((current) => current.map((entry) => ({ ...entry, read_at: entry.read_at || now })));
      } else if (item) {
        setItems((current) => current.map((entry) => entry.id === item.id
          ? { ...entry, read_at: action === 'mark_read' ? new Date().toISOString() : null }
          : entry));
      }
      const nextUnread = Number.isFinite(payload.unreadCount) ? Math.max(0, payload.unreadCount) : 0;
      setUnreadCount(nextUnread);
      onUnreadCountChange(nextUnread);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Notification could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  const iconFor = (item: AdminNotification) => {
    if (item.type === 'NEW_ORDER') return <ShoppingBag className="h-4 w-4" />;
    if (item.type === 'LOW_STOCK') return <Package className="h-4 w-4" />;
    if (item.type === 'COURIER_FAILURE') return <Truck className="h-4 w-4" />;
    if (item.severity === 'critical') return <AlertCircle className="h-4 w-4" />;
    if (item.severity === 'warning') return <AlertTriangle className="h-4 w-4" />;
    if (item.severity === 'success') return <CircleCheck className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const severityClass = (severity: NotificationSeverity) => {
    if (severity === 'critical') return 'bg-rose-50 text-rose-700 border-rose-100';
    if (severity === 'warning') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (severity === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    return 'bg-sky-50 text-sky-700 border-sky-100';
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Bell className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Order, payment, inventory and Pathao operational alerts.</p>
            <p className="mt-2 text-xs font-medium text-slate-600">{unreadCount} unread · showing the latest {items.length}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={() => void updateReadState(null, 'mark_all_read')} disabled={unreadCount === 0 || busyId !== null} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter notifications">
        {([
          ['all', 'All'],
          ['unread', `Unread (${unreadCount})`],
          ['critical', 'Needs attention'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${filter === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-400"><Bell className="h-6 w-6" /></div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">{items.length === 0 ? 'You’re all caught up' : 'No notifications match this filter'}</h3>
            <p className="mt-1 max-w-md text-xs text-slate-500">{items.length === 0 ? 'New orders, order/payment status changes, low-stock alerts and Pathao booking failures will appear here after the database migration is applied.' : 'Try a different filter to see more notifications.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <li key={item.id} className={`flex gap-3 p-4 transition-colors sm:p-5 ${item.read_at ? 'bg-white' : 'bg-indigo-50/40'}`}>
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${severityClass(item.severity)}`}>{iconFor(item)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm ${item.read_at ? 'font-semibold text-slate-800' : 'font-bold text-slate-950'}`}>{item.title}</h3>
                    {!item.read_at && <span className="h-2 w-2 rounded-full bg-indigo-600" aria-label="Unread" />}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityClass(item.severity)}`}>{item.severity}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.message}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString()} · {item.type.replaceAll('_', ' ').toLowerCase()}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.entity_type === 'order' && item.entity_id && (
                      <button type="button" onClick={() => { if (!item.read_at) void updateReadState(item, 'mark_read'); onOpenOrder(item.entity_id as string); }} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                        Open order <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                    <button type="button" disabled={busyId !== null} onClick={() => void updateReadState(item, item.read_at ? 'mark_unread' : 'mark_read')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      {item.read_at ? <><Bell className="h-3 w-3" /> Mark unread</> : <><Check className="h-3 w-3" /> Mark read</>}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-slate-400">Only administrator accounts can access these alerts. Notifications are generated server-side; this center is not the security audit log.</p>
    </section>
  );
}
