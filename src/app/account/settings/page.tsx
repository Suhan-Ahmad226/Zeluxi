import {redirect} from "next/navigation";
import {getCurrentLocalUser} from "@/lib/auth/current-user";
import {ProfileForm} from "@/components/account/profile-form";
export default async function SettingsPage(){
 const user=await getCurrentLocalUser(); if(!user)redirect("/login?next=/account/settings");
 return <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:py-14"><p className="text-sm font-semibold text-indigo-600">My account</p><h1 className="mt-1 text-3xl font-bold">Account settings</h1><section className="mt-6 rounded-2xl border bg-white p-6"><p className="text-sm text-slate-500">Signed-in email</p><p className="mt-1 font-semibold">{user.email}</p><ProfileForm name={user.name||""} phone={user.phone||""}/><p className="mt-6 text-xs text-slate-500">Authentication and sessions are managed securely by Supabase.</p></section></main>;
}