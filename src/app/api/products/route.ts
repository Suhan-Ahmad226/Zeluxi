import {NextResponse} from "next/server";
import {listPublishedProducts} from "@/modules/products/service";
export async function GET(req:Request){const u=new URL(req.url);return NextResponse.json(await listPublishedProducts({q:u.searchParams.get("q")??undefined,categorySlug:u.searchParams.get("category")??undefined,take:Number(u.searchParams.get("take")??24)}));}