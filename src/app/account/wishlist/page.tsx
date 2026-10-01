import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
import {WishlistList} from "@/components/account/wishlist-list";
export default async function WishlistPage(){
 const user=await getCurrentLocalUser();if(!user)redirect("/login?next=/account/wishlist");
 const items=await db.wishlistItem.findMany({where:{userId:user.id},include:{product:{include:{images:{orderBy:{sortOrder:"asc"}},inventory:true}}},orderBy:{createdAt:"desc"}});
 return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-10 sm:py-14"><p className="text-sm font-semibold text-indigo-600">My account</p><h1 className="mt-1 text-3xl font-bold">Wishlist</h1><p className="mt-2 text-sm text-slate-600">Save products you want to come back to.</p><WishlistList items={items}/></main>;
}