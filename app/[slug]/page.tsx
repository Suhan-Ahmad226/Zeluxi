import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageContent, getPublicCmsPages, getPublicSiteOrigin, getPublicStoreName, replaceStoreName } from '../_components/PublicCmsPage';
import { CmsPageShell } from '../_components/CmsPageShell';

type Props = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  const page = (await getPublicCmsPages()).find((item) => item.slug.toLowerCase() === normalizedSlug);
  if (!page) return { title: 'Page not found', robots: { index: false, follow: false } };
  const storeName = await getPublicStoreName();
  const base = (await getPublicSiteOrigin()).replace(/\/$/, '');
  const canonical = `${base}/${encodeURIComponent(page.slug)}`;
  const title = replaceStoreName(page.seoTitle || page.title, storeName);
  const description = replaceStoreName(page.seoDescription || page.title, storeName);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      ...(page.ogImageUrl ? { images: [page.ogImageUrl] } : {}),
    },
  };
}

export default async function CmsSlugPage({ params }: Props) {
  const { slug } = await params;
  const page = (await getPublicCmsPages()).find((item) => item.slug === slug);
  if (!page) notFound();
  return (
    <CmsPageShell>
      <CmsPageContent page={page} fallbackTitle={page.title} fallbackContent={page.content} />
    </CmsPageShell>
  );
}
