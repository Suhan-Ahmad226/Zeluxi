import {Prisma} from "@prisma/client";
import type {CourierProvider,ShippingAddress,ShippingQuote} from "./contracts";

type Token={accessToken:string;refreshToken?:string;expiresAt:number};
type PathaoResponse=Record<string,any>;

const BASE_URL=()=>process.env.PATHAO_BASE_URL||"https://api-hermes.pathao.com";
let tokenCache:Token|null=null;

function required(name:string){const value=process.env[name];if(!value)throw new Error(`Missing ${name} configuration.`);return value;}
async function issueToken(grantType:"password"|"refresh_token",refreshToken?:string){
  const body=grantType==="refresh_token"
    ? {client_id:required("PATHAO_CLIENT_ID"),client_secret:required("PATHAO_CLIENT_SECRET"),refresh_token:refreshToken,grant_type:grantType}
    : {client_id:required("PATHAO_CLIENT_ID"),client_secret:required("PATHAO_CLIENT_SECRET"),username:required("PATHAO_USERNAME"),password:required("PATHAO_PASSWORD"),grant_type:grantType};
  const res=await fetch(`${BASE_URL()}/aladdin/api/v1/issue-token`,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify(body),cache:"no-store"});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data?.access_token)throw new Error(data?.message||"Pathao authentication failed.");
  tokenCache={accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+Math.max(60,Number(data.expires_in||3600)-120)*1000};
  return tokenCache.accessToken;
}
async function accessToken(){if(tokenCache&&tokenCache.expiresAt>Date.now()+5000)return tokenCache.accessToken;if(tokenCache?.refreshToken){try{return await issueToken("refresh_token",tokenCache.refreshToken)}catch{tokenCache=null}}return issueToken("password");}
async function request(path:string,init:RequestInit={},retry=true):Promise<PathaoResponse>{
  const token=await accessToken();
  const headers=new Headers(init.headers);headers.set("authorization",`Bearer ${token}`);headers.set("accept","application/json");headers.set("content-type","application/json");
  const res=await fetch(`${BASE_URL()}${path}`,{...init,headers,cache:"no-store"});
  if((res.status===401||res.status===403)&&retry){tokenCache=null;return request(path,init,false)}
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.message||`Pathao request failed (${res.status}).`);
  return data;
}
function weightKg(weightGrams?:number){return Math.min(10,Math.max(.5,(weightGrams||500)/1000));}
function manualPrice(address:ShippingAddress,weightGrams?:number){
 const kg=weightKg(weightGrams);
 const d=address.district.trim().toLowerCase();
 const isDhaka=d==="dhaka";
 const suburb=["narayanganj","gazipur","keraniganj","savar"].some(x=>d.includes(x));
 const base=isDhaka?[60,70,90]:suburb?[80,100,130]:[110,130,170];
 let fee=kg<=.5?base[0]:kg<=1?base[1]:kg<=2?base[2]:base[2]+Math.ceil(kg-2)*(isDhaka?15:25);
 return new Prisma.Decimal(fee);
}
export const pathaoCourier:CourierProvider={
  name:"PATHAO",
  async calculatePrice({address,weightGrams}):Promise<ShippingQuote>{
   return {provider:"PATHAO",fee:manualPrice(address,weightGrams),currency:"BDT",etaDays:dhakaEta(address)};
 },
  async createShipment(input){const storeId=Number(required("PATHAO_STORE_ID"));if(!Number.isInteger(storeId))throw new Error("Invalid PATHAO_STORE_ID.");if(input.recipientPhone.replace(/\\D/g,"").length!==11)throw new Error("Recipient phone must contain 11 digits.");\n    const address=input.recipientAddress.trim();if(address.length<10||address.length>220)throw new Error("Recipient address must be 10-220 characters.");\n    const data=await request("/aladdin/api/v1/orders",{method:"POST",body:JSON.stringify({store_id:storeId,merchant_order_id:input.merchantOrderId,recipient_name:input.recipientName,recipient_phone:input.recipientPhone,recipient_address:input.recipientAddress,delivery_type:48,item_type:2,item_quantity:input.itemQuantity||1,item_weight:weightKg(input.weightGrams).toString(),amount_to_collect:input.amountToCollect||0,item_description:input.itemDescription||"Zelux order",special_instruction:input.specialInstruction||undefined})});const payload=data?.data??data;const trackingId=payload?.consignment_id||payload?.consignmentId||payload?.tracking_id;if(!trackingId)throw new Error("Pathao did not return a consignment ID.");return {trackingId:String(trackingId)}},
  async getTracking(trackingId){return request(`/aladdin/api/v1/orders/${encodeURIComponent(trackingId)}/info`)},
  async cancelShipment(trackingId){await request(`/aladdin/api/v1/orders/${encodeURIComponent(trackingId)}/cancel`,{method:"POST",body:"{}"})}
};
function dhakaEta(address:ShippingAddress){const d=address.district.trim().toLowerCase();return d==="dhaka"?1:["narayanganj","gazipur","keraniganj","savar"].some(x=>d.includes(x))?3:3;}
