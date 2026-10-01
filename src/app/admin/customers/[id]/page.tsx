import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export default async function CustomerDetailsPage({params}:{params:Promise<{id:string}>}) {
  const u=await getCurrentLocalUser();
  if(!u) redirect("/login?next=/admin/customers");
  if(u.role!=="ADMIN") redirect("/account");
  const {id}=await params;
  const customer=await db.user.findUnique({where:{id},include:{_count:{select:{orders:true,reviews:true}},orders:{select:{id:true,orderNumber:true,status:true,total:true,createdAt:true},orderBy:{createdAt:"desc"},take:25}}});
  if(!customer) notFound();
  return <main className="mx-auto max-w-6xl px-4 py-8">
    <Link href="/admin/customers" className="text-sm text-slate-500 hover:underline">← Customers</Link>
    <div className="mt-4 rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">{customer.name||"Unnamed customer"}</h1>
      <div className="mt-2 text-sm text-slate-500">{customer.email}{customer.phone ? " · "+customer.phone : ""}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Role</div><div className="font-semibold">{customer.role}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Orders</div><div className="font-semibold">{customer._count.orders}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Reviews</div><div className="font-semibold">{customer._count.reviews}</div></div></div>
    </div>
    <section className="mt-6 overflow-x-auto rounded-2xl border bg-white"><div className="border-b p-4 font-semibold">Recent orders</div><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Order","Status","Total","Date"].map(x=><th key={x} className="p-4">{x}</th>)}</tr></thead><tbody>{customer.orders.map(o=><tr key={o.id} className="border-t"><td className="p-4 font-medium">{o.orderNumber}</td><td className="p-4">{o.status}</td><td className="p-4">৳{Number(o.total).toLocaleString("en-BD")}</td><td className="p-4">{o.createdAt.toLocaleDateString("en-BD")}</td></tr>)}</tbody></table>{!customer.orders.length&&<div className="p-8 text-center text-sm text-slate-500">No orders yet.</div>}</section>
  </main>;
}