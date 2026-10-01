import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/product/product-card";
import { listPublishedProducts } from "@/modules/products/service";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const products = q.trim() ? await listPublishedProducts({ q, take: 48 }) : [];
  return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:py-10">
    <h1 className="text-3xl font-bold">Search products</h1>
    <form action="/search" className="mt-6 max-w-2xl"><Input name="q" defaultValue={q} placeholder="Search by product, SKU or brand…" aria-label="Search products" /></form>
    {q.trim() ? <><p className="mt-7 text-sm text-slate-600">{products.length} result{products.length === 1 ? "" : "s"} for <strong className="text-slate-900">{q}</strong></p>
      {products.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.map(p => <ProductCard key={p.id} product={p} />)}</div> : <div className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500">No products matched your search.</div>}</>
      : <p className="mt-8 text-slate-600">Enter a product name, SKU, or brand.</p>}
  </main>;
}
