import {createHash} from "node:crypto";
import {db} from "@/lib/db/client";

export async function getOrCreateCart(userId:string){
  return db.cart.upsert({where:{userId},create:{userId},update:{},include:{items:{include:{product:{include:{images:true,inventory:true}},variant:{include:{inventory:true}}}}}});
}

export async function addCartItem(userId:string,input:{productId:string;variantId?:string;quantity:number}){
  if(input.quantity<1) throw new Error("Quantity must be at least 1.");
  return db.$transaction(async tx=>{
    const product=await tx.product.findFirst({where:{id:input.productId,isPublished:true},include:{inventory:true,variants:true}});
    if(!product) throw new Error("Product not found.");
    if(input.variantId && !product.variants.some(v=>v.id===input.variantId)) throw new Error("Invalid product variant.");
    const inventory=input.variantId
      ? await tx.inventory.findUnique({where:{variantId:input.variantId}})
      : product.inventory;
    if(!inventory || inventory.available<input.quantity) throw new Error("Insufficient stock.");
    const cart=await tx.cart.upsert({where:{userId},create:{userId},update:{}});
    const existing=await tx.cartItem.findFirst({where:{cartId:cart.id,productId:input.productId,variantId:input.variantId??null}});
    const next=(existing?.quantity??0)+input.quantity;
    if(next>inventory.available) throw new Error("Requested quantity exceeds available stock.");
    return existing
      ? tx.cartItem.update({where:{id:existing.id},data:{quantity:next}})
      : tx.cartItem.create({data:{cartId:cart.id,productId:input.productId,variantId:input.variantId??null,quantity:input.quantity}});
  });
}

export async function updateCartItem(userId:string,itemId:string,quantity:number){
  if(quantity<1) throw new Error("Quantity must be at least 1.");
  return db.$transaction(async tx=>{
    const item=await tx.cartItem.findFirst({where:{id:itemId,cart:{userId}},include:{product:{include:{inventory:true}},variant:{include:{inventory:true}}}});
    if(!item) throw new Error("Cart item not found.");
    const stock=item.variant?.inventory?.available??item.product.inventory?.available??0;
    if(quantity>stock) throw new Error("Requested quantity exceeds available stock.");
    return tx.cartItem.update({where:{id:item.id},data:{quantity}});
  });
}

export async function removeCartItem(userId:string,itemId:string){
  const item=await db.cartItem.findFirst({where:{id:itemId,cart:{userId}}});
  if(!item) throw new Error("Cart item not found.");
  await db.cartItem.delete({where:{id:item.id}});
}
export function hashGuestCartToken(token:string){return createHash("sha256").update(token).digest("hex");}
export async function getOrCreateGuestCart(token:string){const hash=hashGuestCartToken(token);return db.cart.upsert({where:{guestTokenHash:hash},create:{guestTokenHash:hash},update:{},include:{items:{include:{product:{include:{images:true,inventory:true}},variant:{include:{inventory:true}}}}}});}
export async function addGuestCartItem(token:string,input:{productId:string;variantId?:string;quantity:number}){if(input.quantity<1)throw new Error("Quantity must be at least 1.");const hash=hashGuestCartToken(token);return db.$transaction(async tx=>{const product=await tx.product.findFirst({where:{id:input.productId,isPublished:true},include:{inventory:true,variants:true}});if(!product)throw new Error("Product not found.");if(input.variantId&&!product.variants.some(v=>v.id===input.variantId))throw new Error("Invalid product variant.");const inventory=input.variantId?await tx.inventory.findUnique({where:{variantId:input.variantId}}):product.inventory;if(!inventory||inventory.available<input.quantity)throw new Error("Insufficient stock.");const cart=await tx.cart.upsert({where:{guestTokenHash:hash},create:{guestTokenHash:hash},update:{}});const existing=await tx.cartItem.findFirst({where:{cartId:cart.id,productId:input.productId,variantId:input.variantId??null}});const next=(existing?.quantity??0)+input.quantity;if(next>inventory.available)throw new Error("Requested quantity exceeds available stock.");return existing?tx.cartItem.update({where:{id:existing.id},data:{quantity:next}}):tx.cartItem.create({data:{cartId:cart.id,productId:input.productId,variantId:input.variantId??null,quantity:input.quantity}});});}
