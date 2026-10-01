import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/modules/categories/service";
import { listPublishedProducts } from "@/modules/products/service";
import { ProductCard } from "@/components/product/product-card";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return notFound();
  const products = await listPublishedProducts({ categorySlug: slug, take: 48 });
  return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:py-10">
    <p className="text-sm font-semibold text-indigo-600">Category</p><h1 className="mt-1 text-3xl font-bold">{category.name}</h1>
    {category.description ? <p className="mt-2 max-w-2xl text-sm text-slate-600">{category.description}</p> : null}
    {products.length ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.map(p => <ProductCard key={p.id} product={p} />)}</div> : <div className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500">No products in this category.</div>}
  </main>;
}
