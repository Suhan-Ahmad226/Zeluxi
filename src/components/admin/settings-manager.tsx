"use client";

import { useState } from "react";

type Setting = { key: string; value: string | number | boolean | null | unknown };

const LABELS: Record<string, string> = {
  "store.name": "Store name",
  "store.phone": "Store phone",
  "store.email": "Store email",
  "store.currency": "Currency",
  "checkout.codEnabled": "Cash on delivery",
  "checkout.onlineEnabled": "Online payment",
  "shipping.insideDhaka": "Inside Dhaka shipping (BDT)",
  "shipping.outsideDhaka": "Outside Dhaka shipping (BDT)",
  "shipping.freeThreshold": "Free shipping threshold (BDT)",
  "seo.defaultTitle": "Default SEO title",
  "seo.defaultDescription": "Default SEO description",
};

const BOOLEAN_KEYS = new Set(["checkout.codEnabled", "checkout.onlineEnabled"]);
const NUMBER_KEYS = new Set(["shipping.insideDhaka", "shipping.outsideDhaka", "shipping.freeThreshold"]);

function displayValue(value: Setting["value"]) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function SettingsManager({ initial }: { initial: Setting[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function save(item: Setting, raw: string) {
    setBusy(item.key);
    setMessage("");
    let value: string | number | boolean = raw;
    if (BOOLEAN_KEYS.has(item.key)) value = raw === "true";
    if (NUMBER_KEYS.has(item.key)) value = Number(raw);
    if (NUMBER_KEYS.has(item.key) && (!Number.isFinite(value) || Number(value) < 0)) {
      setMessage(`${LABELS[item.key]} must be a valid non-negative number.`);
      setBusy(null);
      return;
    }
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: item.key, value }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) setMessage(data?.error ?? "Unable to save setting.");
    else {
      setItems((current) => current.map((entry) => (entry.key === item.key ? { ...entry, value } : entry)));
      setMessage("Setting saved.");
    }
    setBusy(null);
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-xl border p-4">
            <label className="text-sm font-semibold text-slate-900" htmlFor={item.key}>{LABELS[item.key] ?? item.key}</label>
            {BOOLEAN_KEYS.has(item.key) ? (
              <select id={item.key} defaultValue={displayValue(item.value) || "false"} onChange={(event) => void save(item, event.target.value)} disabled={busy === item.key} className="mt-2 w-full rounded-lg border px-3 py-2">
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            ) : (
              <div className="mt-2 flex gap-2">
                <input id={item.key} defaultValue={displayValue(item.value)} type={NUMBER_KEYS.has(item.key) ? "number" : "text"} className="min-w-0 flex-1 rounded-lg border px-3 py-2" />
                <button type="button" disabled={busy === item.key} onClick={(event) => { const input = (event.currentTarget.previousElementSibling as HTMLInputElement); void save(item, input.value); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">{item.key}</p>
          </div>
        ))}
      </div>
      {message ? <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600" role="status">{message}</p> : null}
    </section>
  );
}
