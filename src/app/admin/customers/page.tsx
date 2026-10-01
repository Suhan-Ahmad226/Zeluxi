import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
export default async function CustomersPage(){
 const u=await getCurrentLocalUser();
 if(!u) redirect("/login?next=/admin/customers");
 if(u.role!=="ADMIN") redirect("/account");
 const users=await db.user.findMany({orderBy:{createdAt:"desc"},take:200,include:{_count:{select:{orders:true,reviews:true}}}});
 return <main className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-bold">Customers</h1><div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{["Customer","Role","Orders","Reviews","Joined"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{users.map(x=><tr key={x.id} className="border-t"><td className="px-4 py-4"><b>{x.name||"Unnamed"}</b><div className="text-xs text-slate-500">{x.email}</div></td><td className="px-4 py-4">{x.role}</td><td className="px-4 py-4">{x._count.orders}</td><td className="px-4 py-4">{x._count.reviews}</td><td className="px-4 py-4">{x.createdAt.toLocaleDateString("en-BD")}</td></tr>)}</tbody></table></div></main>;
}