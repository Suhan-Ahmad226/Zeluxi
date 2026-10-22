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
    const requestedSize = Number(request.nextUrl.searchParams.get('size') || '512');
    const size = [180, 192, 512].includes(requestedSize) ? requestedSize : 512;
    // Generate correctly-sized variants for Cloudinary-hosted logos without changing stored settings.
    if (logoUrl.hostname === 'res.cloudinary.com' && /\/image\/upload\//.test(logoUrl.pathname)) {
      logoUrl.pathname = logoUrl.pathname.replace(
        '/image/upload/',
        `/image/upload/c_pad,w_${size},h_${size},b_transparent,f_png,q_auto/`,
      );
    }
    return NextResponse.redirect(logoUrl, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.redirect(fallback, { headers: { 'Cache-Control': 'no-store' } });
  }
}
