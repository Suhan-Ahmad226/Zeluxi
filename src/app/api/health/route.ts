import {NextResponse} from "next/server";
import {db} from "@/lib/db/client";
export async function GET(){
  const started=Date.now();
  try{
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({status:"ok",database:"ok",latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({status:"error",database:"unavailable",latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{status:503,headers:{"cache-control":"no-store"}});
  }
}
