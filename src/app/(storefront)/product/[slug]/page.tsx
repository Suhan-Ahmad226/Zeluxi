import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedProduct } from "@/modules/products/service";
import { AddToCartButton } from "@/components/product/add-to-cart-button";

const money = (value: unknown) => Number(value).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return { title: "Product not found | Zelux" };
  return { title: product.seoTitle || product.name, description: product.seoDescription || product.shortDescription || product.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return notFound();
  const image = product.images[0];
  const variants = product.variants;
  const stock = product.inventory?.available ?? 0;
  const purchasable = variants.length === 0;
  return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:py-12">
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-100">
        {image ? <Image src={image.url} alt={image.altText || product.name} fill priority sizes="(max-width:768px) 100vw,50vw" className="object-cover" /> : <div className="grid h-full place-items-center text-slate-400">No image</div>}
      </div>
      <section className="flex flex-col">
        {product.brand ? <p className="text-sm font-semibold text-indigo-600">{product.brand}</p> : null}
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
        <p className="mt-3 text-2xl font-bold">৳{money(product.price)}</p>
        {product.compareAtPrice ? <p className="mt-1 text-sm text-slate-400 line-through">৳{money(product.compareAtPrice)}</p> : null}
        {product.shortDescription ? <p className="mt-5 text-slate-600">{product.shortDescription}</p> : null}
        {variants.length ? <div className="mt-6"><p className="mb-2 text-sm font-semibold">Options</p><div className="grid gap-2 sm:grid-cols-2">{variants.map(v => <div key={v.id} className="rounded-xl border p-3"><div className="font-medium">{v.name}</div><div className="mt-1 text-sm text-slate-500">৳{money(v.price ?? product.price)} · {(v.inventory?.available ?? 0) > 0 ? "In stock" : "Out of stock"}</div></div>)}</div><p className="mt-2 text-xs text-amber-700">Select an option before adding this product to cart.</p></div> : null}
        <div className="mt-7 flex items-center gap-3"><span className={stock > 0 ? "text-sm font-medium text-green-700" : "text-sm font-medium text-red-600"}>{stock > 0 ? `${stock} in stock` : "Out of stock"}</span></div>
        {!variants.length ? <div className="mt-5"><AddToCartButton productId={product.id} disabled={stock < 1} /></div> : null}
        <div className="prose prose-slate mt-8 max-w-none text-sm"><p>{product.description}</p></div>
      </section>
    </div>
  </main>;
}