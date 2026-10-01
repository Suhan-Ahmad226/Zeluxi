import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
const schema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().max(20).optional().or(z.literal(""))});
export async function PATCH(req:Request){
 const user=await getCurrentLocalUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const p=schema.safeParse(await req.json().catch(()=>null)); if(!p.success)return NextResponse.json({error:"Invalid profile data"},{status:400});
 let updated;try{updated=await db.user.update({where:{id:user.id},data:{name:p.data.name,phone:p.data.phone||null},select:{id:true,email:true,name:true,phone:true}})}catch{return NextResponse.json({error:"Unable to update profile."},{status:409})}
 return NextResponse.json(updated);
}