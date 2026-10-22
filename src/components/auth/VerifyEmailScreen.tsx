import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { StoreBrandMark } from '../common/StoreBrandMark';
import {
  Mail,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const VerifyEmailScreen: React.FC = () => {
  const {
    pendingVerifyEmail,
    setPendingVerifyEmail,
    verifyEmailOtp,
    resendVerificationOtp,
    isVerified,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useAuth();

  const { language, setActiveView, showToast, settings } = useStore();

  // Extract email from pending context state or URL query parameter
  const [email, setEmail] = useState<string>(() => {
    if (pendingVerifyEmail) return pendingVerifyEmail;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      if (urlEmail) return urlEmail;
      return localStorage.getItem('ZELUX_PENDING_VERIFY_EMAIL') || '';
    }
    return '';
  });

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [customEmailInput, setCustomEmailInput] = useState<string>(email);

  // Input references for the 6 boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Update custom input if email changes
  useEffect(() => {
    if (email) {
      setCustomEmailInput(email);
    }
  }, [email]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Only allow numeric characters
    const cleanVal = value.replace(/[^0-9]/g, '');

    // Handle single character entry
    if (cleanVal.length <= 1) {
      const newDigits = [...digits];
      newDigits[index] = cleanVal;
      setDigits(newDigits);

      // Auto-advance to next input if filled
      if (cleanVal && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // If all 6 digits are filled, automatically submit
      const fullCode = newDigits.join('');
      if (fullCode.length === 6 && !newDigits.includes('')) {
        handleExecuteVerification(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous box if current box is already empty
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Full paste support for 6-digit OTP
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const pastedData = e.clipboardData.getData('text').trim();
    const numericChars = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

    if (numericChars.length > 0) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < numericChars.length; i++) {
        newDigits[i] = numericChars[i];
      }
      setDigits(newDigits);

      // Focus appropriate box
      const nextIndex = Math.min(numericChars.length, 5);
      inputRefs.current[nextIndex]?.focus();

      // If full 6 digits were pasted, trigger verification immediately
      if (numericChars.length === 6) {
        handleExecuteVerification(numericChars);
      }
    }
  };

  const handleExecuteVerification = async (codeToVerify?: string) => {
    const targetCode = codeToVerify || digits.join('');
    const targetEmail = email.trim();

    if (!targetEmail) {
      setErrorMessage(
        'A registered email address is required for verification.'
      );
      return;
    }

    if (targetCode.length !== 6 || !/^\d{6}$/.test(targetCode)) {
      setErrorMessage(
        'Please enter the complete 6-digit verification code.'
      );
      return;
    }

    if (isVerifying) return; // Prevent duplicate submission

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // Calls official Supabase auth.verifyOtp with type: 'signup'
      await verifyEmailOtp(targetEmail, targetCode);

      setSuccessMessage(
        `Email address verified successfully! Welcome to ${settings.storeName?.trim() || 'the store'}.`
      );

      showToast(`Email verified successfully! Welcome to ${settings.storeName?.trim() || 'the store'}.`, 'success');

      // Brief delay before redirecting to storefront
      setTimeout(() => {
        setActiveView('store');
      }, 1500);
    } catch (err: any) {
      console.error('[OTP Verification Error]:', err);
      const msg = err.message || '';
      if (msg.includes('expired')) {
        setErrorMessage(
          'This verification code has expired. Please request a new code using the resend button below.'
        );
      } else if (msg.includes('invalid') || msg.includes('token') || msg.includes('otp')) {
        setErrorMessage(
          'Invalid 6-digit verification code. Please check your email and try again.'
        );
      } else if (msg.includes('rate limit')) {
        setErrorMessage(
          'Security rate limit reached. Please wait a minute before trying again.'
        );
      } else {
        setErrorMessage(
          err.message ||
            ('Failed to verify OTP code. Please check your connection and try again.')
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;
    const targetEmail = email.trim();

    if (!targetEmail) {
      setErrorMessage('Please specify an email address to receive the verification code.');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);

    try {
      await resendVerificationOtp(targetEmail);
      setSuccessMessage(
        `A fresh 6-digit verification code has been dispatched to ${targetEmail}`
      );
      setResendCooldown(60); // 60s cooldown
      showToast(`Verification code sent to ${targetEmail}`, 'info');
    } catch (err: any) {
      console.error('[Resend OTP Error]:', err);
      setErrorMessage(err.message || 'Unable to dispatch verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customEmailInput.trim().toLowerCase();
    if (clean && clean.includes('@')) {
      setEmail(clean);
      setPendingVerifyEmail(clean);
      setIsEditingEmail(false);
      setErrorMessage(null);
      setSuccessMessage(`Email updated to ${clean}. You can now resend the OTP.`);
    }
  };

  const isFormComplete = digits.every((d) => d.length === 1);

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Decorative Banner */}
        <div className="bg-slate-950 text-white px-6 py-6 sm:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative z-10 flex flex-col items-center">
            <StoreBrandMark
              name={settings.storeName}
              logoUrl={settings.logoUrl}
              className="mb-3 h-14 w-14 rounded-2xl border border-indigo-400/40"
              fallbackClassName="bg-indigo-600/30 text-indigo-300"
              imageClassName="h-full w-full object-contain p-2"
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-800/60 mb-2">
              Identity verification
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {'Enter 6-digit code'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm">
              {'Enter the numeric one-time code sent to your registered email.'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Target Email Display & Edit */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 font-medium">
                  {'Verification email sent to:'}
                </p>
                <p className="font-bold text-slate-900 truncate font-mono text-sm">
                  {email || 'No email specified'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingEmail(!isEditingEmail)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline shrink-0 cursor-pointer"
            >
              {isEditingEmail ? 'Cancel' : 'Change email?'}
            </button>
          </div>

          {/* Optional Edit Email Input */}
          {isEditingEmail && (
            <form onSubmit={handleSaveCustomEmail} className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
              <label className="block text-slate-700 font-semibold">
                Correct Registered Email Address:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Update
                </button>
              </div>
            </form>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-[11px] text-red-600/80">
                  Tip: Check your spam/junk folder or click "Resend Code" below to receive a new OTP.
                </p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* 6-Digit OTP Inputs */}
          <div>
            <label className="block text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              {'Enter 6-Digit Code'}
            </label>

            <div className="flex justify-center items-center gap-2 sm:gap-3">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={isVerifying}
                  className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border-2 transition-all ${
                    digit
                      ? 'border-indigo-600 bg-indigo-50/30 text-indigo-950 shadow-sm'
                      : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400'
                  } focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-50`}
                />
              ))}
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-2.5">
              Supports paste (Ctrl+V / ⌘+V) of entire 6-digit code.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={!isFormComplete || isVerifying || !email}
              onClick={() => handleExecuteVerification()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>{'Verify & Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend Code Button & Cooldown */}
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleResendCode}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0
                    ? `Resend Code in ${resendCooldown}s`
                    : 'Resend Verification Code'}
                </span>
              </button>
            </div>
          </div>

          {/* Security & Guidance Information */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">Didn't receive the email?</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li>Check your Spam, Junk, or Promotions tab.</li>
                  <li>Ensure the email address above is typed accurately.</li>
                  <li>Supabase verification tokens expire in 60 minutes.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveView('store')}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Store</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Sign In with another account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
