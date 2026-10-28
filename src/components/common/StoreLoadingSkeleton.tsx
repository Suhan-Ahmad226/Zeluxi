'use client';

import React, { useEffect, useState } from 'react';

type StoreLoadingSkeletonProps = {
  variant?: 'store' | 'admin';
};

/**
 * Minimal branded loading state for deferred application chunks.
 * Keep this fallback lightweight so it appears immediately without extra JS,
 * fonts, or network requests beyond the existing dynamic brand icon.
 */
export const StoreLoadingSkeleton: React.FC<StoreLoadingSkeletonProps> = ({ variant = 'store' }) => {
  const isAdmin = variant === 'admin';
  const [storeName, setStoreName] = useState('Store');

  useEffect(() => {
    let active = true;
    fetch('/api/content', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const name = payload?.content?.settings?.storeName;
        if (active && typeof name === 'string' && name.trim()) setStoreName(name.trim().slice(0, 120));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <main
      aria-busy="true"
      aria-live="polite"
      aria-label={isAdmin ? 'Loading admin workspace' : 'Loading store'}
      className="flex min-h-[100svh] w-full items-center justify-center bg-[#FAFAFA] px-5 text-slate-900"
    >
      <section className="flex w-full max-w-sm flex-col items-center justify-center text-center">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:h-32 sm:w-32">
          <img
            src="/api/brand/icon?size=192"
            alt="Store logo"
            width={128}
            height={128}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-contain p-2"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
              const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'grid';
            }}
          />
          <span
            aria-hidden="true"
            className="hidden h-full w-full place-items-center bg-indigo-600 text-3xl font-bold text-white"
          >
            {Array.from(storeName)[0]?.toLocaleUpperCase() || 'S'}
          </span>
        </div>

        <h1 className="mt-5 max-w-full truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {storeName}
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          {isAdmin ? 'Loading your workspace...' : 'Loading...'}
        </p>

        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600 [animation-delay:300ms]" />
        </div>
        <span className="sr-only">Please wait while the page loads.</span>
      </section>
    </main>
  );
};
