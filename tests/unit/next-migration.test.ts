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

test('Next.js App Router contains application entry and commerce route handlers', () => {
  assert.ok(existsSync(new URL('app/layout.tsx', root)));
  assert.ok(existsSync(new URL('app/page.tsx', root)));
  assert.ok(existsSync(new URL('app/api/orders/route.ts', root)));
  assert.ok(existsSync(new URL('app/api/products/route.ts', root)));
  assert.match(read('vercel.json'), /nextjs/);
});

test('browser Supabase config uses public Next.js environment variables, never Vite env', () => {
  const client = read('src/lib/supabase.ts');
  assert.match(client, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(client, /import\.meta|VITE_/);
});
