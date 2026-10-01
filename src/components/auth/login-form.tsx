"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/auth/browser";

export function LoginForm() {
  const router=useRouter(); const params=useSearchParams(); const next=params.get("next")||"/account";
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const supabase=createSupabaseBrowserClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);else router.replace(next);setBusy(false);}
  return <form onSubmit={submit} className="mt-6 space-y-4"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required/><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required/>{error?<p role="alert" className="text-sm text-red-600">{error}</p>:null}<Button className="w-full" disabled={busy}>{busy?"Signing in…":"Sign in"}</Button></form>;
}
