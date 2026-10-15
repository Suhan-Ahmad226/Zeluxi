import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://neegatxuhwjfobnwowrc.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_hP9Dj95hGjQUQ4QniAsymw_3KS-Bb_y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your_anon_key');
};

/**
 * Helper to compute the dynamic site origin / redirect URL for OAuth and email verification
 */
export const getAuthRedirectUrl = (subpath = ''): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    return `${origin}${subpath.startsWith('/') ? subpath : `/${subpath}`}`;
  }
  return `http://localhost:3000${subpath.startsWith('/') ? subpath : `/${subpath}`}`;
};
