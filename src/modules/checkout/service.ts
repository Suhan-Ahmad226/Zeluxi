import {Prisma,PaymentMethod,OrderStatus,ShipmentStatus,PaymentStatus} from "@prisma/client";
import {db} from "@/lib/db/client";
import type {CheckoutInput} from "@/lib/validation/commerce";

const money=(n:Prisma.Decimal.Value)=>new Prisma.Decimal(n);
const calculateShippingFee=(district:string)=>money(district.trim().toLowerCase()==="dhaka"?80:130);

export async function createOrder(userId:string|null,input:CheckoutInput,idempotencyKey:string){
  return db.$transaction(async tx=>{
    const existing=await tx.order.findFirst({where:{userId,idempotencyKey},include:{items:true,payment:true,shipment:true}});
    if(existing) return existing;

    const address=input.guestAddress ?? (userId&&input.addressId ? await tx.address.findFirst({where:{id:input.addressId,userId}}) : null);
    if(!address) throw new Error("Delivery address not found.");

    const ids=[...new Set(input.items.map(x=>x.productId))];
    const products=await tx.product.findMany({where:{id:{in:ids},isPublished:true},include:{variants:{include:{inventory:true}},inventory:true}});
    const byId=new Map(products.map(p=>[p.id,p]));
    let subtotal=new Prisma.Decimal(0);
    const orderItems:{productId:string;variantId?:string;productName:string;sku:string;quantity:number;unitPrice:Prisma.Decimal;totalPrice:Prisma.Decimal}[]=[];

    for(const line of input.items){
      const p=byId.get(line.productId);
      if(!p) throw new Error("One or more products are unavailable.");
      const v=line.variantId?p.variants.find(x=>x.id===line.variantId):undefined;
      if(line.variantId&&!v) throw new Error("Invalid product variant.");
      if(!line.variantId && p.variants.length) throw new Error(`Please select an option for ${p.name}.`);
      const inv=v?.inventory??p.inventory;
      if(!inv) throw new Error(`Product ${p.name} is out of stock.`);
      const unit=v?.price??p.price;
      const updated=await tx.inventory.updateMany({where:{id:inv.id,available:{gte:line.quantity}},data:{available:{decrement:line.quantity},reserved:{increment:line.quantity}}});
      if(updated.count!==1) throw new Error(`Insufficient stock for ${p.name}.`);
      const lineTotal=unit.mul(line.quantity); subtotal=subtotal.add(lineTotal);
      orderItems.push({productId:p.id,variantId:v?.id,productName:p.name,sku:v?.sku??p.sku,quantity:line.quantity,unitPrice:unit,totalPrice:lineTotal});
    }

    let discount=new Prisma.Decimal(0); let couponId:string|undefined;
    if(input.couponCode){
      const coupon=await tx.coupon.findFirst({where:{code:input.couponCode.toUpperCase(),isActive:true}});
      const now=new Date();
      if(!coupon || (coupon.startsAt&&coupon.startsAt>now) || (coupon.endsAt&&coupon.endsAt<now)) throw new Error("Coupon is invalid or expired.");
      if(coupon.minOrder&&subtotal.lt(coupon.minOrder)) throw new Error("Order total does not meet the coupon minimum.");
      if(userId){const prior=await tx.couponUsage.findFirst({where:{couponId:coupon.id,userId}});if(prior) throw new Error("You have already used this coupon.");}
      if(coupon.usageLimit!==null&&coupon.usedCount>=coupon.usageLimit) throw new Error("Coupon usage limit reached.");
      if(coupon.type==="PERCENTAGE") discount=subtotal.mul(coupon.value).div(100);
      else discount=coupon.value;
      if(coupon.maxDiscount) discount=Prisma.Decimal.min(discount,coupon.maxDiscount);
      discount=Prisma.Decimal.min(discount,subtotal); couponId=coupon.id;
    }

    const shippingFee=calculateShippingFee(address.district);
    if(shippingFee.lt(0)) throw new Error("Invalid shipping fee.");
    const total=subtotal.sub(discount).add(shippingFee);
    const order=await tx.order.create({data:{
      orderNumber:`ZLX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
      idempotencyKey,userId,addressId:userId&&input.addressId?input.addressId:null,
      recipientName:address.recipientName,recipientPhone:address.phone,division:address.division,district:address.district,area:address.area,addressLine:address.addressLine,postalCode:address.postalCode,
      status:OrderStatus.PENDING,paymentMethod:input.paymentMethod as PaymentMethod,
      subtotal,discount,shippingFee,tax:money(0),total,
      items:{create:orderItems.map(x=>({...x}))},
      payment:{create:{method:input.paymentMethod as PaymentMethod,status:PaymentStatus.PENDING,amount:total}},
      shipment:{create:{status:ShipmentStatus.PENDING,deliveryFee:shippingFee}},
      statusHistory:{create:{toStatus:OrderStatus.PENDING,note:"Order created"}},
      ...(couponId?{couponUsage:{create:{couponId,userId,discount}}}:{}),
    },include:{items:true,payment:true,shipment:true}});
    if(couponId) await tx.coupon.update({where:{id:couponId},data:{usedCount:{increment:1}}});
    if(userId){await tx.cart.updateMany({where:{userId},data:{updatedAt:new Date()}});await tx.cartItem.deleteMany({where:{cart:{userId}}});}
    return order;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
