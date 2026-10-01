import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {randomBytes} from "node:crypto";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {addCartItem,addGuestCartItem,getOrCreateCart,getOrCreateGuestCart} from "@/modules/cart/service";
import {cartItemSchema} from "@/lib/validation/commerce";
async function guestToken(){const jar=await cookies();let token=jar.get("zelux_guest_cart")?.value;if(!token){token=randomBytes(32).toString("hex");jar.set("zelux_guest_cart",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});}return token;}
export async function GET(){const u=await getCurrentLocalUser();if(u)return NextResponse.json(await getOrCreateCart(u.id));return NextResponse.json(await getOrCreateGuestCart(await guestToken()));}
export async function POST(req:Request){const parsed=cartItemSchema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid request",details:parsed.error.flatten()},{status:400});try{const u=await getCurrentLocalUser();if(u)return NextResponse.json(await addCartItem(u.id,parsed.data),{status:201});return NextResponse.json(await addGuestCartItem(await guestToken(),parsed.data),{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update cart"},{status:409});}}