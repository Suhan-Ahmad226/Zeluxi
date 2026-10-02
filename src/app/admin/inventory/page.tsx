import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { InventoryEditor } from "@/components/admin/inventory-editor";

export default async function InventoryPage(){
  const u=await getCurrentLocalUser();
  if(!u)redirect("/login?next=/admin/inventory");
  if(u.role!=="ADMIN")redirect("/account");
  const items=await db.inventory.findMany({orderBy:{updatedAt:"desc"},include:{product:{select:{name:true,sku:true}},variant:{select:{name:true,sku:true}}}});
  return <main className="mx-auto max-w-7xl px-4 py-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">Inventory</h1><p className="mt-2 text-sm text-slate-500">Manage available stock and low-stock thresholds.</p></div><div className="flex flex-wrap gap-3 text-sm font-semibold"><a className="text-indigo-600" href="/admin/inventory/history">History</a><a className="text-indigo-600" href="/admin/inventory/low-stock">Low stock</a><a className="text-indigo-600" href="/admin/inventory/out-of-stock">Out of stock</a></div></div><div className="mt-6 grid gap-3">{items.map(i=><div key={i.id}><InventoryEditor id={i.id} name={i.product?.name??i.variant?.name??"Unknown"} sku={i.product?.sku??i.variant?.sku??"—"} available={i.available} reserved={i.reserved} threshold={i.lowStockThreshold}/><div className="px-2 pt-1"><a className="text-xs font-semibold text-indigo-600" href={`/admin/inventory/${i.id}`}>View stock details →</a></div></div>)}</div></main>
}
