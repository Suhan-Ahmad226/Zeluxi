import { headers } from 'next/headers';
import { sanitizeRichTextHtml } from '@/src/utils/richText';

export type PublicCmsPage = {
  slug: string;
  title: string;
  content: string;
  isPublished?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  lastUpdated?: string;
};

const SITE_FALLBACK = 'https://pelomart.com';

function escapeHtmlText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

export function replaceStoreName(value: string, storeName: string): string {
  return value
    .replace(/\{\{storeName\}\}/g, storeName)
    .replace(/\bzeluxi\b(?!\.)/gi, storeName);
}

function applyStoreNameToHtml(value: string, storeName: string): string {
  const safeName = escapeHtmlText(storeName);
  return value
    .replace(/\{\{storeName\}\}/g, safeName)
    .replace(/\bzeluxi\b(?!\.)/gi, safeName);
}

export async function getPublicSiteOrigin(): Promise<string> {
  try {
    const requestHeaders = await headers();
    const rawHost = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '';
    const host = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(rawHost) ? rawHost : '';
    const protocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'http' ? 'http' : 'https';
    return host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || SITE_FALLBACK);
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || SITE_FALLBACK;
  }
}

export async function getPublicStoreName(): Promise<string> {
  try {
    const origin = await getPublicSiteOrigin();
    const response = await fetch(new URL('/api/content', origin), { cache: 'no-store' });
    if (!response.ok) return 'Store';
    const payload = await response.json();
    const name = payload?.content?.settings?.storeName;
    return typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : 'Store';
  } catch {
    return 'Store';
  }
}

export async function getPublicCmsPages(): Promise<PublicCmsPage[]> {
  try {
    const origin = await getPublicSiteOrigin();
    const response = await fetch(new URL('/api/content', origin), { cache: 'no-store' });
    if (!response.ok) return [];
    const payload = await response.json();
    const pages = payload?.content?.pages;
    if (!Array.isArray(pages)) return [];
    return (pages as PublicCmsPage[]).filter((page) =>
      typeof page?.slug === 'string' &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) &&
      page.isPublished !== false &&
      typeof page.title === 'string' &&
      typeof page.content === 'string'
    );
  } catch {
    return [];
  }
}

export async function getPublicCmsPage(slugs: string[]): Promise<PublicCmsPage | null> {
  const pages = await getPublicCmsPages();
  return pages.find((page) => slugs.includes(page.slug.toLowerCase())) || null;
}

export async function CmsPageContent({ page, fallbackTitle, fallbackContent }: {
  page: PublicCmsPage | null;
  fallbackTitle: string;
  fallbackContent: string;
}) {
  const storeName = await getPublicStoreName();
  const title = replaceStoreName(page?.title || fallbackTitle, storeName);
  const content = applyStoreNameToHtml(page?.content?.trim() || fallbackContent, storeName);
  return (
    <main className="min-h-[60vh] min-w-0 bg-white px-4 py-10 text-slate-800 sm:px-6 sm:py-16">
      <article className="mx-auto w-full max-w-3xl min-w-0 break-words [overflow-wrap:anywhere]">
        <a href="/" className="text-sm font-semibold text-indigo-600 hover:underline">← Back to {storeName}</a>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        {page?.lastUpdated && <p className="mt-3 text-sm text-slate-500">Last updated: {page.lastUpdated}</p>}
        <div className="cms-rich-content mt-6 text-[15px] leading-7 text-slate-700 sm:text-base" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(content) }} />
      </article>
    </main>
  );
}

export async function pageMetadata(page: PublicCmsPage | null, title: string, description: string, canonical: string) {
  const storeName = await getPublicStoreName();
  const metadataTitle = replaceStoreName(page?.seoTitle || page?.title || title, storeName);
  const metadataDescription = replaceStoreName(page?.seoDescription || description, storeName);
  return {
    title: metadataTitle,
    description: metadataDescription,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website' as const,
      title: metadataTitle,
      description: metadataDescription,
      url: canonical,
      ...(page?.ogImageUrl ? { images: [page.ogImageUrl] } : {}),
    },
  };
}
