import {NextResponse} from "next/server";
import {db} from "@/lib/db/client";
import {PaymentStatus} from "@prisma/client";
import {markPaymentPaid} from "@/modules/payments/service";
import {z} from "zod";

const schema=z.object({
  provider:z.string().min(1),
  providerReference:z.string().min(1),
  status:z.enum(["PENDING","PAID","FAILED"]),
  eventId:z.string().min(1).max(200)
});

export async function POST(req:Request){
  const secret=process.env.PAYMENT_WEBHOOK_SECRET;
  if(!secret)return NextResponse.json({error:"Payment webhook is not configured"},{status:503});
  if(req.headers.get("x-payment-webhook-secret")!==secret)return NextResponse.json({error:"Unauthorized"},{status:401});
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid webhook payload"},{status:400});
  const data=parsed.data;
  try{
    try{
      await db.webhookEvent.create({data:{provider:data.provider,eventId:data.eventId,payload:data}});
    }catch(error){
      const duplicate=await db.webhookEvent.findUnique({where:{provider_eventId:{provider:data.provider,eventId:data.eventId}}});
      if(duplicate)return NextResponse.json({ok:true,duplicate:true});
      throw error;
    }

    if(data.status==="PAID"){
      const payment=await markPaymentPaid(data.providerReference);
      await db.webhookEvent.update({
        where:{provider_eventId:{provider:data.provider,eventId:data.eventId}},
        data:{processedAt:new Date()}
      });
      return NextResponse.json({ok:true,status:payment.status});
    }

    const payment=await db.payment.findFirst({where:{providerReference:data.providerReference}});
    if(!payment)throw new Error("Payment not found");
    const next=data.status==="FAILED"?PaymentStatus.FAILED:PaymentStatus.PENDING;
    await db.payment.update({where:{id:payment.id},data:{status:next,provider:data.provider,providerReference:data.providerReference}});
    await db.webhookEvent.update({
      where:{provider_eventId:{provider:data.provider,eventId:data.eventId}},
      data:{processedAt:new Date()}
    });
    return NextResponse.json({ok:true,status:next});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"Webhook failed"},{status:409});
  }
}
