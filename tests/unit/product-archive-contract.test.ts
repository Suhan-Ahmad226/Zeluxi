import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const productApi = readFileSync(new URL('../../api/products.ts', import.meta.url), 'utf8');
const adminDashboard = readFileSync(new URL('../../src/components/admin/AdminDashboard.tsx', import.meta.url), 'utf8');

test('product archive endpoint confirms a database row was actually updated', () => {
  assert.match(productApi, /\.update\(\{ published: false, archived: true, updated_at: new Date\(\)\.toISOString\(\) \}\)[\s\S]*?\.eq\('id', id\)[\s\S]*?\.select\('id'\)[\s\S]*?\.maybeSingle\(\)/);
  assert.match(productApi, /if \(!archivedRow\) return res\.status\(404\)/);
});

test('admin catalog hides archived products by default and exposes an archive filter', () => {
  assert.match(adminDashboard, /else if \(p\.archived\) \{\s*return false;/);
  assert.match(adminDashboard, /id: 'ARCHIVED', label: `Archived \(\$\{products\.filter\(\(p\) => p\.archived\)\.length\}\)`/);
  assert.match(adminDashboard, /bulkUpdateProducts\(selectedProductIds, 'restore'\)/);
});
