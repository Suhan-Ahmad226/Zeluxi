import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
export default function LoginPage(){return <main className="grid min-h-[75vh] place-items-center px-4 py-12"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold">Welcome back</h1><p className="mt-1 text-sm text-slate-600">Sign in to your Zelux account.</p><LoginForm/><p className="mt-5 text-center text-sm text-slate-600">New here? <Link className="font-semibold text-indigo-600" href="/register">Create an account</Link></p></div></main>}
