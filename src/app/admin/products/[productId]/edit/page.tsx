import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({params}:{params:Promise<{productId:string}>}) {
  const u=await getCurrentLocalUser();
  const {productId}=await params;
  if(!u) redirect("/login?next=/admin/products/"+encodeURIComponent(productId)+"/edit");
  if(u.role!=="ADMIN") redirect("/account");
  const product=await db.product.findUnique({
    where:{id:productId},
    include:{images:{orderBy:{sortOrder:"asc"}},variants:{include:{inventory:true},orderBy:{sku:"asc"}}}
  });
  if(!product) redirect("/admin/products");
  return <main className="mx-auto max-w-5xl px-4 py-8">
    <div className="mb-6"><p className="text-sm font-semibold text-indigo-600">Catalog</p><h1 className="text-3xl font-bold">Edit product</h1><p className="mt-1 text-sm text-slate-500">{product.name} · {product.sku}</p></div>
    <ProductForm product={product}/>
  </main>;
}
