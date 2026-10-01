import { redirect, notFound } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { ProductForm } from "@/components/admin/product-form";
export default async function EditProductPage({params}:{params:Promise<{productId:string}>}){const u=await getCurrentLocalUser();if(!u)redirect("/login?next=/admin/products");if(u.role!=="ADMIN")redirect("/account");const p=await db.product.findUnique({where:{id:(await params).productId}});if(!p)notFound();return <main className="mx-auto max-w-4xl px-4 py-8"><h1 className="mb-6 text-3xl font-bold">Edit product</h1><ProductForm product={p}/></main>}