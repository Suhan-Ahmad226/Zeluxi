import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db/client";
import { assertTransition } from "@/modules/orders/transitions";


export async function getUserOrder(userId:string,orderNumber:string){
  return db.order.findFirst({where:{userId,orderNumber},include:{items:true,payment:true,shipment:true,statusHistory:{orderBy:{createdAt:"asc"}}}});
}
export async function updateOrderStatus(actorUserId:string,orderId:string,nextStatus:OrderStatus,note?:string){
  return db.$transaction(async tx=>{
    const actor=await tx.user.findUnique({where:{id:actorUserId}});
    if(!actor || actor.role!=="ADMIN") throw new Error("Forbidden");
    const order=await tx.order.findUnique({where:{id:orderId}});
    if(!order) throw new Error("Order not found");
    assertTransition(order.status,nextStatus);
    if(nextStatus===OrderStatus.SHIPPED){const shipment=await tx.shipment.findUnique({where:{orderId:order.id}});if(!shipment?.trackingId)throw new Error("Courier shipment must be booked before marking the order as shipped.");}
    if(nextStatus===OrderStatus.CANCELLED){
      const items=await tx.orderItem.findMany({where:{orderId:order.id},select:{productId:true,variantId:true,quantity:true}});
      for(const item of items){const result=await tx.inventory.updateMany({where:item.variantId?{variantId:item.variantId,reserved:{gte:item.quantity}}:{productId:item.productId,reserved:{gte:item.quantity}},data:{available:{increment:item.quantity},reserved:{decrement:item.quantity}}});if(result.count!==1)throw new Error("Reserved stock is inconsistent for cancelled order.");}
    }
    if(nextStatus===OrderStatus.RETURNED){
      const items=await tx.orderItem.findMany({where:{orderId:order.id},select:{productId:true,variantId:true,quantity:true}});
      for(const item of items){const result=await tx.inventory.updateMany({where:item.variantId?{variantId:item.variantId}:{productId:item.productId},data:{available:{increment:item.quantity}}});if(result.count!==1)throw new Error("Inventory record not found for returned item.");}
    }
    const updated=await tx.order.update({where:{id:order.id},data:{status:nextStatus}});
    await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:order.status,toStatus:nextStatus,note}});
    await tx.auditLog.create({data:{actorUserId,action:"ORDER_STATUS_UPDATE",entityType:"Order",entityId:order.id,before:{status:order.status},after:{status:nextStatus},context:note?{note}:undefined}});
    return updated;
  });
}
