import {db} from "@/lib/db/client";
import {Prisma} from "@prisma/client";

export type CheckoutLine={productId:string;variantId?:string;quantity:number};
export async function calculateCheckout(lines:CheckoutLine, shippingFee=new Prisma.Decimal(0), discount=new Prisma.Decimal(0)){
  return calculateCheckoutMany([lines],shippingFee,discount);
}
export async function calculateCheckoutMany(lines:CheckoutLine[],shippingFee=new Prisma.Decimal(0),discount=new Prisma.Decimal(0)){
  if(!lines.length) throw new Error("Cart is empty.");
  const products=await db.product.findMany({where:{id:{in:lines.map(x=>x.productId)},isPublished:true},include:{inventory:true,variants:true}});
  const byId=new Map(products.map(p=>[p.id,p]));
  let subtotal=new Prisma.Decimal(0);
  for(const line of lines){
    if(!Number.isInteger(line.quantity)||line.quantity<1) throw new Error("Invalid quantity.");
    const p=byId.get(line.productId); if(!p) throw new Error("Product unavailable.");
    const variant=line.variantId?p.variants.find(v=>v.id===line.variantId):undefined;
    if(line.variantId&&!variant) throw new Error("Invalid variant.");
    const stock=variant?await db.inventory.findUnique({where:{variantId:variant.id}}):p.inventory;
    if(!stock||stock.available<line.quantity) throw new Error(`Insufficient stock for ${p.name}.`);
    subtotal=subtotal.add((variant?.price??p.price).mul(line.quantity));
  }
  if(discount.lt(0)||shippingFee.lt(0)) throw new Error("Invalid checkout adjustment.");
  const safeDiscount=Prisma.Decimal.min(discount,subtotal);
  const total=subtotal.sub(safeDiscount).add(shippingFee);
  return {subtotal,discount:safeDiscount,shippingFee,tax:new Prisma.Decimal(0),total};
}