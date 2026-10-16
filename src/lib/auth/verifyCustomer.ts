import { supabase, isSupabaseConfigured } from '../supabase';
import { User } from '@supabase/supabase-js';

export interface CustomerVerificationStatus {
  isVerified: boolean;
  user: User | null;
  email: string | null;
  reason?: 'ANONYMOUS' | 'UNVERIFIED_EMAIL' | 'INVALID_SESSION' | 'VALID';
  message: string;
}

/**
 * Evaluates whether a user has validated administrator authority based strictly on
 * trusted server-side Supabase app_metadata.
 *
 * Security Rules:
 * 1. Must check user.app_metadata.role === 'ADMIN' (case-insensitive)
 * 2. Never trust user_metadata (which can be edited by client/end-user)
 * 3. Never trust email address matching (e.g. contains 'admin')
 */
export function isAdminUser(
  user: {
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
    email?: string | null;
  } | null | undefined
): boolean {
  if (!user || !user.app_metadata) return false;
  return String(user.app_metadata.role || '').toUpperCase() === 'ADMIN';
}

/**
 * Checks whether the current customer holds an active, verified Supabase identity.
 * Required before approving checkout and order placement.
 */
export async function verifyCustomerOrderEligibility(): Promise<CustomerVerificationStatus> {
  if (!isSupabaseConfigured()) {
    return {
      isVerified: false,
      user: null,
      email: null,
      reason: 'INVALID_SESSION',
      message: 'Authentication is not configured. Orders are disabled until Supabase is configured.',
    };
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      return {
        isVerified: false,
        user: null,
        email: null,
        reason: 'ANONYMOUS',
        message: 'Please sign in or create an account before placing an order.',
      };
    }

    // Refresh user state directly from Supabase server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        isVerified: false,
        user: null,
        email: session.user.email || null,
        reason: 'INVALID_SESSION',
        message: 'Your authentication session has expired. Please sign in again.',
      };
    }

    // OAuth provider metadata is not itself proof that this specific email is verified.
    // Trust only Supabase's confirmation timestamps returned for the authenticated user.
    const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);

    if (!isEmailConfirmed) {
      return {
        isVerified: false,
        user,
        email: user.email || null,
        reason: 'UNVERIFIED_EMAIL',
        message: 'Your email address is not yet verified. Please enter the 6-digit OTP code to complete verification.',
      };
    }

    return {
      isVerified: true,
      user,
      email: user.email || null,
      reason: 'VALID',
      message: 'Customer verified successfully.',
    };
  } catch (err: any) {
    return {
      isVerified: false,
      user: null,
      email: null,
      reason: 'INVALID_SESSION',
      message: err?.message || 'Authentication error occurred.',
    };
  }
}
