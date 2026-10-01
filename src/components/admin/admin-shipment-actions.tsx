"use client";
import {useState} from "react";import {Button} from "@/components/ui/button";
export function AdminShipmentActions({orderId,status,shipment}:{orderId:string;status:string;shipment:{provider:string|null;trackingId:string|null;status:string}|null}){
 const [busy,setBusy]=useState(false);
 if(status==="READY_TO_SHIP"&&(!shipment||!shipment.trackingId))return <Button type="button" disabled={busy} onClick={async()=>{setBusy(true);const r=await fetch("/api/admin/orders/"+orderId+"/shipment",{method:"POST"});if(!r.ok)alert((await r.json().catch(()=>null))?.error||"Unable to book shipment");else location.reload();setBusy(false)}}>{busy?"Booking…":"Book courier"}</Button>;
 if(shipment?.trackingId)return <div className="space-y-1 text-xs"><div className="font-semibold">{shipment.provider}</div><div className="font-mono">{shipment.trackingId}</div><div className="text-slate-500">{shipment.status.replaceAll("_"," ")}</div></div>;
 return <span className="text-xs text-slate-500">—</span>;
}