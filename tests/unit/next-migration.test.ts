import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

test('project tooling is Next.js App Router based and contains no Vite dependency/config', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const allDependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(pkg.dependencies.next, 'Next.js must be installed');
  assert.match(pkg.scripts.dev, /next dev/);
  assert.match(pkg.scripts.build, /next build/);
  assert.ok(!Object.keys(allDependencies).some((name) => /(^|[-@])vite($|[-/])|vitejs/i.test(name)));
  assert.ok(!existsSync(new URL('vite.config.ts', root)));
  assert.ok(!existsSync(new URL('index.html', root)));
  assert.ok(!existsSync(new URL('src/main.tsx', root)));
  assert.ok(!existsSync(new URL('src/patchFetch.ts', root)));
});

test('App Router exposes the known customer and admin entry URLs', () => {
  for (const route of ['app/page.tsx', 'app/shop/page.tsx', 'app/tracking/page.tsx', 'app/account/page.tsx', 'app/admin/page.tsx', 'app/verify-email/page.tsx']) {
    assert.ok(existsSync(new URL(route, root)), `Missing App Router route: ${route}`);
    assert.match(read(route), /NextStoreApp/);
  }
  assert.ok(existsSync(new URL('app/layout.tsx', root)));
  assert.ok(existsSync(new URL('app/api/orders/route.ts', root)));
  assert.ok(existsSync(new URL('app/api/products/route.ts', root)));
  assert.match(read('vercel.json'), /nextjs/);
});

test('browser Supabase config uses public Next.js environment variables, never Vite env', () => {
  const client = read('src/lib/supabase.ts');
  assert.match(client, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(client, /import\\.meta|VITE_/);
});


test('variant checkout persists immutable invoice snapshots and requires a selected variant', () => {
  const migration = read('supabase/migrations/20261019000000_variant_order_invoice.sql');
  const orderApi = read('api/orders.ts');
  const productDetails = read('src/components/storefront/ProductDetailsPage.tsx');
  const invoice = read('src/components/checkout/OrderSuccessModal.tsx');

  for (const column of ['variant_id', 'variant_label', 'variant_sku', 'variant_attributes', 'image_url']) {
    assert.match(migration, new RegExp('add column if not exists ' + column));
  }
  assert.match(migration, /Please select a product variant/);
  assert.match(migration, /variantId/);
  assert.match(orderApi, /variantId: z\.string\(\)/);
  assert.match(orderApi, /variant_label/);
  assert.match(orderApi, /variant_sku/);
  assert.match(orderApi, /VARIANT_ORDER_SCHEMA_NOT_READY/);
  assert.match(orderApi, /select\('variant_id,variant_label,variant_sku,variant_attributes,image_url'\)/);
  assert.match(productDetails, /Select an option/);
  assert.match(productDetails, /requiresVariantSelection/);
  assert.match(invoice, /variantSku/);
  assert.match(invoice, /Print Invoice/);
});
