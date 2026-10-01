"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Address={id:string;label:string|null;recipientName:string;phone:string;division:string;district:string;area:string|null;addressLine:string;postalCode:string|null};
type Item={productId:string;variantId?:string;quantity:number};

export function CheckoutForm({ addresses, items }: { addresses: Address[]; items: Item[] }) {
  const router=useRouter(); const [addressId,setAddressId]=useState(addresses.find(a=>a.id)?.id||"");
  const [paymentMethod,setPaymentMethod]=useState<"COD"|"ONLINE">("COD");
  const [couponCode,setCouponCode]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setError("");
    if(!addressId){setError("Please select a delivery address.");return;}
    setBusy(true);
    try {
      const key=crypto.randomUUID()+crypto.randomUUID();
      const res=await fetch("/api/checkout",{method:"POST",headers:{"content-type":"application/json","x-idempotency-key":key},body:JSON.stringify({items,addressId,paymentMethod,...(couponCode.trim()?{couponCode:couponCode.trim()}: {})})});
      const data=await res.json().catch(()=>null);
      if(!res.ok) throw new Error(data?.error||"Unable to place order.");
      if(paymentMethod==="ONLINE"){const pr=await fetch("/api/payments/initiate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({orderNumber:data.orderNumber})});const pd=await pr.json().catch(()=>null);if(!pr.ok||!pd?.gatewayUrl)throw new Error(pd?.error||"Unable to start online payment.");window.location.assign(pd.gatewayUrl);return;}router.push("/orders/"+data.orderNumber);
    } catch(e){setError(e instanceof Error?e.message:"Unable to place order.");setBusy(false);}
  }
  return <form onSubmit={submit} className="space-y-6">
    <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Delivery address</h2>
      {addresses.length ? <div className="mt-4 space-y-2">{addresses.map(a=><label key={a.id} className={"block cursor-pointer rounded-xl border p-4 "+(addressId===a.id?"border-indigo-500 bg-indigo-50/50":"border-slate-200")}><input type="radio" name="address" value={a.id} checked={addressId===a.id} onChange={()=>setAddressId(a.id)} className="mr-3"/><span className="font-medium">{a.label||"Address"} · {a.recipientName}</span><p className="mt-1 pl-6 text-sm text-slate-600">{a.phone}, {a.addressLine}, {a.area ? a.area+", " : ""}{a.district}, {a.division}</p></label>)}</div> : <p className="mt-3 text-sm text-slate-600">No saved address found. Add an address from your account first.</p>}
    </section>
    <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Payment method</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{(["COD","ONLINE"] as const).map(m=><label key={m} className={"cursor-pointer rounded-xl border p-4 "+(paymentMethod===m?"border-indigo-500 bg-indigo-50/50":"")}><input type="radio" name="payment" checked={paymentMethod===m} onChange={()=>setPaymentMethod(m)} className="mr-3"/><span className="font-medium">{m==="COD"?"Cash on delivery":"Online payment"}</span><p className="mt-1 text-xs text-slate-500">{m==="COD"?"Pay when your order arrives.":"Payment provider will be connected through the payment adapter."}</p></label>)}</div></section>
    <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Coupon</h2><input value={couponCode} onChange={e=>setCouponCode(e.target.value)} placeholder="Coupon code (optional)" className="mt-3 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-indigo-500"/></section>
    {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    <Button type="submit" className="w-full sm:w-auto" disabled={busy||!addresses.length}>{busy?"Placing order…":"Place order"}</Button>
  </form>;
}
