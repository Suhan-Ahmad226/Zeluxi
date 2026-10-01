"use client";
import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ productId, variantId, disabled }: { productId: string; variantId?: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function add() {
    setBusy(true); setDone(false);
    try {
      const res = await fetch("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, ...(variantId ? { variantId } : {}), quantity: 1 }) });
      if (res.status === 401) { window.location.href = "/login?next=/cart"; return; }
      if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error || "Unable to add to cart"); }
      setDone(true); setTimeout(() => setDone(false), 1600);
    } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to add to cart"); }
    finally { setBusy(false); }
  }
  return <Button type="button" onClick={add} disabled={disabled || busy}>{done ? <><Check size={16} className="mr-2"/>Added</> : <><ShoppingCart size={16} className="mr-2"/>{busy ? "Adding…" : disabled ? "Out of stock" : "Add to cart"}</>}</Button>;
}
