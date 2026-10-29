import React, { useState } from 'react';
import { useAuth, AuthModalMode } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { StoreImage } from '../common/StoreImage';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

import { ModalPortal } from '../common/ModalPortal';
export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    authNoticeEmail,
    setAuthNoticeEmail,
    pendingVerifyEmail,
    setPendingVerifyEmail,
    recoveryEmail,
    setRecoveryEmail,
    isRecoveryVerified,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    requestPasswordReset,
    verifyRecoveryOtp,
    updatePassword,
    resendVerificationEmail,
    resendVerificationOtp,
    loading,
  } = useAuth();

  const { language, showToast, setActiveView, settings } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 6-digit OTP digits state for recovery OTP verification
  const [recoveryDigits, setRecoveryDigits] = useState<string[]>(['', '', '', '', '', '']);
  const recoveryInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Focus first recovery box when switching to verify-recovery-otp mode
  React.useEffect(() => {
    if (authModalMode === 'verify-recovery-otp') {
      setTimeout(() => {
        recoveryInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [authModalMode]);

  // Handle countdown for resend cooldown
  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // Browser redirects to Google OAuth
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      setErrorMsg(err.message || 'Google authentication encountered an issue.');
      setIsSubmitting(false);
    }
  };

  // Facebook OAuth Login
  const handleFacebookLogin = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signInWithFacebook();
      // Browser redirects to Facebook OAuth
    } catch (err: any) {
      console.error('Facebook OAuth error:', err);
      setErrorMsg(err.message || 'Facebook authentication encountered an issue.');
      setIsSubmitting(false);
    }
  };

  // Email / Password / Sign Up / Reset submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (authModalMode === 'signin') {
        await signInWithEmail(email, password);
        showToast('Signed in successfully!', 'success');
        handleClose();
      } else if (authModalMode === 'signup') {
        if (!name.trim()) {
          setErrorMsg('Please enter your full name');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long');
          setIsSubmitting(false);
          return;
        }

        const res = await signUpWithEmail(email, password, name, phone);
        if (res.requiresVerification) {
          setPendingVerifyEmail(email.trim());
          handleClose();
          setActiveView('verify-email');
          showToast('Verification code sent! Enter your 6-digit OTP code below.', 'info');
        } else {
          showToast(`Account created successfully! Welcome to ${settings.storeName?.trim() || 'the store'}.`, 'success');
          handleClose();
        }
      } else if (authModalMode === 'forgot') {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
          setErrorMsg('Please enter your registered email address');
          setIsSubmitting(false);
          return;
        }

        // Step A: Request recovery OTP without clickable link
        await requestPasswordReset(cleanEmail);

        // Always show neutral confirmation message to prevent account enumeration
        setSuccessMsg(
          `If an account matches ${cleanEmail}, a 6-digit password recovery OTP has been sent. Please check your inbox.`
        );

        // Transition smoothly to Step B: Verify Recovery OTP
        setAuthModalMode('verify-recovery-otp');
        setRecoveryDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
      } else if (authModalMode === 'set-new-password' || authModalMode === 'reset-password') {
        // Step C: Set New Password after recovery OTP verification
        if (!password || password.length < 6) {
          setErrorMsg('New password must be at least 6 characters long.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please re-enter.');
          setIsSubmitting(false);
          return;
        }

        await updatePassword(password);
        showToast('Password updated successfully! You can now sign in with your new credentials.', 'success');
        setPassword('');
        setConfirmPassword('');
        setAuthModalMode('signin');
        setSuccessMsg(
          'Password successfully updated! Please sign in with your new password.'
        );
      }
    } catch (err: any) {
      console.error('Auth action error:', err);
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid-credential')) {
        setErrorMsg('Invalid email or password. Please check your credentials and try again.');
      } else if (msg.includes('Email not confirmed') || msg.includes('not verified')) {
        setErrorMsg('Your email address is not yet verified. Please enter the 6-digit numeric OTP sent to your inbox.');
        setAuthNoticeEmail(email.trim());
        setPendingVerifyEmail(email.trim());
      } else if (msg.includes('already registered') || msg.includes('User already registered')) {
        setErrorMsg('An account with this email address already exists. Please sign in instead.');
      } else if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
        setErrorMsg('Security rate limit exceeded. Please wait 60 seconds before requesting another code.');
      } else {
        setErrorMsg(err.message || 'Authentication operation failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step B: Recovery OTP input handlers
  const handleRecoveryDigitChange = (index: number, val: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const clean = val.replace(/[^0-9]/g, '');

    if (clean.length <= 1) {
      const nextDigits = [...recoveryDigits];
      nextDigits[index] = clean;
      setRecoveryDigits(nextDigits);

      if (clean && index < 5) {
        recoveryInputRefs.current[index + 1]?.focus();
      }

      const fullCode = nextDigits.join('');
      if (fullCode.length === 6 && !nextDigits.includes('')) {
        handleExecuteRecoveryOtp(fullCode);
      }
    }
  };

  const handleRecoveryKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!recoveryDigits[index] && index > 0) {
        recoveryInputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...recoveryDigits];
        nextDigits[index] = '';
        setRecoveryDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      recoveryInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      recoveryInputRefs.current[index + 1]?.focus();
    }
  };

  const handleRecoveryPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const pasted = e.clipboardData.getData('text').trim();
    const cleanChars = pasted.replace(/[^0-9]/g, '').slice(0, 6);

    if (cleanChars.length > 0) {
      const nextDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < cleanChars.length; i++) {
        nextDigits[i] = cleanChars[i];
      }
      setRecoveryDigits(nextDigits);

      const focusIdx = Math.min(cleanChars.length, 5);
      recoveryInputRefs.current[focusIdx]?.focus();

      if (cleanChars.length === 6) {
        handleExecuteRecoveryOtp(cleanChars);
      }
    }
  };

  const handleExecuteRecoveryOtp = async (codeOverride?: string) => {
    const code = codeOverride || recoveryDigits.join('');
    const targetEmail = recoveryEmail || email;

    if (!targetEmail) {
      setErrorMsg('Recovery email is missing. Please restart password recovery.');
      return;
    }

    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the recovery OTP code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await verifyRecoveryOtp(targetEmail, code);
      setSuccessMsg(
        'Recovery code verified successfully! Now set your new password.'
      );
      setAuthModalMode('set-new-password');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired recovery code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendRecoveryOtp = async () => {
    const targetEmail = recoveryEmail || email;
    if (!targetEmail) {
      setErrorMsg('Please enter your email to request recovery code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await requestPasswordReset(targetEmail);
      setSuccessMsg(
        `A fresh 6-digit recovery OTP has been sent to ${targetEmail}.`
      );
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend recovery OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = authNoticeEmail || email || pendingVerifyEmail;
    if (!targetEmail) {
      setErrorMsg('No email address available to resend verification.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await resendVerificationOtp(targetEmail);
      setSuccessMsg(`A fresh 6-digit verification code has been sent to ${targetEmail}`);
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            {settings.logoUrl?.trim().startsWith('https://') ? (
              <StoreImage
                src={settings.logoUrl.trim()}
                alt={settings.storeName?.trim() || 'Store logo'}
                className="h-9 w-9 rounded-lg object-contain shrink-0"
                loading="eager"
                decoding="async"
                preset="logo"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold text-xs font-mono tracking-wider"
              >
                {(settings.storeName?.trim() || 'Z').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {authModalMode === 'signin' && ('Sign in')}
                {authModalMode === 'signup' && ('Create account')}
                {authModalMode === 'forgot' && ('Reset password')}
                {authModalMode === 'verify-recovery-otp' && ('Verify recovery code')}
                {(authModalMode === 'set-new-password' || authModalMode === 'reset-password') && ('Set new password')}
                {authModalMode === 'verify-email-notice' && ('Verify email')}
              </h2>
              <p className="text-[11px] text-slate-500">
                {'Secure account authentication'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Social Auth Providers (Google & Facebook) */}
          {(authModalMode === 'signin' || authModalMode === 'signup') && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting || loading}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                {/* Facebook Button */}
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={isSubmitting || loading}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center pt-2">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  Or with email address
                </span>
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p>{errorMsg}</p>
                {authNoticeEmail && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingVerifyEmail(authNoticeEmail);
                        handleClose();
                        setActiveView('verify-email');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      <span>Enter 6-Digit OTP Now</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0 || isSubmitting}
                      className="underline font-semibold text-slate-700 hover:text-slate-900 block text-[11px] disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: EMAIL VERIFICATION NOTICE */}
          {authModalMode === 'verify-email-notice' && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {'Enter 6-Digit Verification Code'}
                </h3>
                <p className="text-xs text-slate-600">
                  We've sent a 6-digit numeric verification OTP to{' '}
                  <span className="font-semibold text-slate-900 font-mono">{authNoticeEmail || email}</span>.
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Enter your numeric OTP code on the verification screen to activate your account.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingVerifyEmail(authNoticeEmail || email);
                    handleClose();
                    setActiveView('verify-email');
                  }}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Go to 6-Digit Code Entry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSubmitting}
                  onClick={handleResendVerification}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend Verification Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 font-semibold py-1"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* MODE: STEP B - VERIFY RECOVERY OTP */}
          {authModalMode === 'verify-recovery-otp' && (
            <div className="space-y-4 py-2">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-100">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {'Enter 6-Digit Recovery Code'}
                </h3>
                <p className="text-xs text-slate-600">
                  We've sent a 6-digit numeric recovery code to{' '}
                  <span className="font-semibold text-slate-900 font-mono">{recoveryEmail || email}</span>.
                </p>
                <p className="text-[11px] text-slate-500">
                  Enter the code from your email to authenticate and set your new password.
                </p>
              </div>

              {/* 6-Digit OTP Box Grid */}
              <div className="pt-2">
                <div className="flex justify-center gap-2 sm:gap-2.5">
                  {recoveryDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        recoveryInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleRecoveryDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleRecoveryKeyDown(idx, e)}
                      onPaste={handleRecoveryPaste}
                      className="w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-bold font-mono text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
                      autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || recoveryDigits.some((d) => d === '')}
                  onClick={() => handleExecuteRecoveryOtp()}
                  className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify Code & Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSubmitting}
                  onClick={handleResendRecoveryOtp}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend Recovery Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('forgot');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 font-semibold py-1 text-center"
                >
                  Change Email Address
                </button>
              </div>
            </div>
          )}

          {/* MODE: STEP C - SET NEW PASSWORD */}
          {(authModalMode === 'set-new-password' || authModalMode === 'reset-password') && (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Recovery code verified! Enter your new password below.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 font-mono transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: FORM FOR SIGNIN, SIGNUP, FORGOT */}
          {authModalMode !== 'verify-email-notice' &&
            authModalMode !== 'verify-recovery-otp' &&
            authModalMode !== 'set-new-password' &&
            authModalMode !== 'reset-password' && (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {authModalMode === 'signup' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Tanvir Hossain"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mobile Phone Number (Bangladesh)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01711234567"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 font-mono transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email field (for signin, signup, forgot) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              {/* Password field (for signin, signup) */}
              {authModalMode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Password *
                    </label>
                    {authModalMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('forgot');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {authModalMode === 'signin' && 'Sign In'}
                      {authModalMode === 'signup' && 'Create Free Account'}
                      {authModalMode === 'forgot' && 'Send 6-Digit Recovery OTP'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footnotes & Mode Switches */}
          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            {authModalMode === 'signin' && (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Create one now
                </button>
              </p>
            )}

            {authModalMode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Sign in here
                </button>
              </p>
            )}

            {(authModalMode === 'forgot' ||
              authModalMode === 'verify-recovery-otp' ||
              authModalMode === 'set-new-password') && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};
