import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {createHash} from "node:crypto";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
import {getPaymentProvider} from "@/modules/payments/registry";
import {failPendingPaymentByOrder} from "@/modules/payments/service";
import {z} from "zod";
const schema=z.object({orderNumber:z.string().min(1).max(60),email:z.string().email().optional()});
const hash=(v:string)=>createHash("sha256").update(v).digest("hex");
export async function POST(req:Request){
 const user=await getCurrentLocalUser();const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid order."},{status:400});
 const cookie=(await cookies()).get("zelux_guest_order_access")?.value;
 const order=await db.order.findUnique({where:{orderNumber:parsed.data.orderNumber},include:{payment:true}});
 if(!order)return NextResponse.json({error:"Order not found."},{status:404});
 if(user?order.userId!==user.id:(!cookie||order.guestAccessTokenHash!==hash(cookie)))return NextResponse.json({error:"Forbidden"},{status:403});
 if(order.paymentMethod!=="ONLINE")return NextResponse.json({error:"This order does not require online payment."},{status:400});if(!user&&!parsed.data.email)return NextResponse.json({error:"Email is required for guest online payment."},{status:400});
 if(order.payment?.status==="PAID")return NextResponse.json({error:"Payment is already confirmed."},{status:409});
 const provider=getPaymentProvider(process.env.DEFAULT_PAYMENT_PROVIDER||"SSLCOMMERZ");
 let result;try{result=await provider.createPayment({orderId:order.orderNumber,amount:order.total.toString(),currency:"BDT",customerPhone:order.recipientPhone,customerName:order.recipientName,customerEmail:order.userId?(user?.email||"customer@zelux.local"):(parsed.data.email||"guest@zelux.local"),customerAddress:[order.addressLine,order.area,order.district,order.division].filter(Boolean).join(", "),productCategory:"ecommerce",returnUrl:(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin)+"/api/payments/sslcommerz/callback",cancelUrl:(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin)+"/payment/callback"});
 await db.payment.update({where:{orderId:order.id},data:{provider:result.provider,providerReference:result.providerReference}});
 return NextResponse.json({gatewayUrl:result.gatewayUrl,provider:result.provider});
 }catch(error){try{await failPendingPaymentByOrder(order.id)}catch{};return NextResponse.json({error:error instanceof Error?error.message:"Unable to initiate payment."},{status:502});}
}