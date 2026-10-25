import { NextRequest, NextResponse } from 'next/server';
import { getPathaoAreas, getPathaoCities, getPathaoZones, PathaoApiError } from '@/src/lib/shipping/pathao-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;
const locationCache = new Map<string, { expiresAt: number; value: unknown }>();

async function cachedLocation<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = locationCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;
  const value = await load();
  locationCache.set(key, { expiresAt: Date.now() + LOCATION_CACHE_TTL_MS, value });
  return value;
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const id = Number(request.nextUrl.searchParams.get('id') || 0);
  try {
    if (action === 'cities') return NextResponse.json({ data: await cachedLocation('cities', getPathaoCities) }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    if (action === 'zones' && Number.isSafeInteger(id) && id > 0) return NextResponse.json({ data: await cachedLocation('zones:' + id, () => getPathaoZones(id)) }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    if (action === 'areas' && Number.isSafeInteger(id) && id > 0) return NextResponse.json({ data: await cachedLocation('areas:' + id, () => getPathaoAreas(id)) }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    return NextResponse.json({ error: 'A valid Pathao location action and ID are required.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof PathaoApiError ? error.message : 'Pathao locations are temporarily unavailable.';
    return NextResponse.json({ error: message, code: error instanceof PathaoApiError ? error.safeCode : 'PATHAO_LOCATIONS_UNAVAILABLE' }, { status: error instanceof PathaoApiError && error.status === 400 ? 400 : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
