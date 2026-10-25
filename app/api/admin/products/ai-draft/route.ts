import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().max(100).default(''),
  facts: z.string().trim().min(5).max(5000),
  language: z.enum(['English', 'Bangla', 'Bangla + English']).default('English'),
  categories: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
}).strict();

const draftSchema = z.object({
  name: z.string().trim().min(2).max(200),
  shortDescription: z.string().trim().max(500),
  description: z.string().trim().max(5000),
  tags: z.array(z.string().trim().min(1).max(80)).max(15),
  seoTitle: z.string().trim().max(200),
  seoDescription: z.string().trim().max(500),
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

  if (!apiKey) return errorResponse('AI product assistant is not configured. Add GEMINI_API_KEY to the server environment.', 503);
  if (!supabaseUrl || !anonKey) return errorResponse('Authentication is not configured.', 503);

  const token = request.headers.get('authorization')?.replace(/^Bearer\\s+/i, '');
  if (!token) return errorResponse('Administrator authentication is required.', 401);

  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return errorResponse('Your session is invalid or expired.', 401);
  if (String(data.user.app_metadata?.role || '').toUpperCase() !== 'ADMIN') {
    return errorResponse('Administrator access is required.', 403);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('A valid JSON request body is required.', 400);
  }

  const parsedRequest = requestSchema.safeParse(rawBody);
  if (!parsedRequest.success) return errorResponse('Enter a product name and a few accurate product details first.', 400);
  const input = parsedRequest.data;

  const prompt = [
    'You are Zeluxi single-store ecommerce product copy assistant.',
    'Return only a JSON object matching these keys: name, shortDescription, description, tags, seoTitle, seoDescription, seoKeywords, specifications.',
    'Write polished, specific, easy-to-scan ecommerce copy. Use the requested language: ' + input.language + '.',
    'Use only the facts supplied by the user. Never invent materials, certifications, country of origin, warranty, dimensions, compatibility, health benefits, stock, price, discounts, or performance claims.',
    'If a specification is not explicitly supported by the supplied facts, omit it. Do not invent pricing or inventory.',
    'The shortDescription must be a concise product-card summary. The description should use clear paragraphs and practical benefits without unsupported claims.',
    'SEO fields should be natural, non-spammy, and relevant. Tags should be short search terms.',
    'Keep the product name close to the user-provided name; improve grammar only when useful.',
    'Available store categories: ' + (input.categories.length ? input.categories.join(', ') : 'not supplied'),
    'Selected category: ' + (input.category || 'not selected'),
    'Product name: ' + input.name,
    'Product facts supplied by the store owner: ' + input.facts,
  ].join('\\n');

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 1800 },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const providerMessage = typeof payload?.error?.message === 'string' ? payload.error.message : '';
      console.error('AI product draft provider error:', response.status, providerMessage.slice(0, 300));
      return errorResponse('AI could not generate product copy right now. Check the Gemini API key and quota, then retry.', 502);
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('');
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
      return errorResponse('AI returned incomplete product copy. Please try again.', 502);
    }

    return NextResponse.json({ draft: parsedDraft.data }, {
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('AI product draft request failed:', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('AI request timed out or could not connect. Please retry.', 502);
  }
}
