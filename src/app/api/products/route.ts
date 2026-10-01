import {NextResponse} from "next/server";
import {listPublishedProducts} from "@/modules/products/service";
import {db} from "@/lib/db/client";

export async function GET(req:Request){
  const u=new URL(req.url);
  const ids=[...new Set((u.searchParams.get("ids")??"").split(",").map(x=>x.trim()).filter(Boolean))].slice(0,50);
  if(ids.length){
    const products=await db.product.findMany({
      where:{id:{in:ids},isPublished:true},
      include:{images:{orderBy:{sortOrder:"asc"}},inventory:true},
    });
    const rank=new Map(ids.map((id,i)=>[id,i]));
    products.sort((a,b)=>(rank.get(a.id)??999)-(rank.get(b.id)??999));
    return NextResponse.json(products);
  }
  const rawTake=Number(u.searchParams.get("take")??24);
  const take=Number.isFinite(rawTake)?Math.min(48,Math.max(1,Math.floor(rawTake))):24;
  return NextResponse.json(await listPublishedProducts({q:u.searchParams.get("q")??undefined,categorySlug:u.searchParams.get("category")??undefined,take}));
}
