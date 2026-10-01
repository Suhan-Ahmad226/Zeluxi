import Image from "next/image";
import Link from "next/link";

import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { getOrCreateCart } from "@/modules/cart/service";
import { CartItemControls } from "@/components/cart/cart-item-controls";
import { GuestCart } from "@/components/cart/guest-cart";

const money = (value: unknown) => Number(value).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default async function CartPage() {
  const user = await getCurrentLocalUser();
  if (!user) return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-8 sm:py-12"><h1 className="text-3xl font-bold">Your cart</h1><GuestCart /></main>;
  const cart = await getOrCreateCart(user.id);
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.variant?.price ?? item.product.price) * item.quantity, 0);
  return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-8 sm:py-12">
    <h1 className="text-3xl font-bold">Your cart</h1>
    {!cart.items.length ? <div className="mt-8 rounded-2xl border border-dashed p-12 text-center"><p className="text-slate-600">Your cart is empty.</p><Link href="/shop" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Continue shopping</Link></div> :
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">{cart.items.map(item => { const image=item.product.images[0]; const price=Number(item.variant?.price ?? item.product.price); return <article key={item.id} className="flex gap-4 rounded-2xl border bg-white p-3 sm:p-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">{image ? <Image src={image.url} alt={image.altText || item.product.name} fill sizes="96px" className="object-cover"/> : null}</div>
          <div className="min-w-0 flex-1"><Link href={"/product/"+item.product.slug} className="font-semibold hover:text-indigo-600">{item.product.name}</Link>{item.variant ? <p className="mt-1 text-xs text-slate-500">{item.variant.name}</p> : null}<p className="mt-2 font-semibold">৳{money(price)}</p><div className="mt-3"><CartItemControls itemId={item.id} quantity={item.quantity}/></div></div>
          <div className="hidden text-right text-sm font-bold sm:block">৳{money(price*item.quantity)}</div>
        </article> })}</div>
        <aside className="h-fit rounded-2xl border bg-white p-5 lg:sticky lg:top-24"><h2 className="font-semibold">Order summary</h2><div className="mt-5 flex justify-between text-sm"><span>Subtotal</span><span>৳{money(subtotal)}</span></div><div className="mt-2 flex justify-between text-sm"><span>Shipping</span><span>Calculated at checkout</span></div><div className="mt-4 border-t pt-4 flex justify-between text-lg font-bold"><span>Total</span><span>৳{money(subtotal)}</span></div><Link href="/checkout" className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">Proceed to checkout</Link></aside>
      </div>}
  </main>;
}
