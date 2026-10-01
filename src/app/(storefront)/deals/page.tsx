import type {Metadata} from "next";
import {db} from "@/lib/db/client";
import {CatalogGrid} from "@/components/product/catalog-grid";
export const metadata:Metadata={title:"Deals & Offers | Zelux",description:"Find products currently listed below their comparison price on Zelux."};
export default async function DealsPage(){
 const products=await db.product.findMany({where:{isPublished:true,compareAtPrice:{not:null}},include:{images:{orderBy:{sortOrder:"asc"}},inventory:true},orderBy:{updatedAt:"desc"},take:48});
 const discounted=products.filter(p=>p.compareAtPrice!==null&&Number(p.compareAtPrice)>Number(p.price));
 return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10"><p className="text-sm font-semibold text-indigo-600">Save more</p><h1 className="mt-1 text-3xl font-bold">Deals & Offers</h1><p className="mt-2 text-slate-600">Products with a comparison price above the current selling price.</p><div className="mt-8"><CatalogGrid products={discounted} empty="No discounted products are available right now." /></div></main>;
}