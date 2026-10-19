import type { Metadata } from 'next';
import NextStoreApp from '@/src/components/NextStoreApp';

type ProductRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const readableName = decodeURIComponent(slug).split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  return {
    title: `${readableName || 'Product'} | Zeluxi`,
    description: `View product details, price, availability, and ordering options for ${readableName || 'this product'} at Zeluxi.`,
    alternates: { canonical: `/products/${encodeURIComponent(slug)}` },
  };
}

export default async function ProductPage({ params }: ProductRouteProps) {
  const { slug } = await params;
  return <NextStoreApp initialView="product" productSlug={slug} />;
}
