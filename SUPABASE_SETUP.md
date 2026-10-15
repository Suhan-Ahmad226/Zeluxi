# ZELUX - Supabase Authentication & 6-Digit Numeric Email OTP Setup Guide

> **Important Notice on Dashboard Configuration:**
> The client-side UI and Supabase Auth calls for 6-digit numeric email OTP flows are present, but they are not proof of live delivery. Configure the templates and providers below, then test signup and recovery against the actual project before launch:
> 1. Signup Email Verification: `supabase.auth.verifyOtp({ email, token, type: 'signup' })`
> 2. Password Recovery Verification: `supabase.auth.verifyOtp({ email, token, type: 'recovery' })`
>
> Neither flow redirects to or expects clickable verification or reset links. Because client code cannot directly modify private Supabase backend configuration settings, you **must complete the manual steps in Section 1 in your Supabase project dashboard**.

---

## 1. Required Manual Supabase Dashboard Configuration

### Step A: Enable Email Provider & Email Confirmation
1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** in the left sidebar, then click **Providers**.
3. Select **Email**.
4. Configure the following settings:
   - **Enable Email provider**: `Enabled` (Toggle ON)
   - **Confirm email**: `Enabled` (Toggle ON) *(Crucial: Ensures unverified accounts cannot place orders)*
   - **Minimum password length**: `6` (or higher)
   - **Secure email change**: Enabled
5. Click **Save**.

---

### Step B: Configure OTP Expiry Duration (Target 5 Minutes)
1. In the Supabase Dashboard, go to **Authentication** > **Providers** > **Email** (or under **Authentication** > **Advanced** / **Email Rate Limits** depending on your Supabase dashboard version).
2. Locate **OTP Expiry** / **Mailer OTP Expiry**.
3. Note on provider limits:
   - Supabase projects typically enforce a minimum OTP expiry of **300 seconds (5 minutes)** or 3600 seconds (60 minutes) default.
   - Set the OTP expiry duration to **300 seconds (5 minutes)**, which is the shortest suitable expiry supported by Supabase for optimal one-time code security.
   - If your Supabase dashboard project tier enforces a 3600-second minimum, set it to the lowest value allowed by the dashboard validator.
4. Click **Save**.

---

### Step C: Update "Confirm Signup" Email Template for 6-Digit Numeric OTP
By default, Supabase sends a clickable link via `{{ .ConfirmationURL }}`. To send a **numeric 6-digit verification code with NO clickable verification link**, update the email template:

1. In the Supabase Dashboard, go to **Authentication** > **Email Templates**.
2. Click on the **Confirm signup** template tab.
3. Update the **Subject line**:
   ```
   Your Zelux Verification Code: {{ .Token }}
   ```
4. Replace the **Message (Body)** HTML with the following exact template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Zelux Email Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; text-align: center; background-color: #0f172a;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 2px;">Z E L U X</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Customer Identity Verification</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px 28px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Confirm your registration</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
          Thank you for creating an account with Zelux Bangladesh. To complete your signup and verify your identity, enter the six-digit numeric code below on the verification screen:
        </p>

        <!-- 6-Digit Numeric OTP Box (NO CLICKABLE LINKS) -->
        <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: inline-block;">
            {{ .Token }}
          </span>
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 16px 0 0 0;">
          • This verification code is valid for 5 minutes.<br>
          • For security reasons, never share this one-time code with anyone.<br>
          • If you did not initiate this request, you can safely ignore this email.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        Zelux Bangladesh · Premium E-Commerce Experience · Dhaka, Bangladesh
      </td>
    </tr>
  </table>
 </body>
</html>
```

5. Click **Save Changes** at the bottom of the template editor.
> **Enforcement Rule**: Notice that `{{ .ConfirmationURL }}` is completely removed. Only `{{ .Token }}` is displayed.

---

### Step D: Update "Reset Password" Email Template for 6-Digit Numeric OTP (NO CLICKABLE LINKS)
By default, Supabase sends a clickable reset link via `{{ .ConfirmationURL }}`. To replace this with a pure **6-digit numeric recovery OTP and NO clickable link**:

1. In the Supabase Dashboard, go to **Authentication** > **Email Templates**.
2. Click on the **Reset Password** template tab.
3. Update the **Subject line**:
   ```
   Your Zelux Password Reset Code: {{ .Token }}
   ```
4. Replace the **Message (Body)** HTML with the following exact template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Zelux Password Recovery</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; text-align: center; background-color: #0f172a;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 2px;">Z E L U X</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Secure Account Recovery</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px 28px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Reset your password</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
          We received a request to reset your Zelux account password. Enter the six-digit numeric recovery code below in your Zelux verification dialog:
        </p>

        <!-- 6-Digit Numeric OTP Box (NO CLICKABLE LINKS) -->
        <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: inline-block;">
            {{ .Token }}
          </span>
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 16px 0 0 0;">
          • This recovery code expires in 5 minutes.<br>
          • Never disclose this code to anyone; Zelux staff will never ask for it.<br>
          • If you did not request a password reset, your account remains secure and you can disregard this email.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        Zelux Bangladesh · Premium E-Commerce Experience · Dhaka, Bangladesh
      </td>
    </tr>
  </table>
</body>
</html>
```

5. Click **Save Changes** at the bottom of the template editor.
> **Enforcement Rule**: No clickable reset link is present. Users receive only the 6-digit code `{{ .Token }}`.

---

### Step E: Configure OAuth Providers (Google & Facebook)
OAuth callback URLs are identity provider callbacks, not email OTP links. Keep them configured:
1. **Google OAuth**:
   - Go to **Authentication** > **Providers** > **Google**.
   - Enable Google provider with Client ID and Secret.
   - Set callback URL in Google Console: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. **Facebook OAuth**:
   - Go to **Authentication** > **Providers** > **Facebook**.
   - Enable Facebook provider with App ID and Secret.
   - Set callback URL in Meta Developers: `https://<your-project-ref>.supabase.co/auth/v1/callback`

---

## 2. Technical Architecture of the OTP Flows

### A. Signup Email Verification
- **Request**: `supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })`
- **Verification Screen**: Dedicated `/verify-email` view (`VerifyEmailScreen.tsx`)
- **Verification API**:
  ```ts
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
  ```
- **Resend**: `supabase.auth.resend({ type: 'signup', email })` with 60-second cooldown timer.

### B. Forgot Password Recovery (3-Step OTP Flow)
- **Step A: Request OTP (`requestPasswordReset(email)`)**:
  - Calls `supabase.auth.resetPasswordForEmail(email)` without redirect parameters.
  - Displays neutral response message: *"If an account matches <email>, a 6-digit password recovery OTP has been sent."* This prevents account enumeration.
- **Step B: Verify Recovery OTP (`verifyRecoveryOtp(email, token)`)**:
  - Displays dedicated 6-digit numeric OTP inputs with paste support, auto-advance, backspace navigation, and resend cooldown.
  - Calls:
    ```ts
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    ```
  - Establishes a verified recovery session. Password updates cannot be submitted prior to this check.
- **Step C: Set New Password (`updatePassword(newPassword)`)**:
  - Validates password length (>= 6 chars) and confirm-password match.
  - Calls `supabase.auth.updateUser({ password: newPassword })`.
  - Clears recovery state and safely routes back to sign-in.

### C. Server-Side Identity Verification Gate
- `src/lib/auth/verifyCustomer.ts` performs real session and identity validation using `supabase.auth.getUser()`.
- Orders and checkout placement in `CheckoutModal.tsx` strictly require an authenticated and verified user identity (`isEmailConfirmed`). Unverified customers are blocked and directed to enter their 6-digit code.
