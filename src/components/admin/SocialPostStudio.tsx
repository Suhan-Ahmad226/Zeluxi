import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Facebook, Loader2, Megaphone, Pause, Play, RefreshCw, Save, Send, Sparkles, Trash2 } from 'lucide-react';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../utils/formatters';
import { StoreImage } from '../common/StoreImage';
import { useStore } from '../../context/StoreContext';

type Account = { id: string; provider_account_id: string; account_name: string; status: string };
type Post = { id: string; product_id: string | null; account_id: string; caption: string; media_urls: string[]; product_url: string; status: string; scheduled_at: string | null; published_at: string | null; last_error: string | null; created_at: string };
type Promotion = { id: string; product_id: string; product_name_snapshot: string; status: string; interval_days: number; next_run_at: string | null; posts_published: number; approval_required: boolean };
type Props = { products: Product[]; initialProduct?: Product | null; onInitialProductHandled?: () => void };

export const SocialPostStudio: React.FC<Props> = ({ products, initialProduct, onInitialProductHandled }) => {
  const { settings } = useStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [productId, setProductId] = useState(initialProduct?.id || '');
  const [accountId, setAccountId] = useState('');
  const [caption, setCaption] = useState('');
  const [language, setLanguage] = useState<'bn' | 'en' | 'mix'>('bn');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [repeatDays, setRepeatDays] = useState(3);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [maxPosts, setMaxPosts] = useState('10');
  const [scheduledAt, setScheduledAt] = useState('');
  const [activeView, setActiveView] = useState<'composer' | 'posts' | 'promotions'>('composer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draftId, setDraftId] = useState('');
  const [refreshProductSnapshot, setRefreshProductSnapshot] = useState(false);

  const product = useMemo(() => products.find((item) => item.id === productId) || initialProduct || null, [products, productId, initialProduct]);
  const mediaOptions = useMemo(() => product ? [...(product.images || []), ...(product.videoUrl ? [product.videoUrl] : [])].filter((url) => /^https:\/\//.test(url)) : [], [product]);

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
      if (!accountId && a.accounts?.length) setAccountId(a.accounts.find((item: Account) => item.status === 'CONNECTED')?.id || a.accounts[0].id);
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
    const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'generate_caption', productId: product.id, accountId, language }) });
    setCaption(result.caption || '');
    if (draftId) setRefreshProductSnapshot(true);
    setNotice('AI caption ready. Review the facts and wording before publishing.');
  });

  const saveDraft = () => run(async () => {
    if (!product || !accountId || !caption.trim()) throw new Error('Select a product, Page and non-empty caption.');
    if (draftId) {
      await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'update_post', postId: draftId, caption: caption.trim(), mediaUrls: mediaOptions[mediaIndex] ? [mediaOptions[mediaIndex]] : [], refreshProductSnapshot }) });
      setRefreshProductSnapshot(false);
      setNotice('Draft updated.');
    } else {
      const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'create_draft', productId: product.id, accountId, caption: caption.trim(), mediaUrls: mediaOptions[mediaIndex] ? [mediaOptions[mediaIndex]] : [], language }) });
      setDraftId(result.post.id);
      setNotice('Draft saved.');
    }
    await refresh();
  });

  const publishNow = () => run(async () => {
    if (!draftId) {
      if (!product || !accountId || !caption.trim()) throw new Error('Generate or write a caption and save it first.');
      const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'create_draft', productId: product.id, accountId, caption: caption.trim(), mediaUrls: mediaOptions[mediaIndex] ? [mediaOptions[mediaIndex]] : [], language }) });
      setDraftId(result.post.id);
      await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'publish_now', postId: result.post.id }) });
    } else {
      await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'update_post', postId: draftId, caption: caption.trim(), mediaUrls: mediaOptions[mediaIndex] ? [mediaOptions[mediaIndex]] : [], refreshProductSnapshot }) });
      await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'publish_now', postId: draftId }) });
    }
    setNotice('Facebook API accepted the post. Refreshing publishing history.');
    await refresh();
    setDraftId('');
  });

  const schedulePost = () => run(async () => {
    if (!scheduledAt) throw new Error('Choose a future date and time.');
    let id = draftId;
    if (!id) {
      if (!product || !accountId || !caption.trim()) throw new Error('Select a product and prepare a caption first.');
      const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'create_draft', productId: product.id, accountId, caption: caption.trim(), mediaUrls: mediaOptions[mediaIndex] ? [mediaOptions[mediaIndex]] : [], language }) });
      id = result.post.id; setDraftId(id);
    }
    await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'update_post', postId: id, caption: caption.trim(), mediaUrls: mediaOptions[mediaIndex] ? [mediaOptions[mediaIndex]] : [], refreshProductSnapshot }) });
    await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ action: 'schedule_post', postId: id, scheduledAt: new Date(scheduledAt).toISOString() }) });
    setNotice('Post scheduled. Publishing depends on the protected scheduler being configured.');
    await refresh();
  });

  const createPromotion = () => run(async () => {
    if (!product || !accountId) throw new Error('Select a product and connected Facebook Page.');
    if (!approvalRequired && !window.confirm('Auto-publish will publish future posts without manual approval. Continue?')) return;
    const result = await api('/api/admin/social', { method: 'POST', body: JSON.stringify({
      action: 'create_promotion', productId: product.id, accountId, intervalDays: repeatDays,
      approvalRequired, autoPublish: !approvalRequired, maxPosts: maxPosts ? Number(maxPosts) : null,
    }) });
    setNotice(`Recurring promotion created for ${product.name}. First repeat is due after ${repeatDays} days.`);
    await refresh();
    setActiveView('promotions');
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
    setNotice('Draft deleted.');
    await refresh();
  });

  const editPost = (post: Post) => {
    setDraftId(post.id);
    setProductId(post.product_id || '');
    setAccountId(post.account_id);
    setCaption(post.caption);
    setRefreshProductSnapshot(false);
    setMediaIndex(0);
    setActiveView('composer');
    setNotice('Draft loaded into the composer. Save your edits when ready.');
  };

  const currentMedia = mediaOptions[mediaIndex] || '';

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-5 sm:p-7 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider"><Megaphone className="w-4 h-4" /> {settings.storeName?.trim() || 'Store'} Social Studio</div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold">Create once. Publish smarter.</h2>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">AI-assisted product posts, scheduled publishing and recurring promotions from your catalog.</p>
          </div>
          <button onClick={() => void refresh()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[['Connected Pages', accounts.filter((a) => a.status === 'CONNECTED').length], ['Drafts', posts.filter((p) => p.status === 'DRAFT').length], ['Scheduled', posts.filter((p) => ['SCHEDULED','AWAITING_APPROVAL'].includes(p.status)).length], ['Published', posts.filter((p) => p.status === 'PUBLISHED').length]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white/10 p-3"><div className="text-xs text-slate-300">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>)}
        </div>
      </div>

      {(error || notice) && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {([['composer','AI Composer'],['posts','Publishing History'],['promotions','Auto Repeat']] as const).map(([id,label]) => <button key={id} onClick={() => setActiveView(id)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeView === id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
        <button onClick={() => void connectFacebook()} disabled={busy} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Facebook className="w-4 h-4" /> Connect Facebook Page</button>
      </div>

      {accounts.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{accounts.map((account) => <div key={account.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Facebook className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-900">{account.account_name}</div><div className="text-xs text-slate-500">{account.status.replaceAll('_',' ')}</div></div>{account.status !== 'DISCONNECTED' && <button onClick={()=>void disconnectAccount(account.id)} disabled={busy} className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50">Disconnect</button>}</div>)}</div>}

      {activeView === 'composer' && <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <h3 className="font-bold text-slate-900">Product post composer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">Product<select value={productId} onChange={(e) => { setProductId(e.target.value); setCaption(''); setDraftId(''); setMediaIndex(0); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Select a product</option>{products.filter((p) => p.published && !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</option>)}</select></label>
            <label className="block text-sm font-medium text-slate-700">Facebook Page<select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Select a connected Page</option>{accounts.filter((a) => a.status === 'CONNECTED').map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}</select></label>
          </div>
          {!accounts.some((a) => a.status === 'CONNECTED') && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Connect a Facebook Page before generating or publishing a post.</p>}
          {product && <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <StoreImage src={product.images?.[0]} alt={product.name} className="h-20 w-20 rounded-lg border border-slate-100 bg-slate-50 object-cover" loading="lazy" decoding="async" />
            <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{product.name}</div><div className="text-sm text-slate-600">{formatPrice(product.price)} · Stock {product.stock}</div><div className="truncate text-xs text-slate-500">{product.shortDescription || product.description}</div></div>
          </div>}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-slate-700">Caption language<select value={language} onChange={(e) => setLanguage(e.target.value as 'bn'|'en'|'mix')} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="bn">Bengali</option><option value="en">English</option><option value="mix">Bengali + English</option></select></label>
            <button onClick={() => void generate()} disabled={busy || !product || !accountId} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Sparkles className="h-4 w-4" /> Generate AI caption</button>
          </div>
          <label className="block text-sm font-medium text-slate-700">Caption (editable)<textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={5000} rows={8} placeholder="Generate a caption or write your own..." className="mt-1 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm leading-6 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void saveDraft()} disabled={busy || !product || !accountId || !caption.trim()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button>
            <button onClick={() => void publishNow()} disabled={busy || !product || !accountId || !caption.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" /> Post now</button>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="font-semibold text-slate-800">Schedule one post</h4>
            <label className="block text-sm text-slate-700">Date & time (your device timezone)<input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date(Date.now() + 60000).toISOString().slice(0,16)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <button onClick={() => void schedulePost()} disabled={busy || !scheduledAt || !caption.trim()} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 disabled:opacity-50"><CalendarClock className="h-4 w-4" /> Schedule post</button>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="font-semibold text-slate-800">Recurring product promotion</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-sm text-slate-700">Repeat every (days)<input type="number" min={1} max={90} value={repeatDays} onChange={(e) => setRepeatDays(Math.min(90,Math.max(1,Number(e.target.value)||1)))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm text-slate-700">Maximum posts<input type="number" min={1} max={1000} value={maxPosts} onChange={(e) => setMaxPosts(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700"><input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} /> Admin approval each time</label>
            </div>
            <button onClick={() => void createPromotion()} disabled={busy || !product || !accountId} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Start recurring promotion</button>
            <p className="text-xs text-slate-500">Recurring promotions start with the next due cycle. Keep approval enabled until publishing and scheduling have been verified on your Page.</p>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 h-fit">
          <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Facebook preview</h3><span className="text-xs text-slate-500">Approximate</span></div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Facebook className="h-5 w-5" /></div><div><div className="text-sm font-semibold">Your Facebook Page</div><div className="text-xs text-slate-500">Preview · Just now</div></div></div>
            {currentMedia && <div className="aspect-square bg-slate-50">{currentMedia === product?.videoUrl ? <video src={currentMedia} controls className="h-full w-full object-contain" /> : <StoreImage src={currentMedia} alt={product?.name || 'Product media'} className="h-full w-full object-contain" loading="lazy" decoding="async" />}</div>}
            <div className="space-y-2 p-3"><p className="whitespace-pre-wrap break-words text-sm text-slate-800">{caption || 'Your AI-generated product caption will appear here.'}</p>{product && <div className="rounded-lg border border-slate-200 p-3"><div className="font-semibold text-slate-900">{product.name}</div><div className="text-sm text-slate-600">{formatPrice(product.price)}</div><div className="break-all text-xs text-blue-700">{typeof window !== 'undefined' ? window.location.origin : ''}/products/{product.slug || product.id}</div></div>}</div>
          </div>
          {mediaOptions.length > 1 && <label className="block text-sm text-slate-700">Media<select value={mediaIndex} onChange={(e) => setMediaIndex(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{mediaOptions.map((url,index)=><option key={url} value={index}>{url === product?.videoUrl ? 'Product video' : `Product image ${index+1}`}</option>)}</select></label>}
          {busy && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Working…</p>}
        </aside>
      </div>}

      {activeView === 'posts' && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-4"><h3 className="font-bold text-slate-900">Publishing history</h3><span className="text-xs text-slate-500">{posts.length} posts</span></div>
        <div className="divide-y divide-slate-100">{posts.map((post)=><article key={post.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{products.find((p)=>p.id===post.product_id)?.name || 'Product post'}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{post.status}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700 line-clamp-4">{post.caption}</p><a href={post.product_url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-xs text-blue-700 underline">{post.product_url}</a>{post.last_error && <p className="mt-2 text-sm text-rose-700">{post.last_error}</p>}<p className="mt-2 text-xs text-slate-500">{post.published_at ? `Published ${new Date(post.published_at).toLocaleString()}` : post.scheduled_at ? `Scheduled ${new Date(post.scheduled_at).toLocaleString()}` : `Created ${new Date(post.created_at).toLocaleString()}`}</p></div>
          <div className="flex flex-wrap gap-2">{['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED'].includes(post.status) && <button onClick={()=>editPost(post)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800">Edit</button>}{post.status === 'DRAFT' && <button onClick={()=>void deleteDraft(post.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><Trash2 className="h-4 w-4"/>Delete</button>}{['DRAFT','AWAITING_APPROVAL'].includes(post.status) && <button onClick={()=>void postAction(post.id,'approve_post')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Approve</button>}{post.status === 'FAILED' && <button onClick={()=>{ if (post.last_error?.toLowerCase().includes('uncertain') && !window.confirm('The previous request may already have published. Check the Facebook Page before retrying to avoid a duplicate. Retry anyway?')) return; void postAction(post.id,'publish_now'); }} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"><RefreshCw className="h-4 w-4"/>Retry</button>}{['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED'].includes(post.status) && <button onClick={()=>void postAction(post.id,'cancel_post')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><Trash2 className="h-4 w-4"/>Cancel</button>}</div>
        </article>)}{!posts.length && <p className="p-8 text-center text-sm text-slate-500">No posts yet. Choose a product and create your first draft.</p>}</div>
      </div>}

      {activeView === 'promotions' && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4"><h3 className="font-bold text-slate-900">Recurring promotions</h3><p className="mt-1 text-xs text-slate-500">Pause or resume repeating product posts. Scheduler configuration is required for automatic runs.</p></div>
        <div className="divide-y divide-slate-100">{promotions.map((promo)=><article key={promo.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{promo.product_name_snapshot}</div><div className="mt-1 text-sm text-slate-600">Every {promo.interval_days} days · {promo.posts_published} published · {promo.approval_required ? 'Approval required' : 'Auto-publish'}</div><div className="mt-1 text-xs text-slate-500">Status: {promo.status}{promo.next_run_at ? ` · Next: ${new Date(promo.next_run_at).toLocaleString()}` : ''}</div></div>{promo.status === 'ACTIVE' ? <button onClick={()=>void promotionAction(promo.id,'pause_promotion')} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"><Pause className="h-4 w-4"/>Pause</button> : promo.status === 'PAUSED' ? <button onClick={()=>void promotionAction(promo.id,'resume_promotion')} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><Play className="h-4 w-4"/>Resume</button> : null}</article>)}{!promotions.length && <p className="p-8 text-center text-sm text-slate-500">No recurring promotions configured yet.</p>}</div>
      </div>}
    </section>
  );
};

export default SocialPostStudio;
