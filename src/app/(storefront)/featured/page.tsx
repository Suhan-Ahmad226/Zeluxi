import type { Metadata } from "next";
import { db } from "@/lib/db/client";
import { CatalogGrid } from "@/components/product/catalog-grid";

export const metadata: Metadata = {
  title: "Featured Products | Zelux",
  description: "Shop the products currently featured by Zelux.",
};

export const revalidate = 60;

export default async function FeaturedPage() {
  const products = await db.product.findMany({
    where: { isPublished: true, isFeatured: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      inventory: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
  });

  return (
    <main className="min-h-[70vh] bg-slate-50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <p className="text-sm font-semibold text-indigo-600">Curated selection</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Featured products
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            A hand-picked selection from the Zelux catalog, updated by the store team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10" aria-label="Featured products">
        <CatalogGrid products={products} empty="No featured products are available right now." />
      </section>
    </main>
  );
}
