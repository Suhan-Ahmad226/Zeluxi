"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CartItemControls({ itemId, quantity }: { itemId: string; quantity: number }) {
  const [value, setValue] = useState(quantity);
  const [busy, setBusy] = useState(false);
  async function update(next: number) {
    if (next < 1) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cart/items/" + itemId, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Unable to update cart");
      setValue(next);
      window.location.reload();
    } catch (e) { window.alert(e instanceof Error ? e.message : "Unable to update cart"); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/cart/items/" + itemId, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to remove item");
      window.location.reload();
    } catch (e) { window.alert(e instanceof Error ? e.message : "Unable to remove item"); }
    finally { setBusy(false); }
  }
  return <div className="flex items-center gap-2">
    <Button type="button" className="h-9 min-h-9 w-9 px-0" disabled={busy || value <= 1} onClick={() => update(value - 1)}>-</Button>
    <span className="w-7 text-center text-sm font-semibold">{value}</span>
    <Button type="button" className="h-9 min-h-9 w-9 px-0" disabled={busy} onClick={() => update(value + 1)}>+</Button>
    <button type="button" onClick={remove} disabled={busy} className="ml-2 text-xs font-medium text-red-600 hover:underline">Remove</button>
  </div>;
}
