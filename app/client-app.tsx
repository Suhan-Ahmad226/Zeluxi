'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const StorefrontApp = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#FAFAFA] text-slate-900">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <span className="text-xl font-semibold tracking-[0.24em]">ZELUX</span>
        <span className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-slate-900" />
        </span>
        <span className="text-xs text-slate-500">Preparing your shopping experience…</span>
      </div>
    </main>
  ),
});

export default function ClientApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // PWA enhancement is optional; the storefront remains usable without a service worker.
      });
    }
  }, []);

  return <StorefrontApp />;
}
