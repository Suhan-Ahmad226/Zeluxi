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
};function pick(payload:unknown,raw:string){
  const p=payload as Record<string,any>;
  const data=(p?.data??p) as Record<string,any>;
  const event=String(p?.event??data?.event??"").toLowerCase();
  const eventId=String(p?.event_id??p?.eventId??data?.event_id??data?.eventId??"")||createHash("sha256").update(raw).digest("hex");
  const trackingId=String(p?.consignment_id??data?.consignment_id??p?.consignmentId??data?.consignmentId??"");
  const status=String(p?.order_status??data?.order_status??data?.status??event).toLowerCase().replace(/[ _]+/g,"-");
  return {eventId,trackingId,status};
}mport {createHash,createHmac,timingSafeEqual} from "node:crypto";
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
