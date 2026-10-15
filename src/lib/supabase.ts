import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const SUPABASE_URL = configuredUrl || 'https://placeholder.supabase.co';
export const SUPABASE_ANON_KEY = configuredAnonKey || 'missing-public-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return Boolean(configuredUrl && configuredAnonKey);
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
