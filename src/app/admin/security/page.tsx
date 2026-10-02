import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

function formatJson(value: unknown) {
  if (value == null) return "—";
  try {
    const text = JSON.stringify(value);
    return text.length > 180 ? `${text.slice(0, 177)}...` : text;
  } catch {
    return "—";
  }
}

export default async function SecurityPage() {
  const user = await getCurrentLocalUser();
  if (!user) redirect("/login?next=/admin/security");
  if (user.role !== "ADMIN") redirect("/account");

  const [auditCount, webhookCount, adminCount, audits, webhooks] = await Promise.all([
    db.auditLog.count(),
    db.webhookEvent.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { name: true, email: true } } },
    }),
    db.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <p className="text-sm font-semibold text-indigo-600">Admin · Security</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Security & audit</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Review privileged activity and webhook processing without exposing secrets or credentials.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Audit events", auditCount],
          ["Webhook events", webhookCount],
          ["Admin accounts", adminCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-bold">Recent audit events</h2>
          <p className="mt-1 text-sm text-slate-500">Latest 100 administrative/security events.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {audits.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{event.createdAt.toLocaleString("en-BD")}</td>
                  <td className="px-4 py-3">{event.actor?.name || event.actor?.email || "System"}</td>
                  <td className="px-4 py-3 font-medium">{event.action}</td>
                  <td className="px-4 py-3">{event.entityType}{event.entityId ? ` · ${event.entityId}` : ""}</td>
                  <td className="max-w-[320px] px-4 py-3 font-mono text-xs text-slate-500">{formatJson(event.context ?? event.metadata)}</td>
                </tr>
              ))}
              {!audits.length ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No audit events yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-bold">Webhook event ledger</h2>
          <p className="mt-1 text-sm text-slate-500">Recent provider events and processing state. Payload bodies are intentionally not rendered.</p>
        </div>
        <div className="divide-y">
          {webhooks.map((event) => (
            <div key={event.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <div><p className="font-medium">{event.provider}</p><p className="text-xs text-slate-500">{event.eventId}</p></div>
              <p className="text-sm text-slate-500">{event.createdAt.toLocaleString("en-BD")}</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{event.processedAt ? "Processed" : "Pending"}</span>
            </div>
          ))}
          {!webhooks.length ? <p className="p-10 text-center text-slate-500">No webhook events recorded.</p> : null}
        </div>
      </section>
    </main>
  );
}
