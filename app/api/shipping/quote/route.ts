import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { quotePathaoCheckout } from '@/src/lib/shipping/pathao-checkout';
import { PathaoApiError } from '@/src/lib/shipping/pathao-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  district: z.string().trim().min(1).max(100),
  upazila: z.string().trim().min(1).max(100),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(100),
    variantId: z.string().trim().min(1).max(100).optional(),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(50),
}).strict();

function adminDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database configuration is incomplete.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: NextRequest) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: 'Checkout authentication is not configured.' }, { status: 503 });

  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser(match[1]);
  if (authError || !authData.user) return NextResponse.json({ error: 'Your session is invalid. Sign in again.' }, { status: 401 });
  if (!authData.user.email_confirmed_at) return NextResponse.json({ error: 'A verified account is required.' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid shipping quote request.' }, { status: 400 });

  try {
    const db = adminDb();
    const quote = await quotePathaoCheckout(db, parsed.data);
    const { data: settingsRow, error: settingsError } = await db.from('store_content')
      .select('content_value').eq('content_key', 'settings').maybeSingle();
    if (settingsError) return NextResponse.json({ error: 'Shipping settings could not be loaded.' }, { status: 503 });
    const settings = settingsRow?.content_value && typeof settingsRow.content_value === 'object' ? settingsRow.content_value as Record<string, unknown> : {};
    const freeThreshold = Number(settings.freeShippingThreshold || process.env.FREE_SHIPPING_THRESHOLD || 0);
    const freeShipping = Number.isFinite(freeThreshold) && freeThreshold > 0 && quote.subtotal >= freeThreshold;
    const configuredCodFee = Number(settings.codFee ?? process.env.COD_FEE ?? 0);
    if (!Number.isFinite(configuredCodFee) || configuredCodFee < 0 || configuredCodFee > 2000) {
      return NextResponse.json({ error: 'COD fee configuration is invalid.' }, { status: 503 });
    }
    return NextResponse.json({
      quote: {
        ...quote,
        shippingFee: freeShipping ? 0 : quote.pathaoFee,
        freeShipping,
        codFee: configuredCodFee,
        currency: 'BDT',
        expiresInSeconds: 60,
      },
    }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    const status = error instanceof PathaoApiError ? error.status || 502 : 503;
    const message = error instanceof Error ? error.message : 'Pathao shipping quote is unavailable.';
    return NextResponse.json({ error: message, code: error instanceof PathaoApiError ? error.safeCode : 'SHIPPING_QUOTE_FAILED' }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
}
