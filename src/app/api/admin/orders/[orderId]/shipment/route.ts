import {NextResponse} from "next/server";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {bookOrderShipment} from "@/modules/shipping/booking";
export async function POST(_req:Request,{params}:{params:Promise<{orderId:string}>}){
  const user=await getCurrentLocalUser();
  if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
  try{return NextResponse.json(await bookOrderShipment(user.id,(await params).orderId),{status:201});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to book shipment."},{status:409});}
}