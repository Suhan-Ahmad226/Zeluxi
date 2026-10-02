import { notFound, redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export default async function InventoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await getCurrentLocalUser();
  if (!u) redirect("/login");
  if (u.role !== "ADMIN") redirect("/account");
  const { id } = await params;
  const item = await db.inventory.findUnique({
    where: { id },
    include: {
      product: { select: { name: true, sku: true, slug: true, isPublished: true } },
      variant: { select: { name: true, sku: true, product: { select: { name: true, slug: true } } } },
      adjustments: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { name: true, email: true } } } },
    },
  });
  if (!item) notFound();
  const name = item.product?.name ?? item.variant?.name ?? "Inventory item";
  const sku = item.product?.sku ?? item.variant?.sku ?? "—";
  return <main className="mx-auto max-w-5xl px-4 py-8">
    <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-500">Inventory details</p><h1 className="mt-1 text-3xl font-bold">{name}</h1><p className="mt-1 text-sm text-slate-500">SKU {sku}</p></div><a href="/admin/inventory" className="text-sm font-semibold text-indigo-600">Back</a></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Available</p><p className="mt-1 text-3xl font-bold">{item.available}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Reserved</p><p className="mt-1 text-3xl font-bold">{item.reserved}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Low-stock threshold</p><p className="mt-1 text-3xl font-bold">{item.lowStockThreshold}</p></div></div>
    <section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Recent adjustments</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Date</th><th className="py-3">Change</th><th className="py-3">Before → After</th><th className="py-3">Reason</th><th className="py-3">Admin</th></tr></thead><tbody>{item.adjustments.map(a=><tr key={a.id} className="border-b last:border-0"><td className="py-3 whitespace-nowrap">{a.createdAt.toLocaleString("en-BD")}</td><td className="py-3 font-semibold">{a.quantityDelta>0?`+${a.quantityDelta}`:a.quantityDelta}</td><td className="py-3">{a.previousAvailable} → {a.newAvailable}</td><td className="py-3 text-slate-600">{a.reason}</td><td className="py-3">{a.actor.name??a.actor.email}</td></tr>)}</tbody></table>{item.adjustments.length===0&&<p className="py-8 text-center text-sm text-slate-500">No manual adjustments recorded.</p>}</div></section>
  </main>;
}
