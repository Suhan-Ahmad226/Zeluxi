import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { createHash } from "node:crypto";
import { OrderActions } from "@/components/account/order-actions";

const money=(v:unknown)=>Number(v).toLocaleString("en-BD",{minimumFractionDigits:0,maximumFractionDigits:2});

export default async function OrderConfirmation({params}:{params:Promise<{orderNumber:string}>}) {
  const user=await getCurrentLocalUser();
  const {orderNumber}=await params;
  const token=(await cookies()).get("zelux_guest_order_access")?.value;
  const tokenHash=token?createHash("sha256").update(token).digest("hex"):undefined;
  if(!user && !tokenHash) redirect("/login?next=/orders/"+encodeURIComponent(orderNumber));
  const order=await db.order.findFirst({where:{orderNumber,...(user?{userId:user.id}:{guestAccessTokenHash:tokenHash})},include:{items:true,payment:true,shipment:true,statusHistory:{orderBy:{createdAt:"asc"}}}});
  if(!order) return notFound();
  return <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:py-14">
    <div className="rounded-3xl border bg-white p-6 sm:p-8">
      <div className="text-sm font-semibold text-indigo-700">Order details</div>
      <h1 className="mt-2 text-3xl font-bold">{order.orderNumber}</h1>
      <p className="mt-2 text-slate-600">Current status: <span className="font-semibold">{order.status.replaceAll("_"," ")}</span></p>
      <div className="mt-7 divide-y rounded-2xl border">{order.items.map(i=><div key={i.id} className="flex justify-between gap-4 p-4 text-sm"><div><p className="font-medium">{i.productName}</p><p className="text-slate-500">{i.sku} · Qty {i.quantity}</p></div><span className="font-semibold">৳{money(i.totalPrice)}</span></div>)}<div className="space-y-2 p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>৳{money(order.subtotal)}</span></div><div className="flex justify-between"><span>Shipping</span><span>৳{money(order.shippingFee)}</span></div><div className="flex justify-between"><span>Discount</span><span>-৳{money(order.discount)}</span></div><div className="flex justify-between pt-2 text-base font-bold"><span>Total</span><span>৳{money(order.total)}</span></div></div></div>
      {order.shipment ? <div className="mt-5 rounded-2xl border bg-slate-50 p-4 text-sm"><p className="font-semibold">Delivery</p><p className="mt-1">{order.shipment.provider ?? "Courier"} · {order.shipment.status.replaceAll("_"," ")}</p>{order.shipment.trackingId?<p className="mt-1 font-mono text-xs">Tracking: {order.shipment.trackingId}</p>:null}</div>:null}
      {user ? <OrderActions orderNumber={order.orderNumber} status={order.status} /> : null}
      <div className="mt-6 flex flex-wrap gap-3"><Link href={"/track-order?order="+order.orderNumber} className="rounded-xl border px-4 py-2 text-sm font-semibold">Track order</Link><Link href="/account/orders" className="rounded-xl border px-4 py-2 text-sm font-semibold">My orders</Link><Link href="/shop" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Continue shopping</Link></div>
    </div>
    <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Status history</h2><div className="mt-4 space-y-3">{order.statusHistory.map((entry)=><div key={entry.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600"/><div><p className="font-medium">{entry.toStatus.replaceAll("_"," ")}</p><p className="text-xs text-slate-500">{entry.createdAt.toLocaleString("en-BD")}{entry.note?` · ${entry.note}`:""}</p></div></div>)}</div></section>
  </main>;
}
