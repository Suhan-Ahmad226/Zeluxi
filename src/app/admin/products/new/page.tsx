import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { ProductForm } from "@/components/admin/product-form";
export default async function NewProductPage(){const u=await getCurrentLocalUser();if(!u)redirect("/login?next=/admin/products/new");if(u.role!=="ADMIN")redirect("/account");return <main className="mx-auto max-w-4xl px-4 py-8"><h1 className="mb-6 text-3xl font-bold">Add product</h1><ProductForm/></main>}