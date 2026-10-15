import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';

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
});
