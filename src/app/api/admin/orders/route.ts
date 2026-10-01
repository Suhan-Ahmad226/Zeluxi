import { NextResponse } from "next/server";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
export async function GET(){const user=await getCurrentLocalUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const orders=await db.order.findMany({orderBy:{createdAt:"desc"},take:100,include:{items:true,payment:true,shipment:true,user:{select:{id:true,name:true,email:true,phone:true}}}});return NextResponse.json(orders);}