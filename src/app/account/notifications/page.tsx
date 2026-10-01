import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {db} from "@/lib/db/client";
import {NotificationList} from "@/components/account/notification-list";
export default async function NotificationsPage(){
 const user=await getCurrentLocalUser();if(!user)redirect("/login?next=/account/notifications");
 const notifications=await db.notification.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:50});
 return <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:py-14"><p className="text-sm font-semibold text-indigo-600">My account</p><h1 className="mt-1 text-3xl font-bold">Notifications</h1><p className="mt-2 text-sm text-slate-600">Order and account updates appear here.</p><NotificationList items={notifications}/></main>;
}