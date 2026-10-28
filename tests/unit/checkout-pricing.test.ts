import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const checkout = read('src/components/checkout/CheckoutModal.tsx');
const quoteApi = read('app/api/shipping/quote/route.ts');
const locationsApi = read('app/api/shipping/locations/route.ts');
const quoteService = read('src/lib/shipping/pathao-checkout.ts');
const orderApi = read('src/server/orders-handler.ts');
const migration = read('supabase/migrations/20261026100000_checkout_pricing_and_coupons.sql');

test('Pathao city, zone and area matching stays server-side with no courier controls in checkout', () => {
  assert.doesNotMatch(checkout, /Pathao city \*/);
  assert.doesNotMatch(checkout, /Pathao zone \*/);
  assert.doesNotMatch(checkout, /Pathao delivery area \*/);
  assert.doesNotMatch(checkout, /Save this address for next time/);
  assert.doesNotMatch(checkout, /Saved addresses are not available/);
  assert.doesNotMatch(checkout, /Pathao Express Logistics/);
  assert.match(checkout, /addressDetails: addressDetails\.trim\(\)/);
  assert.match(quoteApi, /addressDetails: z\.string\(\)\.trim\(\)/);
  assert.match(quoteService, /const rankedAreas = areas\.map/);
  assert.match(quoteService, /PATHAO_AREA_MAPPING_REQUIRED/);
  assert.match(orderApi, /addressDetails: parsed\.data\.customer\.addressDetails/);
  assert.match(orderApi, /pathaoAreaId: quote\.areaId/);
});

test('shipping quote is calculated from catalog prices and product weights, never browser totals', () => {
  assert.match(quoteService, /select\('id,name,price,stock,published,archived,product_data'\)/);
  assert.match(quoteService, /calculatePathaoPrice/);
  assert.match(quoteService, /codEnabled: Number\(rate\.cod_enabled \|\| 0\) === 1/);
  assert.match(orderApi, /parsed\.data\.paymentMethod === 'COD' && !quote\.codEnabled/);
  assert.match(orderApi, /PATHAO_COD_UNAVAILABLE/);
  assert.match(quoteService, /PRODUCT_WEIGHT_REQUIRED/);
  assert.equal(quoteService.includes('PATHAO_DEFAULT_ITEM_WEIGHT_KG || 0.5'), false);
  assert.match(read('src/lib/shipping/pathao-booking.ts'), /PRODUCT_WEIGHT_REQUIRED/);
  assert.match(quoteService, /home_delivery_available/);
  assert.match(orderApi, /quotePathaoCheckout\(admin/);
  assert.match(orderApi, /p_expected_subtotal:\s*quote\.subtotal/);
});

test('database applies coupon and COD math atomically with order and inventory changes', () => {
  assert.match(migration, /add column if not exists cod_fee/i);
  assert.match(migration, /add column if not exists coupon_code/i);
  assert.match(migration, /add column if not exists pathao_delivery_fee/i);
  assert.equal(migration.includes('drop function if exists public.create_customer_order'), false);
  assert.match(migration, /v_discount := round\(v_subtotal \* v_coupon_value \/ 100, 2\)/);
  assert.match(migration, /v_cod_fee := ceil\(greatest\(0, v_subtotal \+ v_shipping_fee - v_discount\)/);
  assert.match(migration, /update public\.store_content[\s\S]*usageCount/);
  assert.match(migration, /p_expected_subtotal is null or abs\(v_subtotal - p_expected_subtotal\) > 0\.01/i);
  assert.match(migration, /grant execute on function public\.create_customer_order\([\s\S]*?to service_role/i);
  assert.match(migration, /jsonb_typeof\(v_coupon->'usedBy'\) = 'array'/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\(p_user_id::text\), hashtext\(p_idempotency_key\)\)/);
  assert.match(migration, /v_coupon_user_usage >= greatest\(1, coalesce\(nullif\(v_coupon->>'perUserLimit'/);
});
