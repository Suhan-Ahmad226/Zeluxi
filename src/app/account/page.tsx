import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";

export default async function AccountPage(){
  const user=await getCurrentLocalUser();
  if(!user)redirect("/login?next=/account");
  const [orders,wishlist,notifications]=await Promise.all([
    db.order.count({where:{userId:user.id}}),
    db.wishlistItem.count({where:{userId:user.id}}),
    db.notification.count({where:{userId:user.id,readAt:null}})
  ]);
  const cards=[
    ["/account/orders","Orders",orders+" order"+(orders===1?"":"s")],
    ["/account/addresses","Addresses","Manage delivery addresses"],
    ["/account/wishlist","Wishlist",wishlist+" saved item"+(wishlist===1?"":"s")],
    ["/account/reviews","Reviews","Your product reviews"],
    ["/account/notifications","Notifications",notifications?notifications+" unread":"You are all caught up"],
    ["/account/settings","Settings","Account preferences"]
  ];
  return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-10 sm:py-14">
    <p className="text-sm font-semibold text-indigo-600">My account</p>
    <h1 className="mt-1 text-3xl font-bold">Welcome{user.name ? ", "+user.name : ""}</h1>
    <p className="mt-2 text-slate-600">{user.email}</p>
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([href,title,description])=><Link key={href} href={href} className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:bg-slate-50"><b>{title}</b><p className="mt-1 text-sm text-slate-600">{description}</p></Link>)}</div>
  </main>;
}