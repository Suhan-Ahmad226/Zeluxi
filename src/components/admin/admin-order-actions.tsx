"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const nextMap: Record<string, string | undefined> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "READY_TO_SHIP",
  SHIPPED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  RETURN_REQUESTED: "RETURNED",
};

export function AdminOrderActions({ orderId, status }: { orderId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const next = nextMap[status];
  if (!next) return <span className="text-xs text-slate-500">No next action</span>;

  async function update() {
    setBusy(true);
    const r = await fetch("/api/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!r.ok) alert((await r.json().catch(() => null))?.error || "Unable to update");
    else location.reload();
    setBusy(false);
  }

  return <Button type="button" className="whitespace-nowrap" disabled={busy} onClick={update}>{busy ? "Updating…" : "→ " + next.replaceAll("_", " ")}</Button>;
}
