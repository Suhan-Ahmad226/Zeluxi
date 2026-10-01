import {NextResponse} from "next/server";
import {db} from "@/lib/db/client";
import {PaymentStatus,Prisma} from "@prisma/client";
import {markPaymentPaid,markPaymentFailed} from "@/modules/payments/service";
import {z} from "zod";

const schema=z.object({
  provider:z.string().min(1),
  providerReference:z.string().min(1),
  amount:z.coerce.number().nonnegative().optional(),
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
    const existing=await db.webhookEvent.findUnique({where:{provider_eventId:{provider:data.provider,eventId:data.eventId}}});
    if(existing?.processedAt)return NextResponse.json({ok:true,duplicate:true});
    if(!existing){
      try{ await db.webhookEvent.create({data:{provider:data.provider,eventId:data.eventId,payload:data}}); }
      catch(error){ const duplicate=await db.webhookEvent.findUnique({where:{provider_eventId:{provider:data.provider,eventId:data.eventId}}}); if(duplicate?.processedAt)return NextResponse.json({ok:true,duplicate:true}); }
    }

    const target=await db.payment.findFirst({where:{providerReference:data.providerReference},include:{order:true}});
    if(!target)throw new Error("Payment not found");
    if(target.provider && target.provider!==data.provider)throw new Error("Payment provider mismatch");
    if(data.amount!==undefined && new Prisma.Decimal(data.amount).neq(target.amount))throw new Error("Payment amount mismatch");
    if(data.status==="PAID"){
      const payment=await markPaymentPaid(data.providerReference);
      await db.webhookEvent.update({
        where:{provider_eventId:{provider:data.provider,eventId:data.eventId}},
        data:{processedAt:new Date()}
      });
      return NextResponse.json({ok:true,status:payment.status});
    }

    const payment=data.status==="FAILED"?await markPaymentFailed(data.providerReference):await db.payment.findFirst({where:{providerReference:data.providerReference}});
    if(!payment)throw new Error("Payment not found");
    const next=data.status==="FAILED"?PaymentStatus.FAILED:PaymentStatus.PENDING;
    if(data.status!=="FAILED")await db.payment.update({where:{id:payment.id},data:{status:next,provider:data.provider,providerReference:data.providerReference}});
    await db.webhookEvent.update({
      where:{provider_eventId:{provider:data.provider,eventId:data.eventId}},
      data:{processedAt:new Date()}
    });
    return NextResponse.json({ok:true,status:next});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"Webhook failed"},{status:409});
  }
}
