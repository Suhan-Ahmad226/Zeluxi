import {OrderStatus,ShipmentStatus} from "@prisma/client";
import {db} from "@/lib/db/client";
import {getCourierProvider} from "@/modules/shipping/registry";
import {assertTransition} from "@/modules/orders/transitions";

function normalizeStatus(value:unknown){return String(value??"").toLowerCase().replace(/[ -]+/g,"_");}
function extract(payload:unknown){const p=payload as Record<string,any>;const d=(p?.data??p) as Record<string,any>;return {status:normalizeStatus(d?.status??d?.order_status??d?.delivery_status),delivered:normalizeStatus(d?.status??"")==="delivered"};}
const map:Record<string,{shipment:ShipmentStatus;order?:OrderStatus}>={
accepted:{shipment:ShipmentStatus.PICKUP_REQUESTED,order:OrderStatus.SHIPPED},picked:{shipment:ShipmentStatus.PICKED_UP,order:OrderStatus.SHIPPED},picked_up:{shipment:ShipmentStatus.PICKED_UP,order:OrderStatus.SHIPPED},
in_transit:{shipment:ShipmentStatus.IN_TRANSIT,order:OrderStatus.SHIPPED},ready_for_delivery:{shipment:ShipmentStatus.OUT_FOR_DELIVERY,order:OrderStatus.OUT_FOR_DELIVERY},out_for_delivery:{shipment:ShipmentStatus.OUT_FOR_DELIVERY,order:OrderStatus.OUT_FOR_DELIVERY},
delivered:{shipment:ShipmentStatus.DELIVERED,order:OrderStatus.DELIVERED},returned:{shipment:ShipmentStatus.RETURNED,order:OrderStatus.RETURN_REQUESTED},return:{shipment:ShipmentStatus.RETURNED,order:OrderStatus.RETURN_REQUESTED},cancelled:{shipment:ShipmentStatus.CANCELLED,order:OrderStatus.CANCELLED}
};
export async function reconcileShipment(actorUserId:string,orderId:string){
 const actor=await db.user.findUnique({where:{id:actorUserId}}); if(actor?.role!=="ADMIN")throw new Error("Forbidden");
 const shipment=await db.shipment.findUnique({where:{orderId},include:{order:true}}); if(!shipment?.trackingId)throw new Error("Shipment tracking ID not found.");
 const provider=getCourierProvider(shipment.provider||process.env.DEFAULT_COURIER_PROVIDER||"MANUAL");
 if(!provider.getTracking)throw new Error(`Courier provider ${provider.name} does not support tracking reconciliation.`);
 const raw=await provider.getTracking(shipment.trackingId); const parsed=extract(raw); const mapped=map[parsed.status]; if(!mapped) return {changed:false,status:parsed.status||"unknown",raw};
 return db.$transaction(async tx=>{
   const current=await tx.shipment.findUnique({where:{id:shipment.id}}); if(!current)throw new Error("Shipment not found.");
   await tx.shipment.update({where:{id:shipment.id},data:{status:mapped.shipment,...(mapped.shipment===ShipmentStatus.DELIVERED?{deliveredAt:new Date()}:{} )}});
   const order=await tx.order.findUnique({where:{id:orderId}}); if(order&&mapped.order&&order.status!==mapped.order){
     assertTransition(order.status,mapped.order);
     await tx.order.update({where:{id:orderId},data:{status:mapped.order}});
     await tx.orderStatusHistory.create({data:{orderId,fromStatus:order.status,toStatus:mapped.order,note:`Courier reconciliation: ${parsed.status}`}});
   }
   await tx.auditLog.create({data:{actorUserId,action:"SHIPMENT_RECONCILED",entityType:"Shipment",entityId:shipment.id,before:{status:current.status},after:{status:mapped.shipment},context:{provider:provider.name,trackingId:shipment.trackingId,courierStatus:parsed.status}}});
   return {changed:true,status:parsed.status,shipmentStatus:mapped.shipment,orderStatus:mapped.order??order?.status};
 });
}
