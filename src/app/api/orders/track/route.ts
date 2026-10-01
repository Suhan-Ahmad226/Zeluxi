import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db/client";
import {getCourierProvider} from "@/modules/shipping/registry";
const schema=z.object({orderNumber:z.string().trim().min(3).max(80),phone:z.string().trim().min(8).max(20)});
export async function GET(req:Request){
  const parsed=schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:"Invalid tracking request."},{status:400});
  const order=await db.order.findFirst({where:{orderNumber:parsed.data.orderNumber,recipientPhone:parsed.data.phone},select:{orderNumber:true,status:true,createdAt:true,shipment:{select:{status:true,provider:true,trackingId:true,shippedAt:true,deliveredAt:true}}}});
  if(!order)return NextResponse.json({error:"Order not found."},{status:404});
  let courierTracking:null|unknown=null;
  if(order.shipment?.provider&&order.shipment.trackingId){try{const provider=getCourierProvider(order.shipment.provider);if(provider.getTracking)courierTracking=await provider.getTracking(order.shipment.trackingId)}catch{}}
  return NextResponse.json({order,courierTracking});
}