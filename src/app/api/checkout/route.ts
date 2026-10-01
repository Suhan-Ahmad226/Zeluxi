import {NextResponse} from "next/server";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {checkoutSchema} from "@/lib/validation/commerce";
import {createOrder} from "@/modules/checkout/service";
export async function POST(req:Request){
  const user=await getCurrentLocalUser();
  
  const key=req.headers.get("x-idempotency-key")?.trim();
  if(!key||key.length<16||key.length>128)return NextResponse.json({error:"A valid idempotency key is required."},{status:400});
  const parsed=checkoutSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid checkout data",details:parsed.error.flatten()},{status:400});
  try{return NextResponse.json(await createOrder(user?.id??null,parsed.data,key),{status:201});}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create order"},{status:409});}
}