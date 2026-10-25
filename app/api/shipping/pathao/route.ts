import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculatePathaoPrice,
  getPathaoAreas,
  getPathaoCities,
  getPathaoZones,
  PathaoApiError,
} from '@/src/lib/shipping/pathao-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anon: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

async function verifiedUser(request: NextRequest) {
  const { url, anon } = dbConfig();
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!url || !anon || !token) return false;
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  return !error && Boolean(data.user?.email_confirmed_at);
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const id = Number(request.nextUrl.searchParams.get('id') || 0);
  try {
    if (action === 'cities') return NextResponse.json({ data: await getPathaoCities() }, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
    if (action === 'zones' && Number.isSafeInteger(id) && id > 0) return NextResponse.json({ data: await getPathaoZones(id) }, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
    if (action === 'areas' && Number.isSafeInteger(id) && id > 0) return NextResponse.json({ data: await getPathaoAreas(id) }, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
    return NextResponse.json({ error: 'A valid Pathao location action and ID are required.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof PathaoApiError ? error.message : 'Pathao locations are temporarily unavailable.';
    const status = error instanceof PathaoApiError && error.status === 400 ? 400 : 503;
    return NextResponse.json({ error: message, code: error instanceof PathaoApiError ? error.safeCode : 'PATHAO_LOCATIONS_UNAVAILABLE' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifiedUser(request))) return NextResponse.json({ error: 'Sign in with a verified account to calculate delivery.' }, { status: 401 });
  const { url, service } = dbConfig();
  if (!url || !service) return NextResponse.json({ error: 'Shipping service is not configured.' }, { status: 503 });
  try {
    const body = await request.json();
    const cityId = Number(body?.cityId);
    const zoneId = Number(body?.zoneId);
    const areaId = Number(body?.areaId);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!Number.isSafeInteger(cityId) || cityId <= 0 || !Number.isSafeInteger(zoneId) || zoneId <= 0 || !Number.isSafeInteger(areaId) || areaId <= 0 || items.length < 1 || items.length > 50) {
      return NextResponse.json({ error: 'Select a valid Pathao city, zone and area.' }, { status: 400 });
    }
    const storeId = Number(process.env.PATHAO_STORE_ID || 0);
    if (!Number.isSafeInteger(storeId) || storeId <= 0) return NextResponse.json({ error: 'Configure PATHAO_STORE_ID before using live delivery pricing.', code: 'PATHAO_STORE_NOT_CONFIGURED' }, { status: 503 });
    const ids = [...new Set(items.map((item: any) => String(item?.productId || '')).filter(Boolean))];
    if (ids.length !== items.length || items.some((item: any) => !Number.isSafeInteger(item?.quantity) || item.quantity < 1 || item.quantity > 20)) {
      return NextResponse.json({ error: 'Cart items are invalid.' }, { status: 400 });
    }
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: products, error } = await db.from('store_products').select('id,product_data,published,archived').in('id', ids);
    if (error || !products || products.length !== ids.length || products.some((product: any) => !product.published || product.archived)) {
      return NextResponse.json({ error: 'A cart product is unavailable for shipping calculation.' }, { status: 409 });
    }
    const productById = new Map(products.map((product: any) => [String(product.id), product]));
    let weightKg = 0;
    for (const item of items) {
      const product: any = productById.get(String(item.productId));
      const data = product?.product_data && typeof product.product_data === 'object' ? product.product_data : {};
      const storedWeight = Number(data.weightKg || 0);
      const fallbackWeight = Number(process.env.PATHAO_DEFAULT_ITEM_WEIGHT_KG || 0.5);
      const eachWeight = Number.isFinite(storedWeight) && storedWeight > 0 ? storedWeight : fallbackWeight;
      if (!Number.isFinite(eachWeight) || eachWeight <= 0 || eachWeight > 10) return NextResponse.json({ error: 'A product has an invalid parcel weight. Correct its weight in product management.' }, { status: 422 });
      weightKg += eachWeight * item.quantity;
    }
    weightKg = Math.max(0.5, Math.round(weightKg * 100) / 100);
    if (weightKg > 10) return NextResponse.json({ error: 'This cart exceeds Pathao’s 10 kg per-parcel limit. Split the order or correct product weights.' }, { status: 422 });
    const quote = await calculatePathaoPrice({ storeId, itemType: 2, deliveryType: 48, weightKg, cityId, zoneId });
    const fee = Number(quote.final_price);
    if (!Number.isFinite(fee) || fee < 0 || fee > 5000) return NextResponse.json({ error: 'Pathao returned an invalid delivery quote.' }, { status: 502 });
    return NextResponse.json({ quote: { cityId, zoneId, areaId, weightKg, deliveryType: 48, itemType: 2, fee: Math.round(fee * 100) / 100, currency: 'BDT', quotedAt: new Date().toISOString() } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof PathaoApiError ? error.message : 'Could not calculate a Pathao delivery quote.';
    return NextResponse.json({ error: message, code: error instanceof PathaoApiError ? error.safeCode : 'PATHAO_QUOTE_FAILED' }, { status: error instanceof PathaoApiError && error.status === 400 ? 400 : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
