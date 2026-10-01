import type {Metadata} from "next";
import {db} from "@/lib/db/client";
import {CatalogGrid} from "@/components/product/catalog-grid";
export const metadata:Metadata={title:"Offers | Zelux",description:"Browse active coupons and products with current price reductions."};
export default async function OffersPage(){
 const now=new Date();
 const [products,coupons]=await Promise.all([
  db.product.findMany({where:{isPublished:true,compareAtPrice:{not:null}},include:{images:{orderBy:{sortOrder:"asc"}},inventory:true},orderBy:{updatedAt:"desc"},take:48}),
  db.coupon.findMany({where:{isActive:true,AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{endsAt:null},{endsAt:{gte:now}}]}]},select:{id:true,code:true,type:true,value:true,minOrder:true,maxDiscount:true},orderBy:{endsAt:"asc"},take:20})
 ]);
 const discounted=products.filter(p=>p.compareAtPrice!==null&&Number(p.compareAtPrice)>Number(p.price));
 return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10"><p className="text-sm font-semibold text-indigo-600">Current promotions</p><h1 className="mt-1 text-3xl font-bold">Offers</h1><p className="mt-2 text-slate-600">Active coupons and products currently offered below their comparison price.</p>{coupons.length?<section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{coupons.map(c=><article key={c.id} className="rounded-2xl border bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Coupon</p><p className="mt-2 text-lg font-bold">{c.code}</p><p className="mt-1 text-sm text-slate-600">{c.type==="PERCENTAGE"?Number(c.value)+"% off":"৳"+Number(c.value).toLocaleString("en-BD")+" off"}{c.minOrder?" · Minimum order ৳"+Number(c.minOrder).toLocaleString("en-BD"):""}</p></article>)}</section>:null}<div className="mt-9"><CatalogGrid products={discounted} empty="No product price offers are active right now." /></div></main>;
}