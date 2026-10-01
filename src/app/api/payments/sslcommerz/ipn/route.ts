import {NextResponse} from "next/server";
import {db} from "@/lib/db/client";
import {markPaymentFailed,markPaymentPaid} from "@/modules/payments/service";
import {Prisma} from "@prisma/client";
async function validate(valId:string){const id=process.env.SSLCOMMERZ_STORE_ID,pass=process.env.SSLCOMMERZ_STORE_PASSWORD;if(!id||!pass)throw new Error("Payment gateway is not configured.");const base=process.env.SSLCOMMERZ_LIVE==="true"?"https://securepay.sslcommerz.com":"https://sandbox.sslcommerz.com";const q=new URLSearchParams({val_id:valId,store_id:id,store_passwd:pass,format:"json"});const r=await fetch(`${base}/validator/api/validationserverAPI.php?${q}`,{cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Payment validation failed.");return d}
export async function POST(req:Request){
 const form=await req.formData();const tranId=String(form.get("tran_id")||"");const valId=String(form.get("val_id")||"");const status=String(form.get("status")||"");if(!tranId||!status)return NextResponse.json({error:"Invalid IPN."},{status:400});
 try{
  const payment=await db.payment.findFirst({where:{provider:"SSLCOMMERZ",providerReference:tranId},include:{order:true}});if(!payment)throw new Error("Payment not found.");
  if(status==="VALID"||status==="VALIDATED"){
   if(!valId)throw new Error("Missing validation ID.");const verified=await validate(valId);const verifiedStatus=String(verified.status);const amount=new Prisma.Decimal(String(verified.amount||"0"));if(!["VALID","VALIDATED"].includes(verifiedStatus)||String(verified.tran_id)!==tranId||Number(amount) !== Number(payment.amount)||String(verified.currency_type||"BDT")!=="BDT")throw new Error("Payment validation mismatch.");
   await markPaymentPaid(tranId);
  }else if(["FAILED","CANCELLED","EXPIRED","UNATTEMPTED"].includes(status)){await markPaymentFailed(tranId)}
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"IPN failed"},{status:409})}
}