import {OrderStatus,PaymentMethod,PaymentStatus,ShipmentStatus} from "@prisma/client";
import {db} from "@/lib/db/client";
import {getCourierProvider} from "@/modules/shipping/registry";
import {assertTransition} from "@/modules/orders/transitions";

export async function bookOrderShipment(actorUserId:string,orderId:string){
  const actor=await db.user.findUnique({where:{id:actorUserId}});
  if(!actor||actor.role!=="ADMIN")throw new Error("Forbidden");
  const claim=await db.$transaction(async tx=>{
    const order=await tx.order.findUnique({where:{id:orderId},include:{items:true,payment:true,shipment:true}});
    if(!order)throw new Error("Order not found.");
    if(order.status!==OrderStatus.READY_TO_SHIP)throw new Error("Order must be READY_TO_SHIP before courier booking.");
    if(order.paymentMethod===PaymentMethod.ONLINE&&order.payment?.status!==PaymentStatus.PAID)throw new Error("Online payment must be confirmed before courier booking.");
    if(!order.shipment)throw new Error("Shipment record not found.");
    if(order.shipment.trackingId)throw new Error("Shipment is already booked.");
    const updated=await tx.shipment.updateMany({where:{id:order.shipment.id,trackingId:null,status:ShipmentStatus.PENDING},data:{status:ShipmentStatus.PROCESSING}});
    if(updated.count!==1)throw new Error("Shipment booking is already in progress.");
    return order;
  },{isolationLevel:"Serializable"});
  const providerName=process.env.DEFAULT_COURIER_PROVIDER||"MANUAL";
  const provider=getCourierProvider(providerName);
  if(!provider.createShipment){await db.shipment.update({where:{orderId},data:{status:ShipmentStatus.CANCELLED}});throw new Error(`Courier provider ${provider.name} does not support shipment booking.`);}
  try{
    const weightGrams=await getOrderWeight(orderId);
    const merchantOrderId=`ZLX-${claim.id}`;
    const booked=await provider.createShipment({merchantOrderId,recipientName:claim.recipientName,recipientPhone:claim.recipientPhone,recipientAddress:[claim.area,claim.addressLine,claim.district,claim.division].filter(Boolean).join(", "),itemQuantity:claim.items.reduce((n,x)=>n+x.quantity,0),weightGrams,amountToCollect:claim.paymentMethod===PaymentMethod.COD?claim.total:0,itemDescription:claim.items.map(x=>x.productName).join(", ").slice(0,500)});
    const result=await db.$transaction(async tx=>{
      const shipment=await tx.shipment.update({where:{orderId},data:{provider:provider.name,trackingId:booked.trackingId,status:ShipmentStatus.PICKUP_REQUESTED,shippedAt:new Date()}});
      assertTransition(claim.status,OrderStatus.SHIPPED);
      const order=await tx.order.update({where:{id:orderId},data:{status:OrderStatus.SHIPPED}});
      await tx.orderStatusHistory.create({data:{orderId,fromStatus:claim.status,toStatus:OrderStatus.SHIPPED,note:`Courier booked: ${provider.name} / ${booked.trackingId}`}});
      await tx.auditLog.create({data:{actorUserId,action:"SHIPMENT_BOOKED",entityType:"Shipment",entityId:shipment.id,before:{status:ShipmentStatus.PROCESSING},after:{status:ShipmentStatus.PICKUP_REQUESTED,provider:provider.name,trackingId:booked.trackingId}}});
      return {order,shipment};
    });
    return result;
  }catch(error){
    await db.shipment.updateMany({where:{orderId,trackingId:null,status:ShipmentStatus.PROCESSING},data:{status:ShipmentStatus.PENDING}});
    throw error;
  }
}
async function getOrderWeight(orderId:string){const items=await db.orderItem.findMany({where:{orderId},include:{product:{select:{weightGrams:true}},variant:{include:{inventory:false}}}});return items.reduce((sum,item)=>sum+(item.product.weightGrams??500)*item.quantity,0);}
