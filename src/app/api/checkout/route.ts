import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {checkoutSchema} from "@/lib/validation/commerce";
import {createOrder} from "@/modules/checkout/service";
export async function POST(req:Request){
  const user=await getCurrentLocalUser();
  
  const key=req.headers.get("x-idempotency-key")?.trim();
  if(!key||key.length<16||key.length>128)return NextResponse.json({error:"A valid idempotency key is required."},{status:400});
  const parsed=checkoutSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid checkout data",details:parsed.error.flatten()},{status:400});
  try{const order=await createOrder(user?.id??null,parsed.data,key);const response=NextResponse.json(order,{status:201});if(!user&&parsed.data.guestAddress){(await cookies()).set("zelux_guest_phone",parsed.data.guestAddress.phone,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});}return response;}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create order"},{status:409});}
}