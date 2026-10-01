import { OrderStatus, Prisma } from "@prisma/client";
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
    const updated=await tx.order.update({where:{id:order.id},data:{status:nextStatus}});
    await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:order.status,toStatus:nextStatus,note}});
    await tx.auditLog.create({data:{actorUserId,action:"ORDER_STATUS_UPDATE",entityType:"Order",entityId:order.id,before:order.status,after:nextStatus as unknown as Prisma.InputJsonValue,context:note?{note}:undefined}});
    return updated;
  });
}
