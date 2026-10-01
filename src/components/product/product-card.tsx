import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { CompareButton } from "@/components/product/compare-button";

type Product = {
  id: string; name: string; slug: string; price: unknown; compareAtPrice?: unknown | null;
  images: { url: string; altText?: string | null }[]; inventory?: { available: number } | null;
};

const money = (value: unknown) => Number(value).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const stock = product.inventory?.available ?? 0;
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-100"><WishlistButton productId={product.id} />
          {image ? <Image src={image.url} alt={image.altText || product.name} fill sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-sm text-slate-400">No image</div>}
        </div>
        <div className="p-3 sm:p-4">
          <h2 className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900">{product.name}</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">৳{money(product.price)}</span>
            {product.compareAtPrice ? <span className="text-xs text-slate-400 line-through">৳{money(product.compareAtPrice)}</span> : null}
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 px-3 pb-3 sm:px-4 sm:pb-4"><CompareButton productId={product.id} />
        <AddToCartButton productId={product.id} disabled={stock < 1} />
      </div>
    </article>
  );
}
