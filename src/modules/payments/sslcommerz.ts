import type {PaymentProvider,PaymentResult} from "./contracts";
import {Prisma} from "@prisma/client";
const base=()=>process.env.SSLCOMMERZ_LIVE==="true"?"https://securepay.sslcommerz.com":"https://sandbox-gw.sslcommerz.com";
const validatorBase=()=>process.env.SSLCOMMERZ_LIVE==="true"?"https://securepay.sslcommerz.com":"https://sandbox.sslcommerz.com";
function req(name:string){const v=process.env[name];if(!v)throw new Error(`Missing ${name} configuration.`);return v;}
export class SSLCommerzProvider implements PaymentProvider{
 readonly name="SSLCOMMERZ";
 async createPayment(input:{orderId:string;amount:string;currency:"BDT";customerPhone:string;customerName:string;customerEmail:string;customerAddress:string;productCategory:string;returnUrl:string;cancelUrl:string}):Promise<PaymentResult>{
  const amount=new Prisma.Decimal(input.amount);if(amount.lt(10)||amount.gt(500000))throw new Error("Online payment amount must be between ৳10 and ৳500,000.");
  const tranId=input.orderId.slice(0,30);
  const form=new URLSearchParams({store_id:req("SSLCOMMERZ_STORE_ID"),store_passwd:req("SSLCOMMERZ_STORE_PASSWORD"),total_amount:amount.toFixed(2),currency:"BDT",tran_id:tranId,success_url:input.returnUrl,fail_url:input.cancelUrl,cancel_url:input.cancelUrl,ipn_url:input.returnUrl.replace(/\/payment\/callback\/?$/,"/api/payments/sslcommerz/ipn"),product_category:input.productCategory.slice(0,50),cus_name:input.customerName.slice(0,100),cus_email:input.customerEmail.slice(0,100),cus_phone:input.customerPhone.slice(0,20),cus_add1:input.customerAddress.slice(0,200),cus_city:"Dhaka",cus_country:"Bangladesh",shipping_method:"NO",product_name:"Zelux order",product_profile:"general"});
  const res=await fetch(`${base()}/gwprocess/v4/api.php`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form.toString(),cache:"no-store"});
  const data=await res.json().catch(()=>({}));if(!res.ok||data?.status!=="SUCCESS"||!data?.GatewayPageURL)throw new Error(data?.failedreason||data?.failedreason||"Unable to start online payment.");
  return {provider:this.name,providerReference:tranId,status:"PENDING",gatewayUrl:String(data.GatewayPageURL)};
 }
 async verifyPayment(providerReference:string){
  const params=new URLSearchParams({tran_id:providerReference,store_id:req("SSLCOMMERZ_STORE_ID"),store_passwd:req("SSLCOMMERZ_STORE_PASSWORD"),format:"json"});
  const res=await fetch(`${validatorBase()}/validator/api/merchantTransIDvalidationAPI.php?${params}`,{cache:"no-store"});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error("Unable to query payment status.");
  const status=data?.status==="VALID"||data?.status==="VALIDATED"?"PAID":data?.status==="FAILED"?"FAILED":"PENDING";return{provider:this.name,providerReference,status};
 }
}