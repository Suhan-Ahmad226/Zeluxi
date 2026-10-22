import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let storeName = 'Zelux';
  let description = 'Shop online with our store in Bangladesh.';
  try {
    const response = await fetch(new URL('/api/content', request.nextUrl.origin), { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      const settings = payload?.content?.settings;
      if (typeof settings?.storeName === 'string' && settings.storeName.trim()) {
        storeName = settings.storeName.trim().slice(0, 120);
      }
      if (typeof settings?.seoDescription === 'string' && settings.seoDescription.trim()) {
        description = settings.seoDescription.trim().slice(0, 300);
      } else if (typeof settings?.tagline === 'string' && settings.tagline.trim()) {
        description = settings.tagline.trim().slice(0, 300);
      }
    }
  } catch {
    // Keep a safe manifest fallback if store content is temporarily unavailable.
  }

  const iconUrl = new URL('/api/brand/icon?kind=app', request.nextUrl.origin).toString();
  return NextResponse.json({
    id: '/',
    name: storeName,
    short_name: storeName.slice(0, 24),
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FAFAFA',
    theme_color: '#4F46E5',
    categories: ['shopping', 'lifestyle', 'business'],
    icons: [
      { src: iconUrl, purpose: 'any' },
    ],
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0', 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
