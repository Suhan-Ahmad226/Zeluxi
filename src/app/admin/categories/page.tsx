import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
import {CategoryManager} from "@/components/admin/category-manager";
export default async function CategoriesPage(){
 const u=await getCurrentLocalUser(); if(!u)redirect("/login?next=/admin/categories"); if(u.role!=="ADMIN")redirect("/account");
 const categories=await db.category.findMany({orderBy:{createdAt:"desc"},include:{_count:{select:{products:true}}}});
 return <main className="mx-auto max-w-5xl px-4 py-8"><h1 className="text-3xl font-bold">Categories</h1><p className="mt-2 text-sm text-slate-500">Create and manage storefront categories.</p><div className="mt-6"><CategoryManager initial={categories}/></div></main>;
}
