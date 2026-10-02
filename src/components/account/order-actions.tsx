"use client";

import { useState } from "react";

export function OrderActions({ orderNumber, status }: { orderNumber: string; status: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(action: "CANCEL" | "RETURN") {
    setBusy(action); setError("");
    const response = await fetch(`/api/account/orders/${encodeURIComponent(orderNumber)}/action`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) setError(data?.error ?? "Unable to update order.");
    else location.reload();
    setBusy(null);
  }

  return <div className="mt-5 space-y-3">
    {status === "PENDING" || status === "CONFIRMED" || status === "PROCESSING" ? <button disabled={busy !== null} onClick={() => { if (confirm("Cancel this order?")) void run("CANCEL"); }} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">{busy === "CANCEL" ? "Cancelling…" : "Cancel order"}</button> : null}
    {status === "DELIVERED" ? <button disabled={busy !== null} onClick={() => { if (confirm("Request a return for this order?")) void run("RETURN"); }} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">{busy === "RETURN" ? "Submitting…" : "Request return"}</button> : null}
    {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
  </div>;
}
