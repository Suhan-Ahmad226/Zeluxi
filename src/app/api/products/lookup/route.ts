import {NextResponse} from "next/server";
import {db} from "@/lib/db/client";
export async function GET(req:Request){
 const ids=[...new Set(new URL(req.url).searchParams.get("ids")?.split(",").map(x=>x.trim()).filter(Boolean)??[])].slice(0,24);
 if(!ids.length)return NextResponse.json([]);
 const products=await db.product.findMany({where:{id:{in:ids},isPublished:true},include:{images:{orderBy:{sortOrder:"asc"},take:1},inventory:true,variants:{include:{inventory:true}}}});
 const byId=new Map(products.map(p=>[p.id,p]));
 return NextResponse.json(ids.map(id=>byId.get(id)).filter(Boolean));
}