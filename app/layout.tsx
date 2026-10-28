import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import './site.css';
import { PwaRegister } from './PwaRegister';

const fallbackSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pelomart.com';
const fallbackDescription = 'Discover thoughtfully curated products from our store in Bangladesh.';

async function readPublicStoreSettings(origin: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(new URL('/api/content', origin), { next: { revalidate: 60 } });
    if (!response.ok) return {};
    const payload = await response.json();
    return payload?.content?.settings && typeof payload.content.settings === 'object'
      ? payload.content.settings as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '';
  const host = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(rawHost) ? rawHost : '';
  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol === 'http' ? 'http' : 'https';
  const origin = host ? `${protocol}://${host}` : fallbackSiteUrl;
  const settings = await readPublicStoreSettings(origin);
  const storeName = typeof settings.storeName === 'string' && settings.storeName.trim()
    ? settings.storeName.trim()
    : 'Store';
  const replaceBrand = (value: string) => value.replace(/\bzeluxi\b(?!\.)/gi, storeName);
  const description = replaceBrand(typeof settings.seoDescription === 'string' && settings.seoDescription.trim()
    ? settings.seoDescription.trim()
    : typeof settings.tagline === 'string' && settings.tagline.trim()
      ? settings.tagline.trim()
      : fallbackDescription);
  const title = replaceBrand(typeof settings.seoTitle === 'string' && settings.seoTitle.trim()
    ? settings.seoTitle.trim()
    : `${storeName} — Online Store in Bangladesh`);

  return {
    metadataBase: new URL(origin),
    applicationName: storeName,
    title: { default: title, template: `%s | ${storeName}` },
    description,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    alternates: { canonical: '/' },
    openGraph: { type: 'website', siteName: storeName, title, description, url: '/' },
    twitter: { card: 'summary_large_image', title, description },
    icons: {
      icon: [{ url: '/api/brand/icon?size=192' }],
      apple: [{ url: '/api/brand/icon?size=180' }],
      shortcut: [{ url: '/api/brand/icon?size=180' }],
    },
    manifest: '/api/brand/manifest',
  };
}

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="facebook-domain-verification" content="376456e4razte9wx5ydsxzav67sp6q" />
      </head>
      <body className="bg-[#FAFAFA] text-[#0F172A] antialiased selection:bg-indigo-500 selection:text-white">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
