import {createHash} from "node:crypto";
import {Prisma,PaymentMethod,OrderStatus,ShipmentStatus,PaymentStatus} from "@prisma/client";
import {db} from "@/lib/db/client";
import type {CheckoutInput} from "@/lib/validation/commerce";
import {getCourierProvider} from "@/modules/shipping/registry";

const createGuestCartHash=(token:string)=>createHash("sha256").update(token).digest("hex");

const money=(n:Prisma.Decimal.Value)=>new Prisma.Decimal(n);


export async function createOrder(userId:string|null,input:CheckoutInput,idempotencyKey:string,guestCartToken?:string,guestOrderAccessToken?:string){
  return db.$transaction(async tx=>{
    const existing=await tx.order.findFirst({where:{idempotencyKey},include:{items:true,payment:true,shipment:true}});
    if(existing) return existing;

    const address=input.guestAddress ?? (userId&&input.addressId ? await tx.address.findFirst({where:{id:input.addressId,userId}}) : null);
    if(!address) throw new Error("Delivery address not found.");

    const authoritativeItems=userId
      ? ((await tx.cart.findUnique({where:{userId},include:{items:true}}))?.items.map(x=>({productId:x.productId,variantId:x.variantId??undefined,quantity:x.quantity}))??[])
      : (guestCartToken?((await tx.cart.findUnique({where:{guestTokenHash:createGuestCartHash(guestCartToken)},include:{items:true}}))?.items.map(x=>({productId:x.productId,variantId:x.variantId??undefined,quantity:x.quantity}))??[]):[]);
    if(!authoritativeItems.length) throw new Error("Cart is empty.");
    if(authoritativeItems.length!==input.items.length || authoritativeItems.some((x,i)=>input.items[i]?.productId!==x.productId || input.items[i]?.variantId!==x.variantId || input.items[i]?.quantity!==x.quantity)) throw new Error("Cart changed. Please review your cart and try again.");
    const ids=[...new Set(authoritativeItems.map(x=>x.productId))];
    const products=await tx.product.findMany({where:{id:{in:ids},isPublished:true},include:{variants:{include:{inventory:true}},inventory:true}});
    const byId=new Map(products.map(p=>[p.id,p]));
    let subtotal=new Prisma.Decimal(0);
    const orderItems:{productId:string;variantId?:string;productName:string;sku:string;quantity:number;unitPrice:Prisma.Decimal;totalPrice:Prisma.Decimal}[]=[];

    for(const line of authoritativeItems){
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

    if(!userId && !guestOrderAccessToken) throw new Error("Guest order access token is required.");

    const courier=getCourierProvider();
    const quote=await courier.calculatePrice({address:{division:address.division,district:address.district,area:address.area,addressLine:address.addressLine},weightGrams:authoritativeItems.reduce((sum,line)=>sum+(byId.get(line.productId)?.weightGrams??0)*line.quantity,0)});
    const shippingFee=money(quote.fee);
    if(shippingFee.lt(0)) throw new Error("Invalid shipping fee.");
    const total=subtotal.sub(discount).add(shippingFee);
    const order=await tx.order.create({data:{
      orderNumber:`ZLX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
      guestAccessTokenHash:!userId&&guestOrderAccessToken?createGuestCartHash(guestOrderAccessToken):null,
      idempotencyKey,userId,addressId:userId&&input.addressId?input.addressId:null,
      recipientName:address.recipientName,recipientPhone:address.phone,division:address.division,district:address.district,area:address.area,addressLine:address.addressLine,postalCode:address.postalCode,
      status:OrderStatus.PENDING,paymentMethod:input.paymentMethod as PaymentMethod,
      subtotal,discount,shippingFee,tax:money(0),total,
      items:{create:orderItems.map(x=>({...x}))},
      payment:{create:{method:input.paymentMethod as PaymentMethod,status:PaymentStatus.PENDING,amount:total,provider:input.paymentMethod==="COD"?"MANUAL":null,providerReference:input.paymentMethod==="COD"?`COD-${idempotencyKey}`:null}},
      shipment:{create:{status:ShipmentStatus.PENDING,provider:quote.provider,deliveryFee:shippingFee}},
      statusHistory:{create:{toStatus:OrderStatus.PENDING,note:"Order created"}},
      ...(couponId?{couponUsage:{create:{couponId,userId,discount}}}:{}),
    },include:{items:true,payment:true,shipment:true}});
    if(couponId){const claimed=await tx.coupon.updateMany({where:{id:couponId,isActive:true,OR:[{usageLimit:null},{usedCount:{lt:coupon.usageLimit!}}]},data:{usedCount:{increment:1}}});if(claimed.count!==1)throw new Error("Coupon usage limit reached.");}
    if(userId){await tx.cartItem.deleteMany({where:{cart:{userId}}});}
    else if(guestCartToken){await tx.cartItem.deleteMany({where:{cart:{guestTokenHash:createGuestCartHash(guestCartToken)}}});}
    return order;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
