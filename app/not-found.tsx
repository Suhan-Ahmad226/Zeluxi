import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center text-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">404 · Page not found</p>
      <h1 className="text-3xl font-semibold">This page is not here.</h1>
      <p className="max-w-md text-sm text-slate-600">The page may have moved or the address may be incorrect.</p>
      <Link href="/" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Back to Zelux</Link>
    </main>
  );
}
