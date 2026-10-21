import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderNumber } from '../../src/lib/orders/order-number';

test('formats sequential order numbers for display', () => {
  assert.equal(formatOrderNumber(1), 'ZLX-000001');
  assert.equal(formatOrderNumber(125), 'ZLX-000125');
  assert.equal(formatOrderNumber('1234567'), 'ZLX-1234567');
});

test('normalizes numeric strings and rejects invalid identifiers', () => {
  assert.equal(formatOrderNumber('000125'), 'ZLX-000125');
  assert.equal(formatOrderNumber(0), undefined);
  assert.equal(formatOrderNumber(-1), undefined);
  assert.equal(formatOrderNumber('not-a-number'), undefined);
  assert.equal(formatOrderNumber(Number.MAX_SAFE_INTEGER + 1), undefined);
});
