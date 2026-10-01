import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { updateProductCatalog } from "@/modules/products/service";

const imageSchema=z.object({id:z.string().optional(),url:z.string().trim().url().max(2000),altText:z.string().max(300).nullable().optional(),sortOrder:z.number().int().min(0).optional()});
const variantSchema=z.object({id:z.string().optional(),sku:z.string().trim().min(1).max(100),name:z.string().trim().min(1).max(200),attributes:z.unknown().optional(),price:z.number().positive().nullable().optional(),available:z.number().int().min(0).optional(),lowStockThreshold:z.number().int().min(0).max(100000).optional()});
const schema=z.object({
 name:z.string().trim().min(2).max(200).optional(),slug:z.string().trim().min(2).max(220).regex(/^[a-z0-9-]+$/).optional(),sku:z.string().trim().min(1).max(100).optional(),description:z.string().min(1).optional(),shortDescription:z.string().max(500).nullable().optional(),brand:z.string().max(120).nullable().optional(),price:z.coerce.number().positive().optional(),compareAtPrice:z.coerce.number().positive().nullable().optional(),costPrice:z.coerce.number().nonnegative().nullable().optional(),weightGrams:z.coerce.number().int().positive().nullable().optional(),isPublished:z.boolean().optional(),isFeatured:z.boolean().optional(),
 images:z.array(imageSchema).max(30).optional(),variants:z.array(variantSchema).max(100).optional()
});
export async function PATCH(req:Request,{params}:{params:Promise<{productId:string}>}){
 const u=await getCurrentLocalUser(); if(!u||u.role!=="ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
 const p=schema.safeParse(await req.json().catch(()=>null)); if(!p.success) return NextResponse.json({error:p.error.issues[0]?.message||"Invalid product"},{status:400});
 const {productId}=await params;
 const {images,variants,...product}=p.data;
 try{return NextResponse.json(await updateProductCatalog(productId,product,images??[],variants??[]));}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update product"},{status:409});}
}
export async function DELETE(req:Request,{params}:{params:Promise<{productId:string}>}){const u=await getCurrentLocalUser();if(!u||u.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});try{const {db}=await import("@/lib/db/client");const id=(await params).productId;const product=await db.product.findUnique({where:{id},include:{orderItems:true,cartItems:true,wishlistItems:true}});if(!product)return NextResponse.json({error:"Product not found"},{status:404});if(product.orderItems.length||product.cartItems.length||product.wishlistItems.length)return NextResponse.json({error:"Product has historical or active references; unpublish it instead of deleting."},{status:409});await db.product.delete({where:{id}});return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to delete product"},{status:409});}}
