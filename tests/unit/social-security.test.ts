import test from 'node:test';
import assert from 'node:assert/strict';

test('social tokens are encrypted at rest and decrypt only with the configured key', async () => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = '11'.repeat(32);
  const { encryptSocialToken, decryptSocialToken } = await import('../../src/lib/social/server');
  const token = 'EAAB-secret-page-token-example';
  const encrypted = encryptSocialToken(token);
  assert.notEqual(encrypted, token);
  assert.equal(encrypted.includes(token), false);
  assert.equal(decryptSocialToken(encrypted), token);
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = '22'.repeat(32);
  assert.throws(() => decryptSocialToken(encrypted));
});

test('social product URLs use the canonical site origin and safe product slug', async () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example/';
  const { productUrl } = await import('../../src/lib/social/server');
  assert.equal(productUrl('leather-wallet', 'prod_123'), 'https://shop.example/products/leather-wallet');
  assert.equal(productUrl('../unsafe', 'prod_123'), 'https://shop.example/products/prod_123');
});
