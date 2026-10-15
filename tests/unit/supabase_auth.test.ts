import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '../../src/lib/auth/verifyCustomer';

describe('Supabase client SDK smoke tests (offline)', () => {
  it('creates an auth client without contacting a real Supabase project', () => {
    const client = createClient('https://example.supabase.co', 'test-public-anon-key');
    assert.ok(client);
    assert.ok(client.auth);
  });

  it('does not require or embed production project credentials in this test suite', () => {
    const testUrl = 'https://example.supabase.co';
    const testKey = 'test-public-anon-key';
    assert.strictEqual(new URL(testUrl).hostname, 'example.supabase.co');
    assert.ok(!testKey.startsWith('eyJ'));
  });

  it('verifies admin privilege only from validated app_metadata.role and rejects email or user_metadata', () => {
    // Valid admin with app_metadata
    assert.strictEqual(
      isAdminUser({
        app_metadata: { role: 'ADMIN' },
        user_metadata: { role: 'customer' },
        email: 'staff@example.com',
      }),
      true,
      'app_metadata.role=ADMIN must grant admin status'
    );

    // Case insensitivity check on app_metadata
    assert.strictEqual(
      isAdminUser({
        app_metadata: { role: 'admin' },
        user_metadata: {},
        email: 'staff@example.com',
      }),
      true
    );

    // End-user trying to elevate via user_metadata MUST fail
    assert.strictEqual(
      isAdminUser({
        app_metadata: { role: 'customer' },
        user_metadata: { role: 'admin' },
        email: 'customer@example.com',
      }),
      false,
      'user_metadata.role must never grant admin privileges'
    );

    // Email containing 'admin' MUST NOT grant admin privileges
    assert.strictEqual(
      isAdminUser({
        app_metadata: {},
        user_metadata: {},
        email: 'admin@zelux.com.bd',
      }),
      false,
      'Email address matching must never grant admin privileges'
    );

    // Null or undefined user MUST fail
    assert.strictEqual(isAdminUser(null), false);
    assert.strictEqual(isAdminUser(undefined), false);
  });
});
