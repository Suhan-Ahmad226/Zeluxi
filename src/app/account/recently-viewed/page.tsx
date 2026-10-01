"use client";
import {useEffect,useState} from "react";
import {CatalogGrid} from "@/components/product/catalog-grid";

type Product={id:string;name:string;slug:string;price:unknown;compareAtPrice?:unknown|null;images:{url:string;altText?:string|null}[];inventory?:{available:number}|null};
const KEY="zelux:recently-viewed";
export default function RecentlyViewedPage(){
 const [products,setProducts]=useState<Product[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
   let cancelled=false;
   async function load(){
     try{
       const ids=[...new Set(JSON.parse(localStorage.getItem(KEY)||"[]"))].slice(0,20);
       if(!ids.length){if(!cancelled)setProducts([]);return}
       const r=await fetch("/api/products?ids="+encodeURIComponent(ids.join(",")),{cache:"no-store"});
       if(r.ok&&!cancelled)setProducts(await r.json());
     }catch{}finally{if(!cancelled)setLoading(false)}
   }
   load();
   return()=>{cancelled=true};
 },[]);
 return <main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6"><p className="text-sm font-semibold text-indigo-600">Account</p><h1 className="text-3xl font-bold">Recently Viewed</h1><p className="mt-1 text-sm text-slate-500">Products you recently explored on this device.</p></div>{loading?<div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Loading recently viewed products…</div>:<CatalogGrid products={products} empty="You have not viewed any products recently."/>}</main>;
}
