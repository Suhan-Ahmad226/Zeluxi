import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';

// Use inert placeholders only to prevent module initialization from crashing when deployment
// configuration is missing. isSupabaseConfigured() must be checked before auth operations.
export const supabase = createClient(
  SUPABASE_URL || 'https://configuration-required.invalid',
  SUPABASE_ANON_KEY || 'configuration-required', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY !== 'configuration-required');
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
