import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().max(100).default(''),
  price: z.number().finite().positive().max(100000000),
  regularPrice: z.number().finite().positive().max(100000000).optional(),
  variants: z.array(z.object({
    name: z.string().trim().max(120),
    attributes: z.record(z.string(), z.string().max(120)).optional(),
    price: z.number().finite().nonnegative().optional(),
  }).strict()).max(100).default([]),
  language: z.enum(['English', 'Bangla', 'Bangla + English']).default('Bangla + English'),
  categories: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
}).strict();

const draftSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().max(100),
  brand: z.string().trim().max(120),
  shortDescription: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(5000),
  tags: z.array(z.string().trim().min(1).max(80)).max(15),
  seoTitle: z.string().trim().min(1).max(200),
  seoDescription: z.string().trim().min(1).max(500),
  seoKeywords: z.string().trim().max(500),
  specifications: z.array(z.object({
    key: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(300),
  }).strict()).max(12),
}).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) return errorResponse('AI product agent is not configured. Add GEMINI_API_KEY to the server environment.', 503);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return errorResponse('Authentication is not configured.', 503);

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return errorResponse('Administrator authentication is required.', 401);

  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return errorResponse('Your session is invalid or expired.', 401);

  // Zeluxi's authoritative role is stored in profiles.role, not necessarily JWT app_metadata.
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) return errorResponse('Administrator role could not be verified.', 503);
  if (profile?.role !== 'ADMIN') return errorResponse('Administrator access is required.', 403);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('A valid JSON request body is required.', 400);
  }

  const parsedRequest = requestSchema.safeParse(rawBody);
  if (!parsedRequest.success) return errorResponse('Enter a product name and valid price first.', 400);
  const input = parsedRequest.data;

  const variantSummary = input.variants.length
    ? input.variants.map((variant) => {
        const attrs = variant.attributes ? Object.entries(variant.attributes).map(([key, value]) => key + ': ' + value).join(', ') : '';
        return variant.name + (attrs ? ' (' + attrs + ')' : '');
      }).join('; ')
    : 'No variants supplied';

  const prompt = [
    'You are the product research and ecommerce copy agent for Zeluxi, a Bangladesh single-store ecommerce website.',
    'First use Google Search to research the exact product name and model. Prefer the manufacturer brand website and trustworthy retailers or technical publications. Search in English and Bangla when useful.',
    'Return only a JSON object matching exactly these keys: name, category, brand, shortDescription, description, tags, seoTitle, seoDescription, seoKeywords, specifications.',
    'Write polished, specific ecommerce content in ' + input.language + '. Keep the user-provided product name intact unless a clear spelling correction is needed.',
    'Use current web search results for factual product details. Do not copy source wording. Summarize in original wording.',
    'Never guess a model-specific feature, material, dimensions, battery, compatibility, warranty, certification, country of origin, included accessory, or performance claim. Only include facts supported by reliable search results. If the exact product/model cannot be verified, write a cautious generic description based on the name and return no unsupported specifications.',
    'Do not invent reviews, ratings, availability, shipping promises, warranty, stock, price, discount, or claims of official authenticity.',
    'The description should be easy to scan, with short paragraphs and bullet-like lines if appropriate. Keep claims grounded and avoid keyword stuffing.',
    'Choose category only from the supplied store categories; if none fits, use the selected store category. Return brand only when the exact brand is supported by search results, otherwise an empty string. SEO title should be concise, SEO description natural and useful, tags 5-12 short relevant terms, specifications should contain only verified factual attributes.',
    'The store price and discount are provided only as context. Do not include price/discount in the generated description or SEO because the store controls those fields.',
    'Store categories: ' + (input.categories.length ? input.categories.join(', ') : 'not supplied'),
    'Selected store category: ' + (input.category || 'not selected'),
    'Product name/model to research: ' + input.name,
    'Store selling price in BDT (do not repeat in copy): ' + input.price,
    'Store regular price in BDT (do not repeat in copy): ' + (input.regularPrice ?? 'not set'),
    'Variants provided by the store owner: ' + variantSummary,
  ].join(String.fromCharCode(10));

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 2600 },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(45000),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const providerMessage = typeof payload?.error?.message === 'string' ? payload.error.message : '';
      console.error('AI product research provider error:', response.status, providerMessage.slice(0, 300));
      return errorResponse('AI product research failed. Check the Gemini API key, search grounding access and quota, then retry.', 502);
    }

    const candidate = payload?.candidates?.[0];
    const text = candidate?.content?.parts?.map((part: { text?: string }) => part.text || '').join('');
    if (typeof text !== 'string' || !text.trim()) return errorResponse('AI returned an empty product draft. Please try again.', 502);

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return errorResponse('AI returned an invalid draft format. Please try again.', 502);
    }

    const parsedDraft = draftSchema.safeParse(json);
    if (!parsedDraft.success) {
      console.error('AI product draft failed schema validation:', parsedDraft.error.issues.map((issue) => issue.path.join('.')).join(', '));
      return errorResponse('AI returned incomplete product copy. Please regenerate.', 502);
    }

    const chunks = Array.isArray(candidate?.groundingMetadata?.groundingChunks)
      ? candidate.groundingMetadata.groundingChunks
      : [];
    const seen = new Set<string>();
    const sources = chunks.flatMap((chunk: { web?: { uri?: string; title?: string } }) => {
      const url = typeof chunk.web?.uri === 'string' ? chunk.web.uri : '';
      if (!/^https?:\/\//i.test(url) || seen.has(url)) return [];
      seen.add(url);
      return [{
        url,
        title: (typeof chunk.web?.title === 'string' && chunk.web.title.trim())
          ? chunk.web.title.trim().slice(0, 160)
          : new URL(url).hostname,
      }];
    }).slice(0, 8);

    const safeDraft = {
      ...parsedDraft.data,
      category: input.categories.includes(parsedDraft.data.category) ? parsedDraft.data.category : input.category,
      sources,
    };
    return NextResponse.json({ draft: safeDraft }, {
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('AI product research request failed:', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('AI research timed out or could not connect. Please retry.', 502);
  }
}
