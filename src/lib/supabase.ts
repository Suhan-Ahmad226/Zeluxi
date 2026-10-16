import { createClient } from '@supabase/supabase-js';

// Next.js only exposes browser-safe variables with the NEXT_PUBLIC_ prefix.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Inert placeholders prevent module initialization from crashing when configuration is missing.
// Auth operations must still check isSupabaseConfigured() before making requests.
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

export const isSupabaseConfigured = (): boolean => Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY !== 'configuration-required'
);

export const getAuthRedirectUrl = (subpath = ''): string => {
  const path = subpath.startsWith('/') ? subpath : `/${subpath}`;
  if (typeof window !== 'undefined' && window.location.origin) return `${window.location.origin}${path}`;
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${path}`;
};
