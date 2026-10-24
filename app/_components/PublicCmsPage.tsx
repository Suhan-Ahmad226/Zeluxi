import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
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

const SITE_FALLBACK = 'https://zeluxi.vercel.app';

export async function getPublicCmsPage(slugs: string[]): Promise<PublicCmsPage | null> {
  try {
    const requestHeaders = await headers();
    const rawHost = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '';
    const host = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(rawHost) ? rawHost : '';
    const protocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'http' ? 'http' : 'https';
    const origin = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || SITE_FALLBACK);
    const response = await fetch(new URL('/api/content', origin), { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = await response.json();
    const pages = payload?.content?.pages;
    if (!Array.isArray(pages)) return null;
    return (pages as PublicCmsPage[]).find((page) =>
      typeof page?.slug === 'string' && slugs.includes(page.slug.toLowerCase()) && page.isPublished === true &&
      typeof page.title === 'string' && typeof page.content === 'string'
    ) || null;
  } catch {
    return null;
  }
}

export function CmsPageContent({ page, fallbackTitle, fallbackContent }: {
  page: PublicCmsPage | null;
  fallbackTitle: string;
  fallbackContent: string;
}) {
  const title = page?.title || fallbackTitle;
  const content = page?.content?.trim() || fallbackContent;
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-800 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <a href="/" className="text-sm font-semibold text-indigo-600 hover:underline">← Back to Zeluxi</a>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        {page?.lastUpdated && <p className="mt-3 text-sm text-slate-500">Last updated: {page.lastUpdated}</p>}
        <div className="cms-rich-text mt-6 leading-7" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(content) }} />
        <nav aria-label="Legal pages" className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm">
          <a className="text-indigo-600 underline" href="/privacy">Privacy Policy</a>
          <a className="text-indigo-600 underline" href="/terms">Terms of Service</a>
          <a className="text-indigo-600 underline" href="/data-deletion">Data Deletion</a>
        </nav>
      </article>
    </main>
  );
}

export function pageMetadata(page: PublicCmsPage | null, title: string, description: string, canonical: string) {
  return {
    title: page?.seoTitle || page?.title || title,
    description: page?.seoDescription || description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website' as const,
      title: page?.seoTitle || page?.title || title,
      description: page?.seoDescription || description,
      url: canonical,
      ...(page?.ogImageUrl ? { images: [page.ogImageUrl] } : {}),
    },
  };
}
