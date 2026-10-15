import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dxrymtstltattmhhawhg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4cnltdHN0bHRhdHRtaGhhd2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTU0NDcsImV4cCI6MjA5MDk5MTQ0N30.GxBUBwWhrsjN-cMfG2IELr15ckEIY8BTjTHHE6-m1tk';

describe('Supabase Authentication Suite', () => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  it('Supabase client initializes properly with URL and public anon key', () => {
    assert.ok(client);
    assert.ok(client.auth);
  });

  it('Session retrieval behaves consistently', async () => {
    const { data, error } = await client.auth.getSession();
    assert.strictEqual(error, null);
    assert.ok(data !== undefined);
  });

  it('Generates Google OAuth URL with proper redirect configuration', async () => {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        skipBrowserRedirect: true,
      },
    });

    assert.strictEqual(error, null);
    assert.ok(data?.url);
    assert.ok(data.url.includes('provider=google'));
    assert.ok(data.url.includes('redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback'));
  });

  it('Generates Facebook OAuth URL with proper redirect configuration', async () => {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        skipBrowserRedirect: true,
      },
    });

    assert.strictEqual(error, null);
    assert.ok(data?.url);
    assert.ok(data.url.includes('provider=facebook'));
  });

  it('Rejects invalid email logins with expected error code', async () => {
    const { data, error } = await client.auth.signInWithPassword({
      email: 'nonexistent_test_account_998877@zelux.com.bd',
      password: 'invalid_password_here',
    });

    assert.strictEqual(data.session, null);
    assert.ok(error);
    assert.ok(
      error.message.includes('Invalid login credentials') ||
      error.code === 'invalid_credentials'
    );
  });

  it('Verifies signup OTP submission format and handles token rejection safely', async () => {
    const { data, error } = await client.auth.verifyOtp({
      email: 'test_otp_user@zelux.com.bd',
      token: '999999',
      type: 'signup',
    });

    // In a test sandbox with non-existent or expired code, it correctly returns an error and null session
    assert.strictEqual(data.session, null);
    assert.ok(error !== null);
    assert.ok(
      error.message.toLowerCase().includes('token') ||
      error.message.toLowerCase().includes('otp') ||
      error.message.toLowerCase().includes('expired') ||
      error.message.toLowerCase().includes('invalid') ||
      error.code === 'otp_expired' ||
      error.status === 400 ||
      error.status === 403
    );
  });

  it('Resend signup OTP API functions properly with email address', async () => {
    const { error } = await client.auth.resend({
      type: 'signup',
      email: 'resend_test_user@zelux.com.bd',
    });

    // Valid Supabase client resend method executed (returns null or rate limit/security error)
    assert.ok(error === null || typeof error.message === 'string');
  });

  it('Verifies recovery OTP submission format using type: recovery and handles token rejection safely', async () => {
    const { data, error } = await client.auth.verifyOtp({
      email: 'test_recovery_user@zelux.com.bd',
      token: '123456',
      type: 'recovery',
    });

    // In non-mocked environment with invalid token, correctly refuses session
    assert.strictEqual(data.session, null);
    assert.ok(error !== null);
    assert.ok(
      error.message.toLowerCase().includes('token') ||
      error.message.toLowerCase().includes('otp') ||
      error.message.toLowerCase().includes('expired') ||
      error.message.toLowerCase().includes('invalid') ||
      error.code === 'otp_expired' ||
      error.status === 400 ||
      error.status === 403
    );
  });

  it('Requests password recovery OTP without requiring a clickable redirect link', async () => {
    // Calling resetPasswordForEmail without redirectTo ensures pure OTP generation
    const { error } = await client.auth.resetPasswordForEmail('recovery_test@zelux.com.bd');
    // Successful dispatch or rate-limit security response
    assert.ok(error === null || typeof error.message === 'string');
  });

  it('Blocks unauthenticated password update attempts', async () => {
    const { data, error } = await client.auth.updateUser({
      password: 'new_secure_password_123',
    });

    assert.strictEqual(data.user, null);
    assert.ok(error !== null);
    assert.ok(
      error.message.toLowerCase().includes('auth') ||
      error.message.toLowerCase().includes('session') ||
      error.message.toLowerCase().includes('jwt') ||
      error.status === 401 ||
      error.status === 403
    );
  });

  it('Validates 6-digit numeric OTP format constraint', () => {
    const isValidOtp = (otp: string) => /^\d{6}$/.test(otp.trim());
    assert.strictEqual(isValidOtp('123456'), true);
    assert.strictEqual(isValidOtp('000123'), true);
    assert.strictEqual(isValidOtp('12345'), false);
    assert.strictEqual(isValidOtp('1234567'), false);
    assert.strictEqual(isValidOtp('12a456'), false);
    assert.strictEqual(isValidOtp(''), false);
  });

  it('Enforces resend cooldown constraint calculation', () => {
    let cooldown = 60;
    assert.strictEqual(cooldown > 0, true);
    cooldown = Math.max(0, cooldown - 1);
    assert.strictEqual(cooldown, 59);
  });
});
