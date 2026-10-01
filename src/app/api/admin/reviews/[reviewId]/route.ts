import {NextResponse} from "next/server";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
import {z} from "zod";
const schema=z.object({isPublished:z.boolean().optional(),delete:z.boolean().optional()});
export async function POST(req:Request,{params}:{params:Promise<{reviewId:string}>}){
 const u=await getCurrentLocalUser(); if(!u||u.role!=="ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
 const form=await req.formData(); const id=(await params).reviewId;
 if(form.get("_method")==="DELETE"){await db.review.delete({where:{id}});return NextResponse.redirect(new URL("/admin/reviews",req.url));}
 const p=schema.safeParse({isPublished:form.get("isPublished")==="true"}); if(!p.success)return NextResponse.json({error:"Invalid review"},{status:400});
 await db.review.update({where:{id},data:{isPublished:p.data.isPublished}}); return NextResponse.redirect(new URL("/admin/reviews",req.url));
}
export async function PATCH(req:Request,{params}:{params:Promise<{reviewId:string}>}){const u=await getCurrentLocalUser();if(!u||u.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Invalid review"},{status:400});const id=(await params).reviewId;if(p.data.delete){await db.review.delete({where:{id}});return NextResponse.json({ok:true});}return NextResponse.json(await db.review.update({where:{id},data:{isPublished:p.data.isPublished}}));}
