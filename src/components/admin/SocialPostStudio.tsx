import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CalendarClock, CheckCircle2, Clock3, Facebook, FileText, Image as ImageIcon,
  Instagram, LayoutDashboard, Loader2, Megaphone, MessageCircle, Pause, Play, Plus,
  RefreshCw, Save, Send, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, Video,
  WandSparkles, X,
} from 'lucide-react';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../utils/formatters';
import { StoreImage } from '../common/StoreImage';
import { useStore } from '../../context/StoreContext';

type Account = { id: string; provider_account_id: string; account_name: string; status: string; provider?: string };
type Goal = 'PRODUCT_SHOWCASE' | 'PRODUCT_EDUCATION' | 'NEW_ARRIVAL' | 'OFFER_CAMPAIGN' | 'CUSTOMER_TRUST' | 'ENGAGEMENT';
type Post = { id: string; product_id: string | null; account_id: string; caption: string; media_urls: string[]; product_url: string; status: string; content_goal?: Goal; scheduled_at: string | null; published_at: string | null; last_error: string | null; created_at: string };
type Promotion = { id: string; product_id: string; product_name_snapshot: string; status: string; interval_days: number; next_run_at: string | null; posts_published: number; approval_required: boolean };
type Props = { products: Product[]; initialProduct?: Product | null; onInitialProductHandled?: () => void };

const GOALS: { id: Goal; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'PRODUCT_SHOWCASE', label: 'Product showcase', description: 'Highlight product value and drive orders', icon: ImageIcon },
  { id: 'PRODUCT_EDUCATION', label: 'Tips & education', description: 'Explain useful facts and how to choose', icon: FileText },
  { id: 'NEW_ARRIVAL', label: 'New arrival', description: 'Introduce a newly published product', icon: Sparkles },
  { id: 'OFFER_CAMPAIGN', label: 'Offer campaign', description: 'Promote only verified discounts', icon: Target },
  { id: 'CUSTOMER_TRUST', label: 'Build trust', description: 'Use verified reviews or transparent facts', icon: ShieldCheck },
  { id: 'ENGAGEMENT', label: 'Engagement', description: 'Start a relevant conversation', icon: MessageCircle },
];
const goalLabel = (goal?: string) => GOALS.find((item) => item.id === goal)?.label || 'Product showcase';
const statusTone: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', AWAITING_APPROVAL: 'bg-amber-100 text-amber-800',
  SCHEDULED: 'bg-blue-100 text-blue-800', PUBLISHING: 'bg-violet-100 text-violet-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800', FAILED: 'bg-rose-100 text-rose-800', UNCERTAIN: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-slate-100 text-slate-500',
};
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';

export const SocialPostStudio: React.FC<Props> = ({ products, initialProduct, onInitialProductHandled }) => {
  const { settings } = useStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [productId, setProductId] = useState(initialProduct?.id || '');
  const [accountId, setAccountId] = useState('');
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [language, setLanguage] = useState<'bn' | 'en' | 'mix'>('bn');
  const [contentGoal, setContentGoal] = useState<Goal>('PRODUCT_SHOWCASE');
  const [tone, setTone] = useState<'friendly' | 'premium' | 'minimal' | 'energetic' | 'informative'>('friendly');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [repeatDays, setRepeatDays] = useState(3);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [maxPosts, setMaxPosts] = useState('10');
  const [scheduledAt, setScheduledAt] = useState('');
  const [activeView, setActiveView] = useState<'overview' | 'composer' | 'calendar' | 'posts' | 'promotions' | 'analytics'>('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draftId, setDraftId] = useState('');
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [refreshProductSnapshot, setRefreshProductSnapshot] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL');

  const product = useMemo(() => products.find((item) => item.id === productId) || initialProduct || null, [products, productId, initialProduct]);
  const publishedProducts = useMemo(() => products.filter((item) => item.published && !item.archived), [products]);
  const mediaOptions = useMemo(() => product ? [...(product.images || []), ...(product.videoUrl ? [product.videoUrl] : [])].filter((url) => /^https:\/\//.test(url)) : [], [product]);
  const currentMedia = mediaOptions[mediaIndex] || '';
  const connectedAccounts = accounts.filter((item) => item.status === 'CONNECTED');
  const stats = useMemo(() => ({
    connected: connectedAccounts.length,
    drafts: posts.filter((item) => item.status === 'DRAFT').length,
    scheduled: posts.filter((item) => ['SCHEDULED', 'AWAITING_APPROVAL'].includes(item.status)).length,
    published: posts.filter((item) => item.status === 'PUBLISHED').length,
    failed: posts.filter((item) => ['FAILED','UNCERTAIN'].includes(item.status)).length,
  }), [connectedAccounts.length, posts]);

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Please sign in again as an administrator.');
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Social publishing request failed.');
    return payload;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [a, p, promos] = await Promise.all([
        api('/api/admin/social?kind=accounts'),
        api('/api/admin/social?kind=posts'),
        api('/api/admin/social?kind=promotions'),
      ]);
      setAccounts(a.accounts || []);
      setPosts(p.posts || []);
      setPromotions(promos.promotions || []);
      if (!accountId && a.accounts?.length) { const first = a.accounts.find((item: Account) => item.status === 'CONNECTED')?.id || a.accounts[0].id; setAccountId(first); setAccountIds([first]); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Social Studio.');
    }
  }, [api, accountId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('socialConnection');
    const message = params.get('message');
    if (result === 'success') setNotice(message || 'Facebook Page connected. Refresh the Page list.');
    if (result === 'error') setError(message || 'Facebook Page connection failed.');
  }, []);
  useEffect(() => {
    if (initialProduct) {
      setProductId(initialProduct.id);
      setCaption('');
      setDraftId('');
      setActiveView('composer');
      onInitialProductHandled?.();
    }
  }, [initialProduct, onInitialProductHandled]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); }
    finally { setBusy(false); }
  };

  const connectFacebook = () => run(async () => {
    const result = await api('/api/admin/social/oauth/start', { method: 'POST', body: '{}' });
    if (!result.url) throw new Error('Meta did not return an authorization URL.');
    window.location.assign(result.url);
  });

  const generate = () => run(async () => {
    if (!product || !accountId) throw new Error('Select a product and a connected Facebook Page first.');
    if (contentGoal === 'CUSTOMER_TRUST') {
      setNotice('Trust content will use only verified review data supplied to the AI. No customer review is fabricated.');
    }
    const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify({
      action: 'generate_caption', productId: product.id, accountId, language, contentGoal, tone,
    }) });
    setCaption(result.caption || '');
    if (draftId || draftIds.length) setRefreshProductSnapshot(true);
    setNotice('AI draft generated. Check every product fact before publishing.');
  });

  const draftPayload = () => ({
    action: 'create_draft', productId: product?.id, accountId, caption: caption.trim(),
    mediaUrls: selectedMediaUrls.length ? selectedMediaUrls : currentMedia ? [currentMedia] : [], language, contentGoal, accountIds: accountIds.length ? accountIds : [accountId],
  });

  const saveDraft = () => run(async () => {
    if (!product || !accountId || !caption.trim()) throw new Error('Select a product, Page and non-empty caption.');
    const mediaUrls = selectedMediaUrls.length ? selectedMediaUrls : currentMedia ? [currentMedia] : [];
    const existingIds = draftIds.length ? draftIds : draftId ? [draftId] : [];
    if (existingIds.length) {
      for (const id of existingIds) await api('/api/admin/social', { method: 'POST', body: JSON.stringify({
        action: 'update_post', postId: id, caption: caption.trim(), contentGoal, mediaUrls, refreshProductSnapshot,
      }) });
      setRefreshProductSnapshot(false);
      setNotice('Draft updated for all selected Pages.');
    } else {
      const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify(draftPayload()) });
      const ids = (result.posts || [result.post]).filter(Boolean).map((post: {id:string}) => post.id);
      setDraftIds(ids); setDraftId('');
      setNotice(ids.length > 1 ? 'Drafts saved for all selected Pages.' : 'Draft saved.');
    }
    await refresh();
  });

  const publishNow = () => run(async () => {
    if (!product || !accountId || !caption.trim()) throw new Error('Select a product, Page and prepare a caption first.');
    let ids = draftIds.length ? [...draftIds] : draftId ? [draftId] : [];
    if (!ids.length) {
      const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify(draftPayload()) });
      ids = (result.posts || [result.post]).filter(Boolean).map((post: { id: string }) => post.id);
    } else {
      const mediaUrls = selectedMediaUrls.length ? selectedMediaUrls : currentMedia ? [currentMedia] : [];
      const updates = await Promise.allSettled(ids.map((id) => api('/api/admin/social', { method: 'POST', body: JSON.stringify({
        action: 'update_post', postId: id, caption: caption.trim(), contentGoal, mediaUrls, refreshProductSnapshot,
      }) })));
      ids = ids.filter((_, index) => updates[index].status === 'fulfilled');
      if (!ids.length) throw new Error('Could not update any selected Page drafts. No posts were published.');
    }
    const results = await Promise.allSettled(ids.map((id) => api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'publish_now', postId: id }) })));
    const failed = results.filter((result) => result.status === 'rejected').length;
    await refresh();
    setDraftId(''); setDraftIds([]);
    if (failed) throw new Error(`${ids.length - failed} Page(s) published successfully; ${failed} failed or need checking. Review each Page in publishing history.`);
    setNotice(ids.length > 1 ? 'Publishing requests sent to all selected Facebook Pages.' : 'Facebook accepted the publishing request. Check the publishing history for its final status.');
  });

  const schedulePost = () => run(async () => {
    if (!scheduledAt) throw new Error('Choose a future date and time.');
    let ids = draftIds.length ? [...draftIds] : draftId ? [draftId] : [];
    if (!ids.length) {
      if (!product || !accountId || !caption.trim()) throw new Error('Select a product and prepare a caption first.');
      const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify(draftPayload()) });
      ids = (result.posts || [result.post]).filter(Boolean).map((post: {id:string}) => post.id);
    }
    const mediaUrls = selectedMediaUrls.length ? selectedMediaUrls : currentMedia ? [currentMedia] : [];
    const results = await Promise.allSettled(ids.map(async (id) => {
      await api('/api/admin/social', { method: 'POST', body: JSON.stringify({
        action: 'update_post', postId: id, caption: caption.trim(), mediaUrls, refreshProductSnapshot,
      }) });
      await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'schedule_post', postId: id, scheduledAt: new Date(scheduledAt).toISOString() }) });
    }));
    const scheduledIds = ids.filter((_, index) => results[index].status === 'fulfilled');
    setDraftIds(scheduledIds); setDraftId('');
    await refresh();
    setActiveView('calendar');
    const failed = results.length - scheduledIds.length;
    if (failed) throw new Error(`${scheduledIds.length} Page(s) scheduled; ${failed} could not be scheduled. Check publishing history.`);
    setNotice(ids.length > 1 ? 'Post scheduled for all selected Facebook Pages.' : 'Post scheduled. Automatic publishing requires the protected server scheduler to be configured.');
  });

  const createPromotion = () => run(async () => {
    if (!product || !accountId) throw new Error('Select a product and connected Facebook Page.');
    if (!approvalRequired && !window.confirm('Auto-publish will publish future posts without manual approval. Continue?')) return;
    await api('/api/admin/social', { method: 'POST', body: JSON.stringify({
      action: 'create_promotion', productId: product.id, accountId, accountIds: accountIds.length ? accountIds : [accountId], intervalDays: repeatDays,
      approvalRequired, autoPublish: !approvalRequired, maxPosts: maxPosts ? Number(maxPosts) : null,
    }) });
    setNotice(`Recurring promotion created for ${product.name}. First repeat is due after ${repeatDays} days.`);
    await refresh(); setActiveView('promotions');
  });

  const disconnectAccount = (id: string) => run(async () => {
    if (!window.confirm('Disconnect this Facebook Page? Its recurring promotions will be paused.')) return;
    await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'disconnect_account', accountId: id }) });
    setNotice('Facebook Page disconnected. Its active promotions have been paused.');
    await refresh();
  });

  const promotionAction = (id: string, action: 'pause_promotion' | 'resume_promotion') => run(async () => {
    await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action, promotionId: id }) });
    await refresh();
  });

  const postAction = (id: string, action: 'approve_post' | 'cancel_post' | 'publish_now') => run(async () => {
    await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action, postId: id }) });
    await refresh();
  });

  const deleteDraft = (id: string) => run(async () => {
    await api(`/api/admin/social?postId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (draftId === id) { setDraftId(''); setCaption(''); }
    setDraftIds((current) => current.filter((draft) => draft !== id));
    setNotice('Draft deleted.'); await refresh();
  });

  const editPost = (post: Post) => {
    setDraftId(post.id); setDraftIds([post.id]); setProductId(post.product_id || ''); setAccountId(post.account_id);
    setCaption(post.caption); setContentGoal(post.content_goal || 'PRODUCT_SHOWCASE');
    setRefreshProductSnapshot(false); setMediaIndex(0); setActiveView('composer');
    setNotice('Post loaded into the composer. Review it before saving or publishing.');
  };

  const nav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'composer', label: 'Create post', icon: WandSparkles },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'posts', label: 'Post history', icon: FileText },
    { id: 'promotions', label: 'Campaigns', icon: Megaphone },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ] as const;
  const filteredPosts = posts.filter((post) => historyFilter === 'ALL' || post.status === historyFilter);
  const upcoming = posts.filter((post) => ['SCHEDULED', 'AWAITING_APPROVAL'].includes(post.status)).sort((a,b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''));
  const monthLabel = new Date().toLocaleDateString('en-BD', { month: 'long', year: 'numeric' });

  return (
    <section className="space-y-5 sm:space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/10 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100">
              <Megaphone className="h-3.5 w-3.5" /> {settings.storeName?.trim() || 'PeloMart'} Marketing Studio
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Turn products into better stories.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Plan, write, review and publish product-led content from one focused workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void refresh()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
            <button onClick={() => { setDraftId(''); setDraftIds([]); setCaption(''); setSelectedMediaUrls([]); setActiveView('composer'); }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-indigo-50"><Plus className="h-4 w-4" /> Create content</button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: 'Connected Pages', value: stats.connected, icon: Facebook },
            { label: 'Drafts', value: stats.drafts, icon: FileText },
            { label: 'Scheduled', value: stats.scheduled, icon: Clock3 },
            { label: 'Published', value: stats.published, icon: CheckCircle2 },
            { label: 'Needs attention', value: stats.failed, icon: ShieldCheck },
          ].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4"><div className="flex items-center justify-between text-slate-300"><span className="text-[11px] sm:text-xs">{item.label}</span><item.icon className="h-4 w-4 opacity-80" /></div><div className="mt-2 text-2xl font-bold tabular-nums">{item.value}</div></div>)}
        </div>
      </header>

      {(error || notice) && <div role="status" aria-live="polite" className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><span>{error || notice}</span><button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss message"><X className="h-4 w-4" /></button></div>}

      <nav aria-label="Social Studio sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveView(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${activeView === id ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>)}
      </nav>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Facebook className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">Facebook Page</p><p className="text-xs text-slate-600">{connectedAccounts.length ? `${connectedAccounts.length} connected Page(s)` : 'Connect a Page to start publishing'}</p></div>
          <button onClick={() => void connectFacebook()} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{connectedAccounts.length ? 'Add Page' : 'Connect'}</button>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white"><Instagram className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">Instagram</p><p className="text-xs text-slate-500">Not connected · setup and API review required</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Coming next</span>
        </div>
      </div>

      {activeView === 'overview' && <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Your content workflow</h3><p className="mt-1 text-xs text-slate-500">A simple path from product selection to publishing.</p></div><button onClick={() => setActiveView('composer')} className="text-sm font-bold text-indigo-700 hover:underline">Start creating</button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { n: '01', title: 'Choose a product', text: 'Use verified catalog details, pricing and media.', icon: ImageIcon },
                { n: '02', title: 'Create the story', text: 'Select a marketing goal and generate an editable caption.', icon: Sparkles },
                { n: '03', title: 'Review & publish', text: 'Preview, approve and publish or schedule safely.', icon: Send },
              ].map((step) => <div key={step.n} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold text-indigo-600">{step.n}</span><step.icon className="h-5 w-5 text-slate-400" /></div><h4 className="mt-3 text-sm font-bold text-slate-900">{step.title}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{step.text}</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Upcoming content</h3><p className="mt-1 text-xs text-slate-500">Scheduled and approval-pending posts</p></div><button onClick={() => setActiveView('calendar')} className="text-sm font-bold text-indigo-700 hover:underline">Open calendar</button></div>
            <div className="mt-4 divide-y divide-slate-100">{upcoming.slice(0,4).map((post) => <div key={post.id} className="flex items-center gap-3 py-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><CalendarClock className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{products.find((p) => p.id === post.product_id)?.name || 'Product post'}</p><p className="text-xs text-slate-500">{goalLabel(post.content_goal)} · {dateLabel(post.scheduled_at)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone[post.status] || statusTone.DRAFT}`}>{post.status.replaceAll('_',' ')}</span></div>)}{!upcoming.length && <p className="py-8 text-center text-sm text-slate-500">Nothing scheduled yet. Create a post to plan your next campaign.</p>}</div>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="font-bold text-slate-900">Content mix</h3><p className="mt-1 text-xs text-slate-500">Suggested starting balance, not a platform rule.</p><div className="mt-4 space-y-3">{[{label:'Product showcase',v:40,c:'bg-indigo-500'},{label:'Reels & demos',v:25,c:'bg-cyan-500'},{label:'Trust building',v:15,c:'bg-emerald-500'},{label:'Tips & education',v:10,c:'bg-amber-500'},{label:'Offers & campaigns',v:10,c:'bg-fuchsia-500'}].map((item) => <div key={item.label}><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700">{item.label}</span><span className="font-bold text-slate-500">{item.v}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.c}`} style={{ width: `${item.v}%` }} /></div></div>)}</div></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-amber-900"><ShieldCheck className="h-5 w-5" /><h3 className="text-sm font-bold">Publish with confidence</h3></div><p className="mt-2 text-xs leading-5 text-amber-800">AI uses product facts from your catalog. Always verify claims, active discounts, stock and customer permissions before publishing.</p></div>
        </aside>
      </div>}

      {activeView === 'composer' && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-900">{draftId ? 'Edit your post' : 'Create a product post'}</h3><p className="mt-1 text-xs text-slate-500">Choose the goal first. AI will shape the message around it.</p></div>{draftId && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Editing draft</span>}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Choose product<select value={productId} onChange={(e) => { setProductId(e.target.value); setCaption(''); setDraftId(''); setMediaIndex(0); setSelectedMediaUrls([]); }} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"><option value="">Select from catalog</option>{publishedProducts.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatPrice(p.price)}</option>)}</select></label>
            <div className="text-sm font-semibold text-slate-700">Publish to Pages <div className="mt-1.5 max-h-36 space-y-2 overflow-y-auto rounded-xl border border-slate-300 bg-white p-3">{connectedAccounts.map((a) => <label key={a.id} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={accountIds.includes(a.id)} onChange={(e) => { const next = e.target.checked ? [...accountIds, a.id] : accountIds.filter((id) => id !== a.id); setAccountIds(next); setAccountId(next[0] || ''); }} className="h-4 w-4 rounded border-slate-300" /><span>{a.account_name}</span></label>)}{!connectedAccounts.length && <span className="text-xs text-slate-500">Connect a Facebook Page first.</span>}</div><p className="mt-1 text-[11px] font-normal text-slate-500">One matching post will be created for each selected Page.</p></div>
          </div>
          {product && <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><StoreImage src={product.images?.[0]} alt={product.name} className="h-20 w-20 rounded-xl bg-white object-cover" loading="lazy" decoding="async" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{product.name}</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatPrice(product.price)} <span className="font-normal text-slate-500">· Stock {product.stock}</span></p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.shortDescription || product.description || 'No short description supplied.'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{product.stock > 0 ? 'In stock' : 'Out of stock'}</span></div>}
          <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-bold text-slate-800">What should this post achieve?</label><span className="text-[11px] text-slate-400">Select one goal</span></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{GOALS.map(({id,label,description,icon:Icon}) => <button type="button" key={id} onClick={() => setContentGoal(id)} className={`rounded-xl border p-3 text-left transition ${contentGoal === id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${contentGoal === id ? 'text-indigo-600' : 'text-slate-400'}`} /><span className="text-xs font-bold text-slate-900">{label}</span></div><p className="mt-1.5 text-[11px] leading-4 text-slate-500">{description}</p></button>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">Caption language<select value={language} onChange={(e) => setLanguage(e.target.value as 'bn'|'en'|'mix')} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="bn">বাংলা</option><option value="en">English</option><option value="mix">বাংলা + English</option></select></label>
            <label className="text-xs font-semibold text-slate-600">Writing style<select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="friendly">Friendly</option><option value="premium">Premium</option><option value="minimal">Minimal</option><option value="energetic">Energetic</option><option value="informative">Informative</option></select></label>
            <div className="text-xs font-semibold text-slate-600">Choose media <div className="mt-1.5 max-h-36 space-y-2 overflow-y-auto rounded-lg border border-slate-300 bg-white p-3">{mediaOptions.map((url,index) => <label key={url} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={selectedMediaUrls.includes(url)} onChange={(e) => { if (url === product?.videoUrl) setSelectedMediaUrls(e.target.checked ? [url] : []); else setSelectedMediaUrls(e.target.checked ? [...selectedMediaUrls.filter((item) => item !== product?.videoUrl), url] : selectedMediaUrls.filter((item) => item !== url)); setMediaIndex(index); }} className="h-4 w-4 rounded border-slate-300" /><span>{url === product?.videoUrl ? 'Product video (single)' : ('Product image ' + (index+1))}</span></label>)}</div><p className="mt-1 font-normal text-slate-500">Select multiple images for one Facebook album, or one video.</p></div>
          </div>
          <button onClick={() => void generate()} disabled={busy || !product || !accountId || product.stock <= 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy ? 'Generating…' : 'Generate with AI'}</button>
          <label className="block text-sm font-bold text-slate-800">Your caption <span className="font-normal text-slate-400">· editable</span><textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={5000} rows={9} placeholder="Generate a caption or write your own. Keep it clear, useful and honest." className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
          <div className="flex items-center justify-between text-[11px] text-slate-400"><span>Check price, discount, availability and link before publishing.</span><span className="tabular-nums">{caption.length}/5000</span></div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button onClick={() => void saveDraft()} disabled={busy || !product || !accountId || !caption.trim()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button>
            <button onClick={() => void publishNow()} disabled={busy || !product || !accountId || !caption.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-4 w-4" /> Publish now</button>
          </div>
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <div><h4 className="text-sm font-bold text-slate-900">Schedule this post</h4><p className="mt-1 text-xs text-slate-500">Uses your device timezone. Vercel Hobby runs this scheduler once per day, so posts can be delayed. Frequent scheduling needs a higher-frequency cron plan.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row"><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date(Date.now() + 60000).toISOString().slice(0,16)} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /><button onClick={() => void schedulePost()} disabled={busy || !scheduledAt || !caption.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-800 disabled:opacity-50"><CalendarClock className="h-4 w-4" /> Schedule</button></div>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div><h4 className="text-sm font-bold text-slate-900">Recurring campaign</h4><p className="mt-1 text-xs text-slate-500">Create repeat posts for this product. Admin approval stays on by default.</p></div>
            <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Repeat every (days)<input type="number" min={1} max={90} value={repeatDays} onChange={(e) => setRepeatDays(Math.min(90,Math.max(1,Number(e.target.value)||1)))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Maximum posts<input type="number" min={1} max={1000} value={maxPosts} onChange={(e) => setMaxPosts(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Require approval</label></div>
            <button onClick={() => void createPromotion()} disabled={busy || !product || !accountId} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Create campaign</button>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Live preview</h3><p className="text-xs text-slate-500">Approximate Facebook Page view</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Facebook</span></div>
            <div className="overflow-hidden rounded-xl border border-slate-200"><div className="flex items-center gap-2 border-b border-slate-100 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Facebook className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{connectedAccounts.find((a) => a.id === accountId)?.account_name || 'Your Facebook Page'}</p><p className="text-[11px] text-slate-500">Sponsored-style preview · Now</p></div></div>
              {(selectedMediaUrls.length ? selectedMediaUrls : currentMedia ? [currentMedia] : []).length ? <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1">{(selectedMediaUrls.length ? selectedMediaUrls : [currentMedia]).map((url) => url === product?.videoUrl ? <video key={url} src={url} controls className="aspect-square h-full w-full object-contain" /> : <StoreImage key={url} src={url} alt={product?.name || 'Product media'} className="aspect-square h-full w-full object-contain" loading="lazy" decoding="async" />)}</div> : <div className="flex aspect-square flex-col items-center justify-center bg-slate-50 text-slate-400"><ImageIcon className="h-9 w-9" /><span className="mt-2 text-xs">Product media preview</span></div>}
              <div className="space-y-3 p-3"><div className="flex items-center gap-2"><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{goalLabel(contentGoal)}</span></div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{caption || 'Your generated caption will appear here.'}</p>{product && <div className="rounded-xl border border-slate-200 p-3"><p className="font-bold text-slate-900">{product.name}</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatPrice(product.price)}</p><p className="mt-1 break-all text-xs text-blue-700">https://www.pelomart.com/products/{encodeURIComponent(product.slug || product.id)}</p></div>}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><h4 className="text-sm font-bold text-slate-900">Pre-publish checklist</h4><div className="mt-3 space-y-2 text-xs text-slate-600">{['Product facts match the catalog','Price and active discount are correct','Selected media belongs to this product','Caption has a clear next step','Customer review is real and permissioned'].map((item) => <div key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}</div>)}</div></div>
        </aside>
      </div>}

      {activeView === 'calendar' && <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-900">Content calendar</h3><p className="mt-1 text-xs text-slate-500">{monthLabel} · Scheduled and approval-pending posts</p></div><button onClick={() => setActiveView('composer')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Plan a post</button></div><div className="mt-4 space-y-3">{upcoming.map((post) => <article key={post.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><CalendarDays className="h-4 w-4" /><span className="mt-0.5 text-[9px] font-bold">{post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-BD',{day:'2-digit',month:'short'}) : 'TBD'}</span></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{products.find((p) => p.id === post.product_id)?.name || 'Product post'}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.caption}</p><p className="mt-1 text-[11px] text-slate-400">{goalLabel(post.content_goal)} · {dateLabel(post.scheduled_at)}</p></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone[post.status] || statusTone.DRAFT}`}>{post.status.replaceAll('_',' ')}</span>{post.status === 'AWAITING_APPROVAL' && <button onClick={() => void postAction(post.id,'approve_post')} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Approve</button>}</div></article>)}{!upcoming.length && <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Your calendar is clear</p><p className="mt-1 text-xs text-slate-500">Schedule content to build a consistent publishing rhythm.</p></div>}</div></div>}

      {activeView === 'posts' && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h3 className="font-bold text-slate-900">Publishing history</h3><p className="mt-1 text-xs text-slate-500">{posts.length} saved post(s)</p></div><select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"><option value="ALL">All statuses</option>{['DRAFT','AWAITING_APPROVAL','SCHEDULED','PUBLISHED','FAILED','UNCERTAIN','CANCELLED'].map((v) => <option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></div><div className="divide-y divide-slate-100">{filteredPosts.map((post) => <article key={post.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{products.find((p) => p.id === post.product_id)?.name || 'Product post'}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone[post.status] || statusTone.DRAFT}`}>{post.status.replaceAll('_',' ')}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{goalLabel(post.content_goal)}</span></div><p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-slate-700">{post.caption}</p><a href={post.product_url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-xs text-blue-700 underline">{post.product_url}</a>{post.last_error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{post.last_error}</p>}<p className="mt-2 text-[11px] text-slate-400">{post.published_at ? `Published ${dateLabel(post.published_at)}` : post.scheduled_at ? `Scheduled ${dateLabel(post.scheduled_at)}` : `Created ${dateLabel(post.created_at)}`}</p></div><div className="flex flex-wrap gap-2">{['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED'].includes(post.status) && <button onClick={() => editPost(post)} disabled={busy} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800">Edit</button>}{post.status === 'DRAFT' && <button onClick={() => void deleteDraft(post.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800"><Trash2 className="h-3.5 w-3.5" />Delete</button>}{['DRAFT','AWAITING_APPROVAL'].includes(post.status) && <button onClick={() => void postAction(post.id,'approve_post')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>}{post.status === 'FAILED' && <button onClick={() => void postAction(post.id,'publish_now')} disabled={busy} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">Retry</button>}{post.status === 'UNCERTAIN' && <span className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">Check Facebook before retrying</span>}{['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED'].includes(post.status) && <button onClick={() => void postAction(post.id,'cancel_post')} disabled={busy} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">Cancel</button>}</div></article>)}{!filteredPosts.length && <p className="p-10 text-center text-sm text-slate-500">No posts match this filter.</p>}</div></div>}

      {activeView === 'promotions' && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-4 sm:p-5"><h3 className="font-bold text-slate-900">Recurring campaigns</h3><p className="mt-1 text-xs text-slate-500">Pause or resume repeat promotions. The server scheduler is required for automatic runs.</p></div><div className="divide-y divide-slate-100">{promotions.map((promo) => <article key={promo.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><RefreshCw className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{promo.product_name_snapshot}</p><p className="mt-1 text-xs text-slate-500">Every {promo.interval_days} days · {promo.posts_published} published · {promo.approval_required ? 'Approval required' : 'Auto-publish'}</p><p className="mt-1 text-[11px] text-slate-400">Status: {promo.status}{promo.next_run_at ? ` · Next: ${dateLabel(promo.next_run_at)}` : ''}</p></div>{promo.status === 'ACTIVE' ? <button onClick={() => void promotionAction(promo.id,'pause_promotion')} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><Pause className="h-4 w-4" />Pause</button> : promo.status === 'PAUSED' ? <button onClick={() => void promotionAction(promo.id,'resume_promotion')} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><Play className="h-4 w-4" />Resume</button> : null}</article>)}{!promotions.length && <p className="p-10 text-center text-sm text-slate-500">No recurring campaigns yet. Create one from the post composer.</p>}</div></div>}

      {activeView === 'analytics' && <div className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-amber-900"><TrendingUp className="h-5 w-5" /><h3 className="font-bold">Platform insights are not connected yet</h3></div><p className="mt-1 text-xs leading-5 text-amber-800">Reach, impressions, saves, shares, video watch time and link clicks must come from Meta Insights APIs with the required permissions. This screen does not invent metrics or treat missing values as zero.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{label:'Published posts',value:stats.published},{label:'Scheduled posts',value:stats.scheduled},{label:'Drafts',value:stats.drafts},{label:'Failed posts',value:stats.failed}].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{item.value}</p><p className="mt-1 text-[10px] text-slate-400">Internal publishing records</p></div>)}</div><div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><h4 className="font-bold text-slate-900">What will be measured when Meta Insights is enabled</h4><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{['Reach & impressions','Reactions, comments & shares','Saves','Video views & watch time','Link clicks','Attributed store orders'].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-600"><TrendingUp className="h-4 w-4 text-slate-400" />{item}</div>)}</div></div></div>}
      {busy && <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Saving your changes…</div>}
    </section>
  );
};

export default SocialPostStudio;
