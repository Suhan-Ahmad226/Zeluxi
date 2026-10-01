import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@/lib/db/client";
import {OrderStatus,ShipmentStatus} from "@prisma/client";
import {assertTransition} from "@/modules/orders/transitions";
const statusMap:Record<string,{shipment:ShipmentStatus;order?:OrderStatus}>={
 "order.created":{shipment:ShipmentStatus.PICKUP_REQUESTED,order:OrderStatus.SHIPPED},
 "order.updated":{shipment:ShipmentStatus.PICKUP_REQUESTED},
 "order.pickup-requested":{shipment:ShipmentStatus.PICKUP_REQUESTED,order:OrderStatus.SHIPPED},
 "order.assigned-for-pickup":{shipment:ShipmentStatus.PICKUP_REQUESTED,order:OrderStatus.SHIPPED},
 "order.picked":{shipment:ShipmentStatus.PICKED_UP,order:OrderStatus.SHIPPED},
 "order.in-transit":{shipment:ShipmentStatus.IN_TRANSIT,order:OrderStatus.SHIPPED},
 "order.assigned-for-delivery":{shipment:ShipmentStatus.OUT_FOR_DELIVERY,order:OrderStatus.OUT_FOR_DELIVERY},
 "order.delivered":{shipment:ShipmentStatus.DELIVERED,order:OrderStatus.DELIVERED},
 "order.returned":{shipment:ShipmentStatus.RETURNED,order:OrderStatus.RETURN_REQUESTED},
 "order.returned-to-merchant":{shipment:ShipmentStatus.RETURNED,order:OrderStatus.RETURN_REQUESTED},
 "order.cancelled":{shipment:ShipmentStatus.CANCELLED},
 "order.pickup-cancelled":{shipment:ShipmentStatus.CANCELLED},
 "order.delivery-failed":{shipment:ShipmentStatus.OUT_FOR_DELIVERY},
 "order.on-hold":{shipment:ShipmentStatus.IN_TRANSIT},
 "order.partial-delivery":{shipment:ShipmentStatus.DELIVERED,order:OrderStatus.DELIVERED}
};
function verify(raw:string,signature:string,secret:string){const expected=createHmac("sha256",secret).update(raw).digest("hex"),a=Buffer.from(expected),b=Buffer.from(signature);return a.length===b.length&&timingSafeEqual(a,b);}
function pick(payload:unknown,raw:string){const p=payload as Record<string,any>,data=(p?.data??p) as Record<string,any>,event=String(p?.event??data?.event??"").toLowerCase();const eventId=String(p?.event_id??p?.eventId??data?.event_id??data?.eventId??"")||createHash("sha256").update(raw).digest("hex");const trackingId=String(p?.consignment_id??data?.consignment_id??p?.consignmentId??data?.consignmentId??"");const status=String(p?.order_status??data?.order_status??data?.status??event).toLowerCase().replace(/[ _]+/g,"-");return{eventId,trackingId,status};}
export async function POST(req:Request){
 const raw=await req.text(),secret=process.env.PATHAO_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:"Webhook is not configured."},{status:503});
 const signature=req.headers.get("x-pathao-signature")||req.headers.get("x-webhook-signature")||"",integration=req.headers.get("x-pathao-merchant-webhook-integration-secret")||"",ia=Buffer.from(integration),ib=Buffer.from(secret),authenticated=integration?(ia.length===ib.length&&timingSafeEqual(ia,ib)):verify(raw,signature,secret);
 if(!authenticated)return NextResponse.json({error:"Invalid webhook signature."},{status:401});
 let payload:unknown;try{payload=JSON.parse(raw)}catch{return NextResponse.json({error:"Invalid JSON."},{status:400})}
 const {eventId,trackingId,status}=pick(payload,raw);if(!trackingId||!status)return NextResponse.json({error:"Missing tracking ID or status."},{status:400});const mapped=statusMap[status];if(!mapped)return NextResponse.json({received:true,ignored:true});
 try{
  await db.$transaction(async tx=>{
   const existing=await tx.webhookEvent.findUnique({where:{provider_eventId:{provider:"PATHAO",eventId}}});if(existing)return;
   const shipment=await tx.shipment.findFirst({where:{provider:"PATHAO",trackingId}});if(!shipment)throw new Error("Shipment not found for this Pathao event.");
   await tx.webhookEvent.create({data:{provider:"PATHAO",eventId,payload,processedAt:new Date()}});
   await tx.shipment.update({where:{id:shipment.id},data:{status:mapped.shipment,...(mapped.shipment===ShipmentStatus.DELIVERED?{deliveredAt:new Date()}:{} )}});
   if(mapped.order){const order=await tx.order.findUnique({where:{id:shipment.orderId}});if(order&&order.status!==mapped.order){assertTransition(order.status,mapped.order);await tx.order.update({where:{id:order.id},data:{status:mapped.order}});await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:order.status,toStatus:mapped.order,note:`Pathao webhook: ${status}`}});}}
  });
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Webhook processing failed"},{status:409});}
 return NextResponse.json({received:true});
}