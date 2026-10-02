import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export default async function InventoryHistoryPage() {
  const u = await getCurrentLocalUser();
  if (!u) redirect("/login?next=/admin/inventory/history");
  if (u.role !== "ADMIN") redirect("/account");
  const logs = await db.inventoryAdjustment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      inventory: { include: { product: { select: { name: true, sku: true } }, variant: { select: { name: true, sku: true } } } },
      actor: { select: { name: true, email: true } },
    },
  });
  return <main className="mx-auto max-w-7xl px-4 py-8">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">Inventory History</h1><p className="mt-2 text-sm text-slate-500">Every manual stock adjustment with before/after values, reason and actor.</p></div><a className="text-sm font-semibold text-indigo-600" href="/admin/inventory">Back to inventory</a></div>
    <div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Date","Product","Change","Before → After","Reason","Admin"].map(x=><th key={x} className="p-4">{x}</th>)}</tr></thead><tbody>{logs.map(l=>{const name=l.inventory.product?.name??l.inventory.variant?.name??"Unknown";const sku=l.inventory.product?.sku??l.inventory.variant?.sku??"—";return <tr key={l.id} className="border-t align-top"><td className="p-4 whitespace-nowrap">{l.createdAt.toLocaleString("en-BD")}</td><td className="p-4"><p className="font-medium">{name}</p><p className="text-xs text-slate-500">{sku}</p></td><td className="p-4 font-semibold">{l.quantityDelta>0?`+${l.quantityDelta}`:l.quantityDelta}</td><td className="p-4">{l.previousAvailable} → {l.newAvailable}</td><td className="max-w-xs p-4 text-slate-600">{l.reason}</td><td className="p-4">{l.actor.name||l.actor.email}</td></tr>})}</tbody></table>{!logs.length&&<div className="p-10 text-center text-sm text-slate-500">No inventory adjustments yet.</div>}</div>
  </main>;
}
