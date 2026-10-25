'use client';

import React, { useState } from 'react';
import { AlertCircle, Check, ExternalLink, LoaderCircle, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface AIProductSource {
  title: string;
  url: string;
}

export interface AIProductDraft {
  name: string;
  shortDescription: string;
  description: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  specifications: Array<{ key: string; value: string }>;
  sources?: AIProductSource[];
}

interface ProductAIAssistantProps {
  productName: string;
  selectedCategory: string;
  price: number;
  regularPrice: number;
  variantDetails: Array<{ name: string; attributes?: Record<string, string>; price?: number }>;
  categories: string[];
  onApply: (draft: AIProductDraft) => void;
}

export const ProductAIAssistant: React.FC<ProductAIAssistantProps> = ({
  productName,
  selectedCategory,
  price,
  regularPrice,
  variantDetails,
  categories,
  onApply,
}) => {
  const [draft, setDraft] = useState<AIProductDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generationCount, setGenerationCount] = useState(0);

  const generate = async () => {
    if (productName.trim().length < 2) {
      setError('আগে পণ্যের নাম লিখুন।');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('অ্যাডমিন অ্যাকাউন্ট দিয়ে সাইন ইন করুন।');

      const response = await fetch('/api/admin/products/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: productName.trim(),
          category: selectedCategory,
          price,
          regularPrice: regularPrice > price ? regularPrice : undefined,
          variants: variantDetails,
          language: 'Bangla + English',
          categories,
        }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'AI draft তৈরি করা যায়নি। আবার চেষ্টা করুন।');
      setDraft(payload.draft as AIProductDraft);
      setGenerationCount((count) => count + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI draft তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-slate-900">Zeluxi AI Product Agent</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">Google Search দিয়ে তথ্য যাচাই করে description, details ও SEO তৈরি করবে।</p>
          </div>
        </div>
        <button type="button" onClick={generate} disabled={busy || productName.trim().length < 2} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : draft ? <RefreshCw className="h-4 w-4" /> : <WandSparkles className="h-4 w-4" />}
          {busy ? 'তথ্য খোঁজা ও লেখা হচ্ছে…' : draft ? 'Regenerate with AI' : 'Generate with AI'}
        </button>
      </div>

      {busy && (
        <div className="space-y-2 border-t border-indigo-100 px-4 py-4 sm:px-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-600" /></div>
          <p className="text-xs text-slate-500">পণ্যের তথ্য সার্চ, সোর্স যাচাই এবং product copy/SEO প্রস্তুত করা হচ্ছে। একটু সময় লাগতে পারে।</p>
        </div>
      )}

      {error && <div role="alert" className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-800 sm:mx-5"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {draft && !busy && (
        <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><Check className="h-4 w-4" /> AI draft ready to review</div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">Draft {generationCount}</span>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900">{draft.name}</h4>
            <p className="text-sm leading-6 text-slate-600">{draft.shortDescription}</p>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{draft.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">SEO title</p>
              <p className="text-xs leading-5 text-slate-800">{draft.seoTitle}</p>
              <p className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">SEO description</p>
              <p className="text-xs leading-5 text-slate-600">{draft.seoDescription}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Tags & specifications</p>
              <div className="flex flex-wrap gap-1.5">
                {draft.tags.slice(0, 8).map((tag) => <span key={tag} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">{tag}</span>)}
              </div>
              {draft.specifications.length > 0 && <ul className="mt-3 space-y-1.5">{draft.specifications.slice(0, 5).map((spec) => <li key={spec.key} className="flex gap-2 text-xs"><span className="w-24 shrink-0 text-slate-500">{spec.key}</span><span className="font-medium text-slate-800">{spec.value}</span></li>)}</ul>}
            </div>
          </div>
          {draft.sources && draft.sources.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">Research sources</p>
              <div className="flex flex-wrap gap-2">
                {draft.sources.slice(0, 5).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"><ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{source.title}</span></a>)}
              </div>
            </div>
          )}
          <button type="button" onClick={() => onApply(draft)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
            <Check className="h-4 w-4" /> Apply all AI details
          </button>
          <p className="text-[11px] leading-5 text-slate-500">Price, discount, photos, videos and variants remain under your control. AI does not save or publish automatically. Check source facts before publishing.</p>
        </div>
      )}

      {!draft && !busy && <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">একবার Generate করুন। ফল পছন্দ না হলে Regenerate চাপুন। AI তৈরি করা সব লেখা Apply করার পরই ফর্মে বসবে।</p>}
    </section>
  );
};
