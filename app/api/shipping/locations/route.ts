import { NextRequest, NextResponse } from 'next/server';
import { getPathaoAreas, getPathaoCities, getPathaoZones, PathaoApiError } from '@/src/lib/shipping/pathao-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const id = Number(request.nextUrl.searchParams.get('id') || 0);
  try {
    if (action === 'cities') return NextResponse.json({ data: await getPathaoCities() }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    if (action === 'zones' && Number.isSafeInteger(id) && id > 0) return NextResponse.json({ data: await getPathaoZones(id) }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    if (action === 'areas' && Number.isSafeInteger(id) && id > 0) return NextResponse.json({ data: await getPathaoAreas(id) }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    return NextResponse.json({ error: 'A valid Pathao location action and ID are required.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof PathaoApiError ? error.message : 'Pathao locations are temporarily unavailable.';
    return NextResponse.json({ error: message, code: error instanceof PathaoApiError ? error.safeCode : 'PATHAO_LOCATIONS_UNAVAILABLE' }, { status: error instanceof PathaoApiError && error.status === 400 ? 400 : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
