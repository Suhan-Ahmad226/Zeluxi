import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const noStoreHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' as const };

export function socialError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
}

export async function requireSocialAdmin(request: NextRequest): Promise<
  { admin: SupabaseClient; userId: string } | { response: NextResponse }
> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token || token === authorization) return { response: socialError('Sign in is required.', 401) };

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return { response: socialError('Social publishing is not configured on the server.', 503) };

  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return { response: socialError('Session is invalid or expired.', 401) };

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profileError) return { response: socialError('Administrator role could not be verified.', 503) };
  if (profile?.role !== 'ADMIN') return { response: socialError('Administrator access is required.', 403) };
  return { admin, userId: data.user.id };
}

function encryptionKey(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(raw)) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters.');
  return Buffer.from(raw, 'hex');
}

export function encryptSocialToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSocialToken(payload: string): string {
  const [ivPart, tagPart, encryptedPart] = payload.split('.');
  if (!ivPart || !tagPart || !encryptedPart) throw new Error('Stored social token is invalid.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, 'base64url')), decipher.final()]).toString('utf8');
}

export function productUrl(slug: unknown, id: string): string {
  const origin = 'https://www.pelomart.com';
  const safeSlug = typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : '';
  return `${origin}/products/${encodeURIComponent(safeSlug || id)}`;
}

export function cleanSocialText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u00AD\u034F\u061C\u115F-\u1160\u17B4-\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFE00-\uFE0F\uFEFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export type SocialContentGoal = 'PRODUCT_SHOWCASE' | 'PRODUCT_EDUCATION' | 'NEW_ARRIVAL' | 'OFFER_CAMPAIGN' | 'CUSTOMER_TRUST' | 'ENGAGEMENT';

export async function generateProductCaption(product: Record<string, unknown>, priorCaptions: string[] = [], language = 'bn', contentGoal: SocialContentGoal = 'PRODUCT_SHOWCASE', tone = 'friendly'): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured. Add it to server environment to generate AI captions.');
  const prompt = [
    'Write one high-quality social media caption for the following ecommerce product.',
    `Marketing objective: ${({ PRODUCT_SHOWCASE: 'Product showcase and direct sales', PRODUCT_EDUCATION: 'Helpful educational tips based only on known product facts', NEW_ARRIVAL: 'New arrival announcement without inventing launch dates or scarcity', OFFER_CAMPAIGN: 'Offer campaign using only a verified active discount in product data', CUSTOMER_TRUST: 'Customer trust content; use customer reviews only if verified review text is explicitly supplied, otherwise focus on transparent product facts and store confidence without fabricating testimonials', ENGAGEMENT: 'A useful question or conversation starter relevant to this product' } as Record<SocialContentGoal, string>)[contentGoal]}.`,
    'Use only facts present in the supplied JSON. Never invent discounts, scarcity, warranty, reviews, certifications, stock urgency, fabric, sizing, delivery promises, return promises, or payment promises.',
    'Keep it natural, specific, helpful and conversion-aware. Add a clear CTA and 3-5 relevant hashtags. Do not use generic hype or excessive emojis.',
    `Tone: ${tone}.`,
    'Use the provided product URL verbatim in the caption. Do not change or omit it.',
    `Language: ${language === 'en' ? 'English' : language === 'mix' ? 'Bangla with light English' : 'Bangla'}.`,
    'Avoid copying the previous captions or their opening line.',
    `Previous captions to avoid repeating: ${JSON.stringify(priorCaptions.slice(-8))}`,
    `Product data: ${JSON.stringify(product)}`,
  ].join('\n\n');
  const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').replace(/^models\//, '');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.85, maxOutputTokens: 700 } }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
    const detail = failure.error?.message || failure.error?.status || response.statusText || 'Unknown Gemini API error';
    throw new Error(`Gemini caption request failed (${response.status}): ${detail.slice(0, 420)}. Check GEMINI_API_KEY and GEMINI_MODEL in the server environment.`);
  }
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const caption = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!caption || caption.length > 5000) throw new Error('AI did not return a usable caption.');
  return cleanSocialText(caption);
}
