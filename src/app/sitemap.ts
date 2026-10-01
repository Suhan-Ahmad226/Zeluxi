import type {MetadataRoute} from "next";
import {db} from "@/lib/db/client";

const base=process.env.NEXT_PUBLIC_SITE_URL||"https://zelux.vercel.app";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const [products,categories]=await Promise.all([
    db.product.findMany({where:{isPublished:true},select:{slug:true,updatedAt:true}}),
    db.category.findMany({where:{isActive:true},select:{slug:true,updatedAt:true}})
  ]);
  return [
    {url:base,lastModified:new Date()},
    {url:`${base}/shop`,lastModified:new Date()},
    ...categories.map(x=>({url:`${base}/category/${x.slug}`,lastModified:x.updatedAt})),
    ...products.map(x=>({url:`${base}/product/${x.slug}`,lastModified:x.updatedAt}))
  ];
}
