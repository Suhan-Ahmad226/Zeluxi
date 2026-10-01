import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { AddressForm } from "@/components/account/address-form";
import { AddressList } from "@/components/account/address-list";

export default async function AddressesPage(){
 const user=await getCurrentLocalUser();
 if(!user)redirect("/login?next=/account/addresses");
 const addresses=await db.address.findMany({where:{userId:user.id},orderBy:[{isDefault:"desc"},{createdAt:"desc"}]});
 return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-8 sm:py-12"><p className="text-sm font-semibold text-indigo-600">My account</p><h1 className="mt-1 text-3xl font-bold">Addresses</h1><p className="mt-2 text-sm text-slate-600">Manage delivery addresses for faster checkout.</p><div className="mt-7"><AddressList addresses={addresses}/></div><section className="mt-8 rounded-2xl border bg-white p-5 sm:p-6"><h2 className="font-semibold">Add address</h2><AddressForm/></section></main>;
}