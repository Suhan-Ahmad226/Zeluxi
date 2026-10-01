import {createHash} from "node:crypto";
type Entry={count:number;resetAt:number};
const memory=new Map<string,Entry>();
const LIMIT=200;
const WINDOW=60_000;
function keyHash(value:string){return createHash("sha256").update(value).digest("hex").slice(0,32)}
async function redisCount(key:string){const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;if(!url||!token)return null;const k="zelux:rl:"+keyHash(key);const headers={Authorization:"Bearer "+token};const res=await fetch(url+"/pipeline",{method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify([["INCR",k],["EXPIRE",k,60]])});if(!res.ok)return null;const data=await res.json() as Array<{result?:number}>;return Number(data?.[0]?.result??0)}
export async function checkRateLimit(key:string,limit=LIMIT,windowMs=WINDOW){const now=Date.now();const redis=await redisCount(key);if(redis!==null)return{allowed:redis<=limit,remaining:Math.max(0,limit-redis)};const current=memory.get(key);if(!current||current.resetAt<=now){memory.set(key,{count:1,resetAt:now+windowMs});return{allowed:true,remaining:limit-1}}current.count+=1;return{allowed:current.count<=limit,remaining:Math.max(0,limit-current.count)}}
export function clientIp(req:Request){return(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"unknown").split(",")[0].trim().slice(0,80)}
