import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
import {AdminShippingTable} from "@/components/admin/admin-shipping-table";
export default async function ShippingPage(){const u=await getCurrentLocalUser();if(!u)redirect("/login?next=/admin/shipping");if(u.role!=="ADMIN")redirect("/account");const shipments=await db.shipment.findMany({orderBy:{createdAt:"desc"},take:200,include:{order:{select:{id:true,orderNumber:true,status:true}}}});return <main className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-bold">Shipping</h1><div className="mt-6"><AdminShippingTable shipments={shipments}/></div></main>}