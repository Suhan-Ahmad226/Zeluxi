import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
const schema=z.object({status:z.enum(["OPEN","WAITING_FOR_CUSTOMER","CLOSED"]),priority:z.enum(["LOW","NORMAL","HIGH"]).optional()});
export async function PATCH(req:Request,{params}:{params:Promise<{ticketId:string}>}){const u=await getCurrentLocalUser();if(!u||u.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Invalid request"},{status:400});const {ticketId}=await params;const ticket=await db.supportTicket.update({where:{id:ticketId},data:p.data});return NextResponse.json(ticket);}
