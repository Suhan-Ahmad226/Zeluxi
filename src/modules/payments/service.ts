import {PaymentStatus,OrderStatus} from "@prisma/client";
import {db} from "@/lib/db/client";

async function confirmOrderReservedStock(tx: any, orderId: string) {
  const items = await tx.orderItem.findMany({where:{orderId},select:{productId:true,variantId:true,quantity:true}});
  for (const item of items) {
    const result = await tx.inventory.updateMany({
      where: item.variantId ? {variantId:item.variantId,reserved:{gte:item.quantity}} : {productId:item.productId,reserved:{gte:item.quantity}},
      data:{reserved:{decrement:item.quantity}}
    });
    if (result.count !== 1) throw new Error("Reserved stock is inconsistent for this order.");
  }
}

export async function markPaymentFailed(providerReference:string){
  return db.$transaction(async tx=>{
    const payment=await tx.payment.findFirst({where:{providerReference},include:{order:true}});
    if(!payment)throw new Error("Payment not found");
    if(payment.status===PaymentStatus.FAILED)return payment;
    if(payment.status===PaymentStatus.PAID||payment.status===PaymentStatus.REFUNDED)throw new Error("Payment cannot be failed from its current state.");
    const items=await tx.orderItem.findMany({where:{orderId:payment.orderId},select:{productId:true,variantId:true,quantity:true}});
    for(const item of items){
      await tx.inventory.updateMany({where:item.variantId?{variantId:item.variantId,reserved:{gte:item.quantity}}:{productId:item.productId,reserved:{gte:item.quantity}},data:{available:{increment:item.quantity},reserved:{decrement:item.quantity}}});
    }
    const updated=await tx.payment.update({where:{id:payment.id},data:{status:PaymentStatus.FAILED}});
    if(payment.order.status===OrderStatus.PENDING){
      await tx.order.update({where:{id:payment.orderId},data:{status:OrderStatus.CANCELLED}});
      await tx.orderStatusHistory.create({data:{orderId:payment.orderId,fromStatus:OrderStatus.PENDING,toStatus:OrderStatus.CANCELLED,note:"Payment failed; reserved stock released"}});
    }
    return updated;
  });
}

export async function markPaymentPaid(providerReference:string){
  return db.$transaction(async tx=>{
    const payment=await tx.payment.findFirst({where:{providerReference},include:{order:true}});
    if(!payment)throw new Error("Payment not found");
    if(payment.status===PaymentStatus.PAID)return payment;
    if(payment.status===PaymentStatus.REFUNDED||payment.status===PaymentStatus.FAILED)throw new Error("Payment cannot be marked paid from its current state.");
    const updated=await tx.payment.update({where:{id:payment.id},data:{status:PaymentStatus.PAID,paidAt:new Date()}});
    if(payment.order.status===OrderStatus.PENDING){
      await confirmOrderReservedStock(tx,payment.orderId);
      await tx.order.update({where:{id:payment.orderId},data:{status:OrderStatus.CONFIRMED}});
      await tx.orderStatusHistory.create({data:{orderId:payment.orderId,fromStatus:OrderStatus.PENDING,toStatus:OrderStatus.CONFIRMED,note:"Payment confirmed"}});
    }
    return updated;
  });
}

export async function markCodCollected(orderId:string){
  return db.$transaction(async tx=>{
    const payment=await tx.payment.findUnique({where:{orderId},include:{order:true}});
    if(!payment)throw new Error("Payment not found");
    if(payment.method!=="COD")throw new Error("Order is not COD.");
    if(payment.status===PaymentStatus.PAID)return payment;
    if(payment.status!==PaymentStatus.PENDING)throw new Error("COD payment cannot be collected from its current state.");
    await confirmOrderReservedStock(tx,orderId);
    return tx.payment.update({where:{id:payment.id},data:{status:PaymentStatus.PAID,paidAt:new Date()}});
  });
}
