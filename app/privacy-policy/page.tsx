import type { Metadata } from 'next';
import { CmsPageContent, getPublicCmsPage, pageMetadata } from '../_components/PublicCmsPage';

const title = "Privacy Policy";
const description = "Learn how Zeluxi collects, uses, and protects personal information.";
const canonical = "/privacy";
const slugs = ["privacy","privacy-policy"];
const fallbackContent = "";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicCmsPage(slugs);
  return pageMetadata(page, title, description, canonical) as Metadata;
}

export default async function PublicPage() {
  const page = await getPublicCmsPage(slugs);
  return <CmsPageContent page={page} fallbackTitle={title} fallbackContent={page?.content || fallbackContent} />;
}
