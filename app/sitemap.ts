import type { MetadataRoute } from 'next';
import { getPublicCmsPages } from './_components/PublicCmsPage';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zeluxi.vercel.app').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${siteUrl}/data-deletion`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
  const fixedSlugs = new Set(['privacy', 'privacy-policy', 'terms', 'terms-of-service', 'data-deletion', 'data-deletion-instructions']);
  const dynamicPages = (await getPublicCmsPages())
    .filter((page) => !fixedSlugs.has(page.slug.toLowerCase()))
    .map((page) => ({
      url: `${siteUrl}/${encodeURIComponent(page.slug)}`,
      lastModified: page.lastUpdated ? new Date(page.lastUpdated) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  return [...fixed, ...dynamicPages];
}
