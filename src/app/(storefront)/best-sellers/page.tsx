import type {Metadata} from "next";
import {db} from "@/lib/db/client";
import {CatalogGrid} from "@/components/product/catalog-grid";
export const metadata:Metadata={title:"Best Sellers | Zelux",description:"Browse Zelux products with the highest completed order quantities."};
export default async function BestSellersPage(){
 const rows=await db.orderItem.groupBy({by:["productId"],where:{order:{status:{notIn:["CANCELLED","RETURNED","REFUNDED"]}}},_sum:{quantity:true},orderBy:{_sum:{quantity:"desc"}},take:48});
 const ids=rows.map(r=>r.productId);
 const products=ids.length?await db.product.findMany({where:{id:{in:ids},isPublished:true},include:{images:{orderBy:{sortOrder:"asc"}},inventory:true}}):[];
 const rank=new Map(ids.map((id,i)=>[id,i])); products.sort((a,b)=>(rank.get(a.id)??999)-(rank.get(b.id)??999));
 return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10"><p className="text-sm font-semibold text-indigo-600">Popular now</p><h1 className="mt-1 text-3xl font-bold">Best Sellers</h1><p className="mt-2 text-slate-600">Products ordered most often based on store activity.</p><div className="mt-8"><CatalogGrid products={products} empty="Best-seller data will appear here as orders are completed." /></div></main>;
}