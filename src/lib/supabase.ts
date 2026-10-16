'use client';

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only the public anonymous key belongs in this browser client. Service-role keys must
// never use a NEXT_PUBLIC_ prefix and must never be imported by client components.
export const supabase = createClient(
  SUPABASE_URL || 'https://configuration-required.invalid',
  SUPABASE_ANON_KEY || 'configuration-required',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  },
);

export const isSupabaseConfigured = (): boolean =>
  Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY !== 'configuration-required',
  );

export const getAuthRedirectUrl = (subpath = ''): string => {
  const path = subpath.startsWith('/') ? subpath : '/' + subpath;
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin + path;
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return new URL(path, origin).toString();
};
