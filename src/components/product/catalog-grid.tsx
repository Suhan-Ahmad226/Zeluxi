import {ProductCard} from "@/components/product/product-card";

type Product={id:string;name:string;slug:string;price:unknown;compareAtPrice?:unknown|null;images:{url:string;altText?:string|null}[];inventory?:{available:number}|null};

export function CatalogGrid({products,empty="No products found."}:{products:Product[];empty?:string}){
 if(!products.length)return <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">{empty}</div>;
 return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>;
}