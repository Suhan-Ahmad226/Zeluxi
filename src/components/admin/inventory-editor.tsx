"use client";
import { useState } from "react";

export function InventoryEditor({id,name,sku,available,reserved,threshold}:{id:string;name:string;sku:string;available:number;reserved:number;threshold:number}){
  const [stock,setStock]=useState(available);
  const [limit,setLimit]=useState(threshold);
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  async function save(){
    setBusy(true);setMsg("");
    const r=await fetch("/api/admin/inventory",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({inventoryId:id,available:stock,lowStockThreshold:limit,reason})});
    setMsg(r.ok?"Saved":"Unable to save");
    if(r.ok)setReason("");
    setBusy(false);
  }
  return <div className="flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
    <div><p className="font-semibold">{name}</p><p className="text-xs text-slate-500">{sku} · Reserved {reserved}</p></div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-slate-500">Available<input className="mt-1 block w-28 rounded-lg border px-3 py-2 text-sm" type="number" min="0" value={stock} onChange={e=>setStock(Number(e.target.value))}/></label>
      <label className="text-xs text-slate-500">Low stock<input className="mt-1 block w-28 rounded-lg border px-3 py-2 text-sm" type="number" min="0" value={limit} onChange={e=>setLimit(Number(e.target.value))}/></label>
      <label className="w-full text-xs text-slate-500 sm:w-52">Reason<input className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. stock count" maxLength={200}/></label>
      <button disabled={busy} onClick={save} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Save"}</button>
      {msg&&<span className="text-xs text-slate-500">{msg}</span>}
    </div>
  </div>
}
