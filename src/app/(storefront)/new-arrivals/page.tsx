import type {Metadata} from "next";
import {db} from "@/lib/db/client";
import {CatalogGrid} from "@/components/product/catalog-grid";
export const metadata:Metadata={title:"New Arrivals | Zelux",description:"Shop the latest products published on Zelux."};
export default async function NewArrivalsPage(){
 const products=await db.product.findMany({where:{isPublished:true},include:{images:{orderBy:{sortOrder:"asc"}},inventory:true},orderBy:{createdAt:"desc"},take:48});
 return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10"><p className="text-sm font-semibold text-indigo-600">Just added</p><h1 className="mt-1 text-3xl font-bold">New Arrivals</h1><p className="mt-2 text-slate-600">The latest products added to the Zelux catalog.</p><div className="mt-8"><CatalogGrid products={products} empty="New products will appear here soon." /></div></main>;
}