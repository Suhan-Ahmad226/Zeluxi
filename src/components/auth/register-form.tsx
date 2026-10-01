"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/auth/browser";

export function RegisterForm() {
  const router=useRouter(); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.auth.signUp({email,password,options:{data:{name}}});if(error)setError(error.message);else if(data.session)router.replace("/account");else setMessage("Check your email to confirm your account.");setBusy(false);}
  return <form onSubmit={submit} className="mt-6 space-y-4"><Input name="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" required/><Input type="email" name="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required/><Input type="password" name="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required minLength={8}/>{error?<p role="alert" className="text-sm text-red-600">{error}</p>:null}{message?<p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>:null}<Button className="w-full" disabled={busy}>{busy?"Creating…":"Create account"}</Button></form>;
}
