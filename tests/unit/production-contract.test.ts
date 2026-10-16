import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const orderApi = readFileSync(new URL('../../api/orders.ts', import.meta.url), 'utf8');
const commerceMigration = readFileSync(
  new URL('../../supabase/migrations/20261016000100_production_commerce.sql', import.meta.url),
  'utf8'
);

test('order endpoint accepts COD only and rejects unexpected client fields', () => {
  assert.match(orderApi, /paymentMethod:\s*z\.literal\('COD'\)/);
  assert.match(orderApi, /\.strict\(\)/);
  assert.doesNotMatch(orderApi, /transactionId:\s*z\.string/);
});

test('order endpoint requires verified Supabase identity and idempotency key', () => {
  assert.match(orderApi, /auth\.getUser\(token\)/);
  assert.match(orderApi, /email_confirmed_at/);
  assert.match(orderApi, /idempotency-key/);
});

test('server sends shipping policy to the atomic database function, not a browser-supplied fee', () => {
  assert.match(orderApi, /p_dhaka_fee:\s*dhakaFee/);
  assert.match(orderApi, /p_outside_dhaka_fee:\s*outsideDhakaFee/);
  assert.match(orderApi, /p_free_shipping_threshold:\s*freeShippingThreshold/);
  assert.doesNotMatch(orderApi, /shippingFee:\s*z\.number/);
});

test('commerce migration enforces row-level security and service-role-only order creation', () => {
  assert.match(commerceMigration, /alter table public\.store_orders enable row level security/i);
  assert.match(commerceMigration, /auth\.uid\(\) = user_id/i);
  assert.match(commerceMigration, /grant execute on function public\.create_customer_order\([\s\S]*?\) to service_role/i);
  assert.match(commerceMigration, /revoke all on function public\.create_customer_order\([\s\S]*?\) from public, anon, authenticated/i);
});

test('database derives item totals and delivery fee from locked catalog prices', () => {
  assert.match(commerceMigration, /for update/i);
  assert.match(commerceMigration, /v_subtotal := v_subtotal \+ v_product\.price \* v_qty/i);
  assert.match(commerceMigration, /when v_subtotal >= p_free_shipping_threshold then 0/i);
  assert.match(commerceMigration, /update public\.store_products set stock = stock - v_qty/i);
});
