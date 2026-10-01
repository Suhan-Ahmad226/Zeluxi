import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { ProductCard } from "@/components/product/product-card";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await db.product.findMany({
    where: {
      isPublished: true,
      OR: [
        { brand: { equals: slug, mode: "insensitive" } },
        { slug: { contains: slug, mode: "insensitive" } },
      ],
    },
    take: 48,
    orderBy: { createdAt: "desc" },
    include: { images: true, inventory: true },
  });
  if (!products.length) return notFound();
  return <main className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-bold">Collection: {slug}</h1><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div></main>;
}