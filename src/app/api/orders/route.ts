import { NextResponse } from "next/server";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
export async function GET(){const user=await getCurrentLocalUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const orders=await db.order.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},include:{items:true,payment:true,shipment:true}});return NextResponse.json(orders);}
