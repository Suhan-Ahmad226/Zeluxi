import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
const schema=z.object({inventoryId:z.string().min(1),available:z.coerce.number().int().min(0),lowStockThreshold:z.coerce.number().int().min(0).max(100000)});
export async function GET(){const u=await getCurrentLocalUser();if(!u||u.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});return NextResponse.json(await db.inventory.findMany({orderBy:{updatedAt:"desc"},include:{product:{select:{id:true,name:true,sku:true,isPublished:true}},variant:{select:{id:true,name:true,sku:true}}}));}
export async function PATCH(req:Request){const u=await getCurrentLocalUser();if(!u||u.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Invalid inventory data"},{status:400});const updated=await db.inventory.update({where:{id:p.data.inventoryId},data:{available:p.data.available,lowStockThreshold:p.data.lowStockThreshold}});return NextResponse.json(updated);}