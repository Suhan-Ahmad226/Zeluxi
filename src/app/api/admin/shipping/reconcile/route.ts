import {NextResponse} from "next/server";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {reconcileShipment} from "@/modules/shipping/reconciliation";
export async function POST(req:Request){
 const u=await getCurrentLocalUser(); if(!u||u.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await req.json().catch(()=>null); const orderId=typeof body?.orderId==="string"?body.orderId:"";
 if(!orderId)return NextResponse.json({error:"orderId is required"},{status:400});
 try{return NextResponse.json(await reconcileShipment(u.id,orderId));}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Reconciliation failed"},{status:409});}
}