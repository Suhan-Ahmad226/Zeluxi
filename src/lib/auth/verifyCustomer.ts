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
      message: 'Authentication is temporarily unavailable. Please try again later.',
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

    const isEmailConfirmed = Boolean(
      user.email_confirmed_at ||
      user.confirmed_at ||
      user.user_metadata?.email_verified ||
      user.app_metadata?.provider === 'google' ||
      user.app_metadata?.provider === 'facebook'
    );

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
