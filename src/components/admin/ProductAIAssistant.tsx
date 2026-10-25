'use client';

import React, { useState } from 'react';
import { Sparkles, WandSparkles, LoaderCircle, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface AIProductDraft {
  name: string;
  shortDescription: string;
  description: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  specifications: Array<{ key: string; value: string }>;
}

interface ProductAIAssistantProps {
  categories: string[];
  selectedCategory: string;
  initialName: string;
  onApply: (draft: AIProductDraft) => void;
}

export const ProductAIAssistant: React.FC<ProductAIAssistantProps> = ({
  categories,
  selectedCategory,
  initialName,
  onApply,
}) => {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(selectedCategory);
  const [facts, setFacts] = useState('');
  const [language, setLanguage] = useState<'English' | 'Bangla' | 'Bangla + English'>('English');
  const [draft, setDraft] = useState<AIProductDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);

  const generate = async () => {
    if (name.trim().length < 2 || facts.trim().length < 5) {
      setError('Enter a product name and a few real product details to get a useful draft.');
      return;
    }
    setBusy(true);
    setError('');
    setDraft(null);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('Sign in with an administrator account first.');

      const response = await fetch('/api/admin/products/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), category, facts: facts.trim(), language, categories }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Could not generate product copy.');
      setDraft(payload.draft as AIProductDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate product copy. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900">AI Product Assistant</h3>
            <p className="text-xs text-slate-600">Turn a few real details into ready-to-edit product copy</p>
          </div>
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            Product name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="e.g. Everyday Canvas Backpack" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Product category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
              <option value="">Choose a category</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-700">
          Product facts <span className="font-normal text-slate-500"> (required, use only verified details)</span>
          <textarea value={facts} onChange={(event) => setFacts(event.target.value)} maxLength={5000} rows={3} placeholder="What is it made of? Size, colour, use, included items, care instructions, target customer... Leave unknown facts out." className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal leading-6 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            Output language
            <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
              <option>English</option><option>Bangla</option><option>Bangla + English</option>
            </select>
          </label>
          <button type="button" onClick={generate} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {busy ? 'Generating draft…' : 'Generate with AI'}
          </button>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {draft && <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-900"><Check className="h-4 w-4" /> Draft ready to review</div>
          <div>
            <p className="text-xs font-semibold text-slate-700">{draft.name}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{draft.shortDescription}</p>
          </div>
          <p className="text-xs leading-5 text-slate-600">{draft.description}</p>
          <p className="text-xs text-slate-500">Includes {draft.tags.length} tags, SEO copy, and {draft.specifications.length} supported specifications. No price, stock, or product has been saved.</p>
          <button type="button" onClick={() => onApply(draft)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
            <Check className="h-4 w-4" /> Apply draft to product form
          </button>
        </div>}
        <p className="text-[11px] leading-5 text-slate-500">AI suggestions can be wrong. Review every claim before publishing. This tool does not set prices, stock, or publish automatically.</p>
      </div>}
    </section>
  );
};
