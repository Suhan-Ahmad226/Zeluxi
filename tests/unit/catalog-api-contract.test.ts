import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalogApi = readFileSync(new URL('../../api/products.ts', import.meta.url), 'utf8');
const catalogMigration = readFileSync(
  new URL('../../supabase/migrations/20261016000200_persistent_catalog.sql', import.meta.url),
  'utf8'
);

test('catalog mutations require a freshly validated Supabase user and trusted app_metadata admin role', () => {
  assert.match(catalogApi, /auth\.getUser\(token\)/);
  assert.match(catalogApi, /app_metadata\?\.role/);
  assert.match(catalogApi, /status\(403\)/);
  assert.doesNotMatch(catalogApi, /user_metadata\?\.role/);
});

test('catalog writes validate a strict product payload and archive instead of hard-deleting', () => {
  assert.match(catalogApi, /productSchema\s*=\s*z\.object/);
  assert.match(catalogApi, /\.strict\(\)/);
  assert.match(catalogApi, /published:\s*product\.published/);
  assert.match(catalogApi, /archived:\s*true/);
  assert.match(catalogApi, /Archive rather than hard-delete/);
});

test('public catalog strips procurement cost data', () => {
  assert.match(catalogApi, /costPrice:\s*_costPrice/);
  assert.match(catalogApi, /published',\s*true/);
  assert.match(catalogApi, /archived',\s*false/);
});

test('catalog migration stores product metadata and indexes unique slugs', () => {
  assert.match(catalogMigration, /add column if not exists product_data jsonb/i);
  assert.match(catalogMigration, /store_products_product_slug_unique/i);
  assert.match(catalogMigration, /where archived = false/i);
});

test('procurement cost is stored in a server-only column, not public product metadata', () => {
  assert.match(catalogApi, /cost_price:\s*costPrice\s*\?\?\s*null/);
  assert.match(catalogApi, /product_data:\s*publicProductData/);
  assert.match(catalogMigration, /revoke select on public\.store_products from anon, authenticated/i);
  assert.match(catalogMigration, /grant select \(id, name, price, stock, published, archived, image_url, product_data, updated_at\)/i);
  assert.match(catalogMigration, /add column if not exists cost_price numeric/i);
});
