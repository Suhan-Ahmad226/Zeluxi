import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const fallback = new URL('/favicon.svg', request.nextUrl.origin);
  try {
    const response = await fetch(new URL('/api/content', request.nextUrl.origin), { cache: 'no-store' });
    if (!response.ok) return NextResponse.redirect(fallback, { headers: { 'Cache-Control': 'no-store' } });
    const payload = await response.json();
    const candidate = payload?.content?.settings?.logoUrl;
    if (typeof candidate !== 'string' || candidate.length > 2048) {
      return NextResponse.redirect(fallback, { headers: { 'Cache-Control': 'no-store' } });
    }
    const logoUrl = new URL(candidate);
    if (logoUrl.protocol !== 'https:' || !logoUrl.hostname) {
      return NextResponse.redirect(fallback, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.redirect(logoUrl, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.redirect(fallback, { headers: { 'Cache-Control': 'no-store' } });
  }
}
