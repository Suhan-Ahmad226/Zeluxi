import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { updateOrderStatus } from "@/modules/orders/service";
const schema=z.object({status:z.nativeEnum(OrderStatus),note:z.string().trim().max(500).optional()});
export async function PATCH(req:Request,{params}:{params:Promise<{orderId:string}>}){const user=await getCurrentLocalUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Invalid status"},{status:400});try{return NextResponse.json(await updateOrderStatus(user.id,(await params).orderId,parsed.data.status,parsed.data.note));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update order"},{status:409});}}