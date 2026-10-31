import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

test('social marketing goals are constrained in the database and persisted by the API', () => {
  const migration = read('supabase/migrations/20261031100000_social_content_goals.sql');
  const api = read('app/api/admin/social/route.ts');
  const component = read('src/components/admin/SocialPostStudio.tsx');

  for (const goal of ['PRODUCT_SHOWCASE', 'PRODUCT_EDUCATION', 'NEW_ARRIVAL', 'OFFER_CAMPAIGN', 'CUSTOMER_TRUST', 'ENGAGEMENT']) {
    assert.match(migration, new RegExp(goal));
    assert.match(api, new RegExp(goal));
    assert.match(component, new RegExp(goal));
  }
  assert.match(migration, /content_goal text not null default 'PRODUCT_SHOWCASE'/);
  assert.match(api, /content_goal: contentGoal/);
  assert.match(api, /patch\.content_goal = body\.contentGoal/);
  assert.match(api, /contentGoal: z\.enum/);
});

test('AI marketing prompt prohibits fabricated reviews, discounts and delivery promises', () => {
  const server = read('src/lib/social/server.ts');
  assert.match(server, /Never invent discounts/);
  assert.match(server, /reviews/);
  assert.match(server, /delivery promises/);
  assert.match(server, /verified review text is explicitly supplied/);
});

test('Social Studio exposes responsive workflow views without claiming unavailable integrations', () => {
  const component = read('src/components/admin/SocialPostStudio.tsx');
  assert.match(component, /content calendar/i);
  assert.match(component, /Publishing history/i);
  assert.match(component, /Recurring campaigns/i);
  assert.match(component, /Platform insights are not connected yet/);
  assert.match(component, /Not connected · setup and API review required/);
  assert.match(component, /sm:grid-cols/);
  assert.match(component, /xl:grid-cols/);
});
