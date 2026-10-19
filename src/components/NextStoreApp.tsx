'use client';

import App from '@/src/App';
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';

/**
 * Client interaction boundary for the existing store features. The component
 * is intentionally imported directly so Next.js can prerender the initial UI;
 * browser-persisted state is restored by StoreProvider after hydration.
 */
export default function NextStoreApp({ initialView = 'store', productSlug }: { initialView?: 'store' | 'shop' | 'tracking' | 'account' | 'admin' | 'about' | 'verify-email' | 'product'; productSlug?: string }) {
  return <ErrorBoundary><App initialView={initialView} productSlug={productSlug} /></ErrorBoundary>;
}
