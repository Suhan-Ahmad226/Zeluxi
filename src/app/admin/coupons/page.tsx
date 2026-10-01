import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
import {CouponManager} from "@/components/admin/coupon-manager";
export default async function CouponsPage(){const u=await getCurrentLocalUser();if(!u)redirect("/login?next=/admin/coupons");if(u.role!=="ADMIN")redirect("/account");const coupons=await db.coupon.findMany({orderBy:{createdAt:"desc"}});return <main className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-bold">Coupons</h1><p className="mt-2 text-sm text-slate-500">Create, activate, deactivate and manage discount codes.</p><div className="mt-6"><CouponManager initial={coupons.map(c=>({...c,value:c.value.toString(),minOrder:c.minOrder?.toString()??null,maxDiscount:c.maxDiscount?.toString()??null}))}/></div></main>}
