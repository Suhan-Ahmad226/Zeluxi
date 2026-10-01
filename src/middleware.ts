import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {checkRateLimit} from "@/lib/security/rate-limit";
const PUBLIC_EXEMPT=new Set(["/api/health","/api/payments/webhook","/api/webhooks/pathao"]);
export async function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 if(path.startsWith("/account")||path.startsWith("/admin")||path.startsWith("/checkout")){const response=NextResponse.next();response.headers.set("Cache-Control","private, no-store, max-age=0");response.headers.set("X-Robots-Tag","noindex, nofollow");return response;}\n if(path.startsWith("/api/")){
   const origin=req.headers.get("origin");
   if(origin){try{if(new URL(origin).origin!==req.nextUrl.origin)return NextResponse.json({error:"Cross-origin request blocked."},{status:403})}catch{return NextResponse.json({error:"Invalid origin."},{status:403})}}
   if(!PUBLIC_EXEMPT.has(path)){const rl=await checkRateLimit(clientKey(req),120);if(!rl.allowed){return NextResponse.json({error:"Too many requests. Please try again later."},{status:429,headers:{"Retry-After":"60"}})}}
 }
 return NextResponse.next();
}
function clientKey(req:NextRequest){const ip=(req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();return ip+":"+req.nextUrl.pathname}
export const config={matcher:["/api/:path*"]};