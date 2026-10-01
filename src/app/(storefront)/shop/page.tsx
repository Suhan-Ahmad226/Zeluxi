import { listPublishedProducts } from "@/modules/products/service";
import { ProductCard } from "@/components/product/product-card";

export const metadata = { title: "Shop | Zelux" };

export default async function ShopPage() {
  const products = await listPublishedProducts({ take: 48 });
  return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:py-10">
    <div><p className="text-sm font-semibold text-indigo-600">Zelux Store</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Shop</h1><p className="mt-2 text-sm text-slate-600">{products.length} products available</p></div>
    {products.length ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.map(p => <ProductCard key={p.id} product={p} />)}</div> :
      <div className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500">No published products yet.</div>}
  </main>;
}
