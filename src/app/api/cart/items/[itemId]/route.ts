import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {removeCartItem,updateCartItem,hashGuestCartToken} from "@/modules/cart/service";
import {db} from "@/lib/db/client";
export async function PATCH(req:Request,{params}:{params:Promise<{itemId:string}>}){
 const id=(await params).itemId;const body=await req.json().catch(()=>null);
 if(!Number.isInteger(body?.quantity)||body.quantity<1)return NextResponse.json({error:"Invalid quantity"},{status:400});
 const u=await getCurrentLocalUser();
 try{
  if(u)return NextResponse.json(await updateCartItem(u.id,id,body.quantity));
  const token=(await cookies()).get("zelux_guest_cart")?.value;if(!token)return NextResponse.json({error:"Cart not found"},{status:404});
  const item=await db.cartItem.findFirst({where:{id,cart:{guestTokenHash:hashGuestCartToken(token)}},include:{product:{include:{inventory:true}},variant:{include:{inventory:true}}}});
  if(!item)return NextResponse.json({error:"Cart item not found"},{status:404});
  const stock=item.variant?.inventory?.available??item.product.inventory?.available??0;
  if(body.quantity>stock)return NextResponse.json({error:"Requested quantity exceeds available stock."},{status:409});
  return NextResponse.json(await db.cartItem.update({where:{id},data:{quantity:body.quantity}}));
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update item"},{status:409})}
}
export async function DELETE(_:Request,{params}:{params:Promise<{itemId:string}>}){
 const id=(await params).itemId;const u=await getCurrentLocalUser();
 try{
  if(u){await removeCartItem(u.id,id);return new NextResponse(null,{status:204});}
  const token=(await cookies()).get("zelux_guest_cart")?.value;if(!token)return NextResponse.json({error:"Cart not found"},{status:404});
  const r=await db.cartItem.deleteMany({where:{id,cart:{guestTokenHash:hashGuestCartToken(token)}}});
  if(!r.count)return NextResponse.json({error:"Cart item not found"},{status:404});
  return new NextResponse(null,{status:204});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to remove item"},{status:404})}
}