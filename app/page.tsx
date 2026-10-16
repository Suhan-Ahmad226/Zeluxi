'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';

const StoreApp = dynamic(() => import('@/src/App'), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-[60vh] place-items-center bg-[#FAFAFA] text-slate-600">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
        <span className="text-sm">Loading Zelux…</span>
      </div>
    </main>
  ),
});

export default function HomePage() {
  return <ErrorBoundary><StoreApp /></ErrorBoundary>;
}
