import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { getOrCreateCart } from "@/modules/cart/service";
import { db } from "@/lib/db/client";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { GuestCheckoutForm } from "@/components/checkout/guest-checkout-form";

export default async function CheckoutPage() {
  const user = await getCurrentLocalUser();
  if (!user) return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-8 sm:py-12"><h1 className="text-3xl font-bold">Guest checkout</h1><p className="mt-2 text-sm text-slate-600">No account required. Your price, stock and delivery fee are verified securely on the server.</p><div className="mt-7 max-w-3xl"><GuestCheckoutForm /></div></main>;
  const cart = await getOrCreateCart(user.id);
  if (!cart.items.length) redirect("/cart");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  const items = cart.items.map(item => ({ productId: item.productId, ...(item.variantId ? { variantId: item.variantId } : {}), quantity: item.quantity }));
  return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-8 sm:py-12">
    <h1 className="text-3xl font-bold">Checkout</h1><p className="mt-2 text-sm text-slate-600">Your final price and stock are verified on the server when the order is placed.</p>
    <div className="mt-7"><CheckoutForm addresses={addresses} items={items}/></div>
  </main>;
}
