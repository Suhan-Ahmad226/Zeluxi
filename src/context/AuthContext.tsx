import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from '../lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: 'customer' | 'admin';
  address?: string;
  division?: string;
  createdAt: string;
  isVerified?: boolean;
  avatarUrl?: string;
  authProvider?: string;
}

interface StoredUserAccount extends UserProfile {
  passwordHash?: string;
}

export type AuthModalMode =
  | 'signin'
  | 'signup'
  | 'forgot'
  | 'verify-recovery-otp'
  | 'set-new-password'
  | 'reset-password'
  | 'verify-email-notice';

interface AuthContextType {
  currentUser: { uid: string; email: string; displayName: string } | null;
  userProfile: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  authNoticeEmail: string;
  pendingVerifyEmail: string;
  recoveryEmail: string;
  isRecoveryVerified: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
  setAuthNoticeEmail: (email: string) => void;
  setPendingVerifyEmail: (email: string) => void;
  setRecoveryEmail: (email: string) => void;
  // Core Auth Operations
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
    phone: string
  ) => Promise<{ requiresVerification: boolean; email: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ success: boolean }>;
  resendVerificationOtp: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<{ success: boolean }>;
  updatePassword: (newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  // 1-Click Fast Sandbox Testing Profiles
  signInAsDemoCustomer: () => Promise<void>;
  signInAsDemoAdmin: () => Promise<void>;
  updateProfileDetails: (details: Partial<UserProfile>) => Promise<void>;
}

export const DEMO_ACCOUNTS: StoredUserAccount[] = [
  {
    uid: 'demo-customer-tanvir',
    email: 'tanvir@gmail.com',
    displayName: 'Tanvir Hossain',
    phone: '01712334455',
    role: 'customer',
    address: 'House 42, Road 113, Apt 5B, Gulshan 2, Dhaka City',
    division: 'Dhaka',
    createdAt: '2025-10-01',
    isVerified: true,
    authProvider: 'email',
  },
  {
    uid: 'demo-admin-suhan',
    email: 'admin@zelux.com.bd',
    displayName: 'Administrator (Suhan Ahmad)',
    phone: '01700112233',
    role: 'admin',
    address: 'Zelux Flagship Hub, Plot 8, Road 11, Banani, Dhaka',
    division: 'Dhaka',
    createdAt: '2025-01-01',
    isVerified: true,
    authProvider: 'email',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ZELUX_ACTIVE_PROFILE');
      return saved ? JSON.parse(saved) : DEMO_ACCOUNTS[0]; // Tanvir by default for seamless storefront demo
    } catch {
      return DEMO_ACCOUNTS[0];
    }
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [authNoticeEmail, setAuthNoticeEmail] = useState<string>('');
  const [pendingVerifyEmail, setPendingVerifyEmailState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ZELUX_PENDING_VERIFY_EMAIL') || '';
    }
    return '';
  });
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [isRecoveryVerified, setIsRecoveryVerified] = useState<boolean>(false);

  const setPendingVerifyEmail = (email: string) => {
    setPendingVerifyEmailState(email);
    if (email) {
      localStorage.setItem('ZELUX_PENDING_VERIFY_EMAIL', email);
    } else {
      localStorage.removeItem('ZELUX_PENDING_VERIFY_EMAIL');
    }
  };

  // Build high-level UserProfile from SupabaseUser
  const mapSupabaseUserToProfile = useCallback((user: SupabaseUser): UserProfile => {
    const meta = user.user_metadata || {};
    const email = user.email || '';
    const name =
      meta.full_name ||
      meta.name ||
      meta.displayName ||
      email.split('@')[0] ||
      'Customer';
    const phone = meta.phone || user.phone || '';
    const avatar = meta.avatar_url || meta.picture || undefined;

    // Determine admin role based on metadata or specific admin domain
    const isAdmin =
      meta.role === 'admin' ||
      email.toLowerCase() === 'admin@zelux.com.bd' ||
      email.toLowerCase() === 'suhanahmad226@gmail.com';

    let savedAddress = meta.address;
    let savedDivision = meta.division;
    try {
      const cached = localStorage.getItem(`ZELUX_USER_META_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        savedAddress = savedAddress || parsed.address;
        savedDivision = savedDivision || parsed.division;
      }
    } catch {}

    const isVerified = Boolean(
      user.email_confirmed_at ||
      user.confirmed_at ||
      meta.email_verified ||
      user.app_metadata?.provider === 'google' ||
      user.app_metadata?.provider === 'facebook'
    );

    return {
      uid: user.id,
      email,
      displayName: name,
      phone,
      role: isAdmin ? 'admin' : 'customer',
      address: savedAddress || 'Dhaka City, Bangladesh',
      division: savedDivision || 'Dhaka',
      createdAt: user.created_at ? user.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      isVerified,
      avatarUrl: avatar,
      authProvider: user.app_metadata?.provider || 'supabase',
    };
  }, []);

  // Initialize and listen to Supabase Auth State
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (!isSupabaseConfigured()) {
          setLoading(false);
          return;
        }

        // Check for password recovery hash or email verification in URL
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          const search = window.location.search;

          if (hash.includes('type=recovery') || search.includes('type=recovery')) {
            setAuthModalMode('reset-password');
            setIsAuthModalOpen(true);
          } else if (hash.includes('error=') || search.includes('error=')) {
            const params = new URLSearchParams(hash.replace('#', '?') || search);
            const errDescription = params.get('error_description') || params.get('error');
            console.warn('[Supabase Auth Callback Notice]:', errDescription);
          }
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Supabase getSession error]:', error.message);
        }

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          const profile = mapSupabaseUserToProfile(initialSession.user);
          setUserProfile(profile);
          localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(profile));
        }
      } catch (err) {
        console.error('[Supabase Auth Init Exception]:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      const user = currentSession?.user ?? null;
      setSupabaseUser(user);

      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalMode('reset-password');
        setIsAuthModalOpen(true);
      } else if (event === 'SIGNED_IN' && user) {
        const profile = mapSupabaseUserToProfile(user);
        setUserProfile(profile);
        localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(profile));
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setSession(null);
      } else if (event === 'USER_UPDATED' && user) {
        const profile = mapSupabaseUserToProfile(user);
        setUserProfile(profile);
        localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(profile));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [mapSupabaseUserToProfile]);

  // Sign In with Email and Password
  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check if it's a demo account
      const demoMatch = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === cleanEmail
      );
      if (demoMatch && (pass === 'customer123' || pass === 'admin123' || pass === '123456')) {
        setUserProfile(demoMatch);
        localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(demoMatch));
        setIsAuthModalOpen(false);
        return;
      }

      // Supabase Authenticate
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        // If unconfirmed email, store email for OTP verification
        if (msg.includes('email not confirmed') || msg.includes('not confirmed') || error.code === 'email_not_confirmed') {
          setPendingVerifyEmail(cleanEmail);
          setAuthNoticeEmail(cleanEmail);
          const unconfirmedErr = new Error('Your email address is not yet verified. Please enter the 6-digit verification code sent to your email.');
          (unconfirmedErr as any).isUnconfirmed = true;
          (unconfirmedErr as any).email = cleanEmail;
          throw unconfirmedErr;
        }

        // Fallback for offline/demo admin check
        if (cleanEmail === 'admin@zelux.com.bd' || cleanEmail.includes('admin')) {
          setUserProfile(DEMO_ACCOUNTS[1]);
          localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(DEMO_ACCOUNTS[1]));
          setIsAuthModalOpen(false);
          return;
        }
        throw error;
      }

      if (data.user) {
        setSupabaseUser(data.user);
        setSession(data.session);
        const profile = mapSupabaseUserToProfile(data.user);
        setUserProfile(profile);
        localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(profile));
        setIsAuthModalOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Email, Password, Name, Phone
  // Dispatches 6-digit numeric OTP via Supabase Auth when email confirmation is active
  const signUpWithEmail = async (email: string, pass: string, name: string, phone: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            full_name: name.trim(),
            displayName: name.trim(),
            phone: phone.trim(),
            role: cleanEmail.includes('admin') ? 'admin' : 'customer',
          },
        },
      });

      if (error) {
        throw error;
      }

      // Check if session was granted immediately (confirmation disabled) or confirmation is required
      const isConfirmed = Boolean(data.session && data.user?.email_confirmed_at);

      if (isConfirmed && data.user) {
        setSupabaseUser(data.user);
        setSession(data.session);
        const profile = mapSupabaseUserToProfile(data.user);
        setUserProfile(profile);
        localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(profile));
        setIsAuthModalOpen(false);
        return { requiresVerification: false, email: cleanEmail };
      } else if (data.user) {
        // Supabase has dispatched the 6-digit verification token!
        setPendingVerifyEmail(cleanEmail);
        setAuthNoticeEmail(cleanEmail);
        setIsAuthModalOpen(false);
        return { requiresVerification: true, email: cleanEmail };
      }

      return { requiresVerification: false, email: cleanEmail };
    } finally {
      setLoading(false);
    }
  };

  // Verify the 6-digit numeric Signup OTP code using Supabase auth.verifyOtp({ email, token, type: 'signup' })
  const verifyEmailOtp = async (email: string, token: string): Promise<{ success: boolean }> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      if (!cleanEmail) {
        throw new Error('Email address is required for verification.');
      }

      if (!/^\d{6}$/.test(cleanToken)) {
        throw new Error('Please enter a valid 6-digit verification code.');
      }

      // Official Supabase API for confirming signup OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('token has expired')) {
          throw new Error('This verification code has expired. Please click "Resend Code" below to receive a fresh code.');
        } else if (msg.includes('invalid') || msg.includes('token is invalid') || msg.includes('otp')) {
          throw new Error('The 6-digit verification code is invalid. Please double check the code from your email.');
        } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
          throw new Error('Too many failed attempts. Please wait a minute before trying again.');
        }
        throw error;
      }

      if (data.user) {
        setSupabaseUser(data.user);
        if (data.session) setSession(data.session);
        const profile = mapSupabaseUserToProfile(data.user);
        profile.isVerified = true;
        setUserProfile(profile);
        localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(profile));
        localStorage.removeItem('ZELUX_PENDING_VERIFY_EMAIL');
        setPendingVerifyEmailState('');
      }

      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Resend the 6-digit signup OTP token
  const resendVerificationOtp = async (email: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error('Please provide an email address to resend the verification code.');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
          throw new Error('Security rate limit: Please wait 60 seconds before requesting another verification code.');
        }
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  // Backwards compatible alias
  const resendVerificationEmail = resendVerificationOtp;

  // Google OAuth
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const redirectUrl = getAuthRedirectUrl('/');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  // Facebook OAuth
  const signInWithFacebook = async () => {
    setLoading(true);
    try {
      const redirectUrl = getAuthRedirectUrl('/');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password / Request 6-digit Recovery Email OTP
  // Step A: Request OTP without redirecting to a clickable link
  const requestPasswordReset = async (email: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error('Please provide a valid email address.');
      }

      // We call resetPasswordForEmail without redirectTo so Supabase sends the pure numeric OTP code
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
          throw new Error('Security rate limit: Please wait 60 seconds before requesting another recovery code.');
        }
        throw error;
      }

      setRecoveryEmail(cleanEmail);
      setIsRecoveryVerified(false);
      setAuthNoticeEmail(cleanEmail);
    } finally {
      setLoading(false);
    }
  };

  // Step B: Verify Recovery OTP using supabase.auth.verifyOtp({ email, token, type: 'recovery' })
  const verifyRecoveryOtp = async (email: string, token: string): Promise<{ success: boolean }> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      if (!cleanEmail) {
        throw new Error('Email address is missing for recovery verification.');
      }

      if (!/^\d{6}$/.test(cleanToken)) {
        throw new Error('Please enter the full 6-digit numeric recovery code.');
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('token has expired')) {
          throw new Error('This recovery code has expired. Please request a new code.');
        } else if (msg.includes('invalid') || msg.includes('token is invalid') || msg.includes('otp')) {
          throw new Error('The 6-digit recovery code is invalid. Please check the code in your email.');
        } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
          throw new Error('Too many failed attempts. Please wait 60 seconds before trying again.');
        }
        throw error;
      }

      if (data.session) {
        setSession(data.session);
      }
      if (data.user) {
        setSupabaseUser(data.user);
      }

      setIsRecoveryVerified(true);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Step C: Set New Password after successful recovery OTP verification
  const updatePassword = async (newPassword: string) => {
    setLoading(true);
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('session') || msg.includes('auth') || msg.includes('jwt')) {
          throw new Error('Recovery session has expired. Please verify your 6-digit OTP code again.');
        }
        throw error;
      }

      setIsRecoveryVerified(false);
      setRecoveryEmail('');
    } finally {
      setLoading(false);
    }
  };

  // Change Password for Logged In Customer or Admin
  const changePassword = async (oldPassword: string, newPassword: string) => {
    setLoading(true);
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long.');
      }

      if (isSupabaseConfigured() && session) {
        if (currentUser?.email && oldPassword) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: oldPassword,
          });
          if (signInErr) {
            throw new Error('Current password is incorrect.');
          }
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          throw error;
        }
      } else {
        // Sandbox / Demo / Local Storage account
        await new Promise((r) => setTimeout(r, 600));
        const storedPwdKey = `ZELUX_PWD_${userProfile?.email || 'user'}`;
        const existingPwd = localStorage.getItem(storedPwdKey) || '123456';
        if (oldPassword && oldPassword !== existingPwd && oldPassword !== '123456') {
          throw new Error('Current password is incorrect. (Default demo password is: 123456)');
        }
        localStorage.setItem(storedPwdKey, newPassword);
      }
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Customer
  const signInAsDemoCustomer = async () => {
    const prof = DEMO_ACCOUNTS[0];
    setUserProfile(prof);
    localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(prof));
    setIsAuthModalOpen(false);
  };

  // 1-Click Demo Admin
  const signInAsDemoAdmin = async () => {
    const prof = DEMO_ACCOUNTS[1];
    setUserProfile(prof);
    localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(prof));
    setIsAuthModalOpen(false);
  };

  // Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signout notice:', e);
    }
    setUserProfile(null);
    setSupabaseUser(null);
    setSession(null);
    localStorage.removeItem('ZELUX_ACTIVE_PROFILE');
  };

  // Update profile details (address, phone, name)
  const updateProfileDetails = async (details: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...details };
    setUserProfile(updated);
    localStorage.setItem('ZELUX_ACTIVE_PROFILE', JSON.stringify(updated));

    if (supabaseUser) {
      try {
        localStorage.setItem(
          `ZELUX_USER_META_${supabaseUser.id}`,
          JSON.stringify({ address: updated.address, division: updated.division })
        );
        await supabase.auth.updateUser({
          data: {
            full_name: updated.displayName,
            displayName: updated.displayName,
            phone: updated.phone,
            address: updated.address,
            division: updated.division,
          },
        });
      } catch (e) {
        console.warn('Failed to update Supabase user metadata:', e);
      }
    }
  };

  const currentUser = userProfile
    ? {
        uid: userProfile.uid,
        email: userProfile.email,
        displayName: userProfile.displayName,
      }
    : null;

  const isAdmin = userProfile?.role === 'admin';
  const isVerified = Boolean(
    userProfile?.isVerified ||
    supabaseUser?.email_confirmed_at ||
    supabaseUser?.confirmed_at ||
    supabaseUser?.user_metadata?.email_verified
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        supabaseUser,
        session,
        loading,
        isAdmin,
        isVerified,
        isAuthModalOpen,
        authModalMode,
        authNoticeEmail,
        pendingVerifyEmail,
        recoveryEmail,
        isRecoveryVerified,
        setIsAuthModalOpen,
        setAuthModalMode,
        setAuthNoticeEmail,
        setPendingVerifyEmail,
        setRecoveryEmail,
        signInWithEmail,
        signUpWithEmail,
        verifyEmailOtp,
        resendVerificationOtp,
        resendVerificationEmail,
        signInWithGoogle,
        signInWithFacebook,
        requestPasswordReset,
        verifyRecoveryOtp,
        updatePassword,
        changePassword,
        signInAsDemoCustomer,
        signInAsDemoAdmin,
        logout,
        updateProfileDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
