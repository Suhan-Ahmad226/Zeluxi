import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db/client";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
const schema=z.object({productId:z.string().min(1)});
export async function GET(){const u=await getCurrentLocalUser();if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json(await db.wishlistItem.findMany({where:{userId:u.id},include:{product:{include:{images:{orderBy:{sortOrder:"asc"},take:1},inventory:true}}},orderBy:{createdAt:"desc"}}));}
export async function POST(req:Request){const u=await getCurrentLocalUser();if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Invalid productId"},{status:400});const product=await db.product.findFirst({where:{id:p.data.productId,isPublished:true}});if(!product)return NextResponse.json({error:"Product not found"},{status:404});const item=await db.wishlistItem.upsert({where:{userId_productId:{userId:u.id,productId:product.id}},create:{userId:u.id,productId:product.id},update:{}});return NextResponse.json(item,{status:201});}
export async function DELETE(req:Request){const u=await getCurrentLocalUser();if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Invalid productId"},{status:400});await db.wishlistItem.deleteMany({where:{userId:u.id,productId:p.data.productId}});return NextResponse.json({ok:true});}
