import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageContent, getPublicCmsPages } from '../_components/PublicCmsPage';
import { CmsPageShell } from '../_components/CmsPageShell';

type Props = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = (await getPublicCmsPages()).find((item) => item.slug === slug);
  if (!page) return { title: 'Page not found', robots: { index: false, follow: false } };
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zeluxi.vercel.app').replace(/\/$/, '');
  const canonical = `${base}/${encodeURIComponent(page.slug)}`;
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.title,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title: page.seoTitle || page.title,
      description: page.seoDescription || page.title,
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
