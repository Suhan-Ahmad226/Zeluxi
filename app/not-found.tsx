'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [storeName, setStoreName] = useState('Store');

  useEffect(() => {
    let active = true;

    fetch('/api/content', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const configuredName = payload?.content?.settings?.storeName;
        if (active && typeof configuredName === 'string' && configuredName.trim()) {
          setStoreName(configuredName.trim().slice(0, 120));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center text-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">404 · Page not found</p>
      <h1 className="text-3xl font-semibold">This page is not here.</h1>
      <p className="max-w-md text-sm text-slate-600">The page may have moved or the address may be incorrect.</p>
      <Link href="/" aria-label={`Back to ${storeName} home`} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
        Back to {storeName}
      </Link>
    </main>
  );
}
