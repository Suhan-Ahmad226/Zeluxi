import {createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@/lib/db/client";
import {OrderStatus,ShipmentStatus} from "@prisma/client";
import {assertTransition} from "@/modules/orders/transitions";

const statusMap:Record<string,{shipment:ShipmentStatus;order?:OrderStatus}>={
  accepted:{shipment:ShipmentStatus.PICKUP_REQUESTED,order:OrderStatus.SHIPPED},
  picked:{shipment:ShipmentStatus.PICKED_UP,order:OrderStatus.SHIPPED},
  picked_up:{shipment:ShipmentStatus.PICKED_UP,order:OrderStatus.SHIPPED},
  in_transit:{shipment:ShipmentStatus.IN_TRANSIT,order:OrderStatus.SHIPPED},
  ready_for_delivery:{shipment:ShipmentStatus.OUT_FOR_DELIVERY,order:OrderStatus.OUT_FOR_DELIVERY},
  out_for_delivery:{shipment:ShipmentStatus.OUT_FOR_DELIVERY,order:OrderStatus.OUT_FOR_DELIVERY},
  delivered:{shipment:ShipmentStatus.DELIVERED,order:OrderStatus.DELIVERED},
  returned:{shipment:ShipmentStatus.RETURNED,order:OrderStatus.RETURN_REQUESTED},
  return:{shipment:ShipmentStatus.RETURNED,order:OrderStatus.RETURN_REQUESTED},
  cancelled:{shipment:ShipmentStatus.CANCELLED,order:OrderStatus.CANCELLED}
};

function verify(raw:string,signature:string,secret:string){
  const expected=createHmac("sha256",secret).update(raw).digest("hex");
  const a=Buffer.from(expected,"utf8"),b=Buffer.from(signature,"utf8");
  return a.length===b.length&&timingSafeEqual(a,b);
}
function pick(payload:unknown){
  const p=payload as Record<string,any>;
  const data=(p?.data??p) as Record<string,any>;
  return {
    eventId:String(p?.event_id??p?.eventId??data?.event_id??data?.eventId??""),
    trackingId:String(data?.consignment_id??data?.consignmentId??data?.tracking_id??data?.trackingId??""),
    status:String(data?.status??data?.order_status??data?.delivery_status??"").toLowerCase().replace(/[ -]+/g,"_")
  };
}

export async function POST(req:Request){
  const raw=await req.text(),secret=process.env.PATHAO_WEBHOOK_SECRET;
  if(!secret)return NextResponse.json({error:"Webhook is not configured."},{status:503});
  const signature=req.headers.get("x-pathao-signature")||req.headers.get("x-webhook-signature")||"";
  if(!verify(raw,signature,secret))return NextResponse.json({error:"Invalid webhook signature."},{status:401});
  let payload:unknown;try{payload=JSON.parse(raw)}catch{return NextResponse.json({error:"Invalid JSON."},{status:400})}
  const {eventId,trackingId,status}=pick(payload);
  if(!eventId||!trackingId||!status)return NextResponse.json({error:"Missing event ID, tracking ID or status."},{status:400});
  const mapped=statusMap[status];if(!mapped)return NextResponse.json({received:true,ignored:true});
  const existing=await db.webhookEvent.findUnique({where:{provider_eventId:{provider:"PATHAO",eventId}}});
  if(existing)return NextResponse.json({received:true,duplicate:true});
  try{
    await db.$transaction(async tx=>{
      const shipment=await tx.shipment.findFirst({where:{provider:"PATHAO",trackingId}});
      if(!shipment)throw new Error("Shipment not found for this Pathao event.");
      await tx.webhookEvent.create({data:{provider:"PATHAO",eventId,payload,processedAt:new Date()}});
      const update:{status:ShipmentStatus;deliveredAt?:Date}={status:mapped.shipment};
      if(mapped.shipment===ShipmentStatus.DELIVERED)update.deliveredAt=new Date();
      await tx.shipment.update({where:{id:shipment.id},data:update});
      if(mapped.order){
        const order=await tx.order.findUnique({where:{id:shipment.orderId}});
        if(order&&order.status!==mapped.order){
          assertTransition(order.status,mapped.order);
          await tx.order.update({where:{id:order.id},data:{status:mapped.order}});
          await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:order.status,toStatus:mapped.order,note:`Pathao webhook: ${status}`}});
        }
      }
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Webhook processing failed"},{status:409});
  }
  return NextResponse.json({received:true});
}
