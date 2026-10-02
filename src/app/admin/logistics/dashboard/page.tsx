import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

const statuses = ["PENDING", "PROCESSING", "PICKUP_REQUESTED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"] as const;

export default async function LogisticsDashboardPage() {
  const user = await getCurrentLocalUser();
  if (!user) redirect("/login?next=/admin/logistics/dashboard");
  if (user.role !== "ADMIN") redirect("/account");

  const [counts, recent] = await Promise.all([
    Promise.all(statuses.map(async (status) => [status, await db.shipment.count({ where: { status } })] as const)),
    db.shipment.findMany({
      orderBy: { updatedAt: "desc" }, take: 30,
      include: { order: { select: { orderNumber: true, recipientName: true, district: true } } },
    }),
  ]);
  const countMap = Object.fromEntries(counts);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-indigo-600">Admin · Logistics</p><h1 className="mt-1 text-3xl font-bold">Shipment operations</h1><p className="mt-2 text-sm text-slate-600">Monitor fulfillment, tracking and delivery exceptions.</p></div>
        <Link href="/admin/orders" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50">Open orders</Link>
      </div>
      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statuses.map((status) => <div key={status} className="rounded-xl border bg-white p-4"><p className="text-xs font-medium text-slate-500">{status.replaceAll("_", " ")}</p><p className="mt-2 text-2xl font-bold">{countMap[status] ?? 0}</p></div>)}
      </section>
      <section className="mt-7 overflow-x-auto rounded-2xl border bg-white">
        <div className="border-b p-4 font-semibold">Recent shipment activity</div>
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Order","Customer","District","Provider","Tracking","Status","Updated"].map((h)=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>
          {recent.map((shipment) => <tr key={shipment.id} className="border-t"><td className="p-4 font-semibold"><Link className="hover:underline" href={`/admin/orders/${shipment.orderId}`}>{shipment.order.orderNumber}</Link></td><td className="p-4">{shipment.order.recipientName}</td><td className="p-4">{shipment.order.district}</td><td className="p-4">{shipment.provider ?? "—"}</td><td className="p-4 font-mono text-xs">{shipment.trackingId ?? "—"}</td><td className="p-4">{shipment.status.replaceAll("_", " ")}</td><td className="p-4">{shipment.updatedAt.toLocaleString("en-BD")}</td></tr>)}
        </tbody></table>
        {!recent.length && <p className="p-10 text-center text-sm text-slate-500">No shipments have been created yet.</p>}
      </section>
    </main>
  );
}
