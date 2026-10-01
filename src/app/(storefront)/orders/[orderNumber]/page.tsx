import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

const money=(v:unknown)=>Number(v).toLocaleString("en-BD",{minimumFractionDigits:0,maximumFractionDigits:2});

export default async function OrderConfirmation({params}:{params:Promise<{orderNumber:string}>}) {
  const user=await getCurrentLocalUser(); if(!user) redirect("/login");
  const {orderNumber}=await params;
  const order=await db.order.findFirst({where:{orderNumber,userId:user.id},include:{items:true,payment:true,shipment:true}});
  if(!order) return notFound();
  return <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:py-14">
    <div className="rounded-3xl border bg-white p-6 sm:p-8"><div className="text-sm font-semibold text-green-700">Order placed successfully</div>
      <h1 className="mt-2 text-3xl font-bold">Thank you for your order!</h1><p className="mt-2 text-slate-600">Order <strong>{order.orderNumber}</strong> is currently <span className="font-medium">{order.status.replaceAll("_"," ")}</span>.</p>
      <div className="mt-7 divide-y rounded-2xl border">{order.items.map(i=><div key={i.id} className="flex justify-between gap-4 p-4 text-sm"><div><p className="font-medium">{i.productName}</p><p className="text-slate-500">Qty {i.quantity}</p></div><span className="font-semibold">৳{money(i.totalPrice)}</span></div>)}<div className="flex justify-between p-4 font-bold"><span>Total</span><span>৳{money(order.total)}</span></div></div>
      <div className="mt-6 flex flex-wrap gap-3"><Link href={"/track-order?order="+order.orderNumber} className="rounded-xl border px-4 py-2 text-sm font-semibold">Track order</Link><Link href="/shop" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Continue shopping</Link></div>
    </div>
  </main>;
}
