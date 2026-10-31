import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

test('AI caption generation has a bounded timeout compatible with the API route duration', () => {
  const server = read('src/lib/social/server.ts');
  const route = read('app/api/admin/social/route.ts');
  assert.match(server, /AbortSignal\.timeout\(45000\)/);
  assert.match(route, /export const maxDuration = 60/);
});

test('Social text strips zero-width and bidirectional formatting controls', () => {
  const server = read('src/lib/social/server.ts');
  assert.match(server, /export function cleanSocialText/);
  assert.match(server, /\\u200B-\\u200F/);
  assert.match(server, /\\u202A-\\u202E/);
  assert.match(server, /cleanSocialText\(caption\)/);
});

test('Facebook publishing adds verified product details from the current catalog record', () => {
  const publishing = read('src/lib/social/publishing.ts');
  assert.match(publishing, /product_data/);
  assert.match(publishing, /Price: ৳/);
  assert.match(publishing, /Regular price: ৳/);
  assert.match(publishing, /Discount: \$\{discountPercent\}%/);
  assert.match(publishing, /Details: \$\{productDescription\}/);
  assert.match(publishing, /Shop now: \$\{post\.product_url\}/);
});

test('Social Studio preview mirrors the product facts included in the Facebook post', () => {
  const component = read('src/components/admin/SocialPostStudio.tsx');
  assert.match(component, /previewFacts/);
  assert.match(component, /Regular price: ৳/);
  assert.match(component, /Discount: \$\{previewDiscount\}%/);
  assert.match(component, /cleanPreviewCaption/);
});
