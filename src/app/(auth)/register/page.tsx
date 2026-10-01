import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
export default function RegisterPage(){return <main className="grid min-h-[75vh] place-items-center px-4 py-12"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold">Create account</h1><RegisterForm/><p className="mt-5 text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-indigo-600" href="/login">Sign in</Link></p></div></main>}
