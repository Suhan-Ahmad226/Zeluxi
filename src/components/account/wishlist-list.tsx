"use client";
import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
type Item={id:string;product:{id:string;name:string;slug:string;price:unknown;images:{url:string;altText:string|null}[];inventory:{available:number}|null}};
const money=(v:unknown)=>Number(v).toLocaleString("en-BD",{maximumFractionDigits:2});
export function WishlistList({items}:{items:Item[]}){
 const [list,setList]=useState(items),[busy,setBusy]=useState<string|null>(null);
 async function remove(productId:string,id:string){setBusy(id);try{const r=await fetch("/api/wishlist",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({productId})});if(!r.ok)throw new Error();setList(x=>x.filter(i=>i.id!==id))}finally{setBusy(null)}}
 if(!list.length)return <div className="mt-6 rounded-2xl border border-dashed p-8 text-center"><p className="text-slate-600">Your wishlist is empty.</p><Link href="/shop" className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Browse products</Link></div>;
 return <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{list.map(x=><article key={x.id} className="overflow-hidden rounded-2xl border bg-white"><Link href={"/product/"+x.product.slug}><div className="relative aspect-square bg-slate-100">{x.product.images[0]?<Image src={x.product.images[0].url} alt={x.product.images[0].altText||x.product.name} fill sizes="(max-width:640px) 50vw,25vw" className="object-cover"/>:null}</div><div className="p-3"><p className="line-clamp-2 text-sm font-semibold">{x.product.name}</p><p className="mt-1 font-bold">৳{money(x.product.price)}</p></div></Link><div className="px-3 pb-3"><button disabled={busy===x.id} onClick={()=>remove(x.product.id,x.id)} className="w-full rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">{busy===x.id?"Removing…":"Remove"}</button></div></article>)}</div>
}