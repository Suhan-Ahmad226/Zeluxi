import type {Metadata} from "next";
import {db} from "@/lib/db/client";
import {CatalogGrid} from "@/components/product/catalog-grid";
export const metadata:Metadata={title:"Flash Sale | Zelux",description:"Browse currently discounted Zelux products with stock available."};
export default async function FlashSalePage(){
 const products=await db.product.findMany({where:{isPublished:true,compareAtPrice:{not:null}},include:{images:{orderBy:{sortOrder:"asc"}},inventory:true},orderBy:{updatedAt:"desc"},take:48});
 const sale=products.filter(p=>p.compareAtPrice!==null&&Number(p.compareAtPrice)>Number(p.price)&&(p.inventory?.available??0)>0);
 return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10"><p className="text-sm font-semibold text-indigo-600">Limited stock</p><h1 className="mt-1 text-3xl font-bold">Flash Sale</h1><p className="mt-2 text-slate-600">Currently discounted products that have stock available.</p><div className="mt-8"><CatalogGrid products={sale} empty="There are no active flash-sale items right now." /></div></main>;
}