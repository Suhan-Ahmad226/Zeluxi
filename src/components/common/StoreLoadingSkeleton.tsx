'use client';

import React from 'react';

type StoreLoadingSkeletonProps = {
  variant?: 'store' | 'admin';
};

/**
 * Lightweight, brand-aware fallback for deferred application chunks.
 * Uses the store's dynamic brand icon and CSS-only skeleton blocks.
 */
export const StoreLoadingSkeleton: React.FC<StoreLoadingSkeletonProps> = ({ variant = 'store' }) => {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      aria-label={variant === 'admin' ? 'Loading admin workspace' : 'Loading store'}
      className="min-h-[100svh] bg-[#FAFAFA] text-slate-900"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/api/brand/icon?size=192"
              alt="Store logo"
              width={44}
              height={44}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-contain"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'grid';
              }}
            />
            <span
              aria-hidden="true"
              className="hidden h-full w-full place-items-center bg-indigo-600 text-sm font-bold text-white"
            >
              Z
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">Zeluxi</p>
            <p className="text-xs text-slate-500">
              {variant === 'admin' ? 'Preparing your workspace…' : 'Preparing your store…'}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex" aria-hidden="true">
          <div className="h-3 w-14 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-3 sm:px-6 lg:px-8">
        {variant === 'store' ? (
          <>
            <div className="grid min-h-[220px] grid-cols-1 gap-6 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 sm:min-h-[300px] sm:grid-cols-2 sm:items-center sm:p-10">
              <div className="space-y-4">
                <div className="h-3 w-28 animate-pulse rounded bg-indigo-100" />
                <div className="h-7 w-4/5 animate-pulse rounded-md bg-slate-200 sm:h-10" />
                <div className="h-7 w-3/5 animate-pulse rounded-md bg-slate-200 sm:h-10" />
                <div className="h-3 w-full max-w-sm animate-pulse rounded bg-slate-100" />
                <div className="h-11 w-32 animate-pulse rounded-lg bg-indigo-100" />
              </div>
              <div className="hidden h-48 animate-pulse rounded-xl bg-slate-100 sm:block" />
            </div>
            <div className="mt-8 flex items-center justify-between">
              <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-slate-100 bg-white p-2 sm:p-3">
                  <div className="aspect-[4/5] animate-pulse rounded-lg bg-slate-100" />
                  <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-indigo-100" />
              <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="mt-4 h-7 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
            <div className="mt-6 h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
          </>
        )}
        <span className="sr-only">Please wait while the page loads.</span>
      </div>
    </main>
  );
};
