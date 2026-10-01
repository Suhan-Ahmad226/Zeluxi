import {NextResponse} from "next/server";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {addCartItem,getOrCreateCart} from "@/modules/cart/service";
import {cartItemSchema} from "@/lib/validation/commerce";
async function user(){return getCurrentLocalUser();}
export async function GET(){const u=await user();if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json(await getOrCreateCart(u.id));}
export async function POST(req:Request){const u=await user();if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=cartItemSchema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Invalid request",details:parsed.error.flatten()},{status:400});try{return NextResponse.json(await addCartItem(u.id,parsed.data),{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update cart"},{status:409});}}