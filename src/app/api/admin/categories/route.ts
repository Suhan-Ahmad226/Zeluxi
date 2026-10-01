import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
const schema=z.object({name:z.string().trim().min(2).max(120),slug:z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),description:z.string().max(500).optional(),imageUrl:z.string().url().optional(),isActive:z.boolean().optional()});
async function admin(){const u=await getCurrentLocalUser();return u?.role==="ADMIN";}
export async function GET(){if(!await admin())return NextResponse.json({error:"Forbidden"},{status:403});return NextResponse.json(await db.category.findMany({orderBy:{createdAt:"desc"}}));}
export async function POST(req:Request){if(!await admin())return NextResponse.json({error:"Forbidden"},{status:403});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:p.error.issues[0]?.message||"Invalid category"},{status:400});try{return NextResponse.json(await db.category.create({data:{...p.data,description:p.data.description??null,imageUrl:p.data.imageUrl??null}}),{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create category"},{status:409});}}
