import { NextResponse } from "next/server";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { z } from "zod";

const addressSchema=z.object({label:z.string().trim().max(40).optional(),recipientName:z.string().trim().min(2).max(100),phone:z.string().trim().min(7).max(20),division:z.string().trim().min(2).max(80),district:z.string().trim().min(2).max(80),area:z.string().trim().max(80).optional(),addressLine:z.string().trim().min(5).max(300),postalCode:z.string().trim().max(20).optional(),isDefault:z.boolean().optional()});

export async function GET(){const user=await getCurrentLocalUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json(await db.address.findMany({where:{userId:user.id},orderBy:[{isDefault:"desc"},{createdAt:"desc"}]}));}
export async function POST(req:Request){const user=await getCurrentLocalUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=addressSchema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Invalid address",details:parsed.error.flatten()},{status:400});try{const address=await db.$transaction(async tx=>{if(parsed.data.isDefault)await tx.address.updateMany({where:{userId:user.id},data:{isDefault:false}});const count=await tx.address.count({where:{userId:user.id}});return tx.address.create({data:{...parsed.data,userId:user.id,isDefault:parsed.data.isDefault??count===0}})});return NextResponse.json(address,{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to save address"},{status:409});}}
