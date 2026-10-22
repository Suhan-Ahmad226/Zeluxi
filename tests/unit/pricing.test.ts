/**
 * Unit Tests for Zelux Financial & Shipping Logic
 */
import { formatPrice, calculateShipping, formatDate, formatDateOnly } from '../../src/utils/formatters';

export function runPricingTests() {
  console.log('Running Pricing & Shipping Logic Tests...');

  // Test 1: BDT Price formatting
  const priceEn = formatPrice(6850);
  if (priceEn !== '৳6,850') {
    throw new Error(`Expected ৳6,850, got ${priceEn}`);
  }

  // Test 2: Shipping Inside Dhaka
  const dhakaShipping = calculateShipping('Dhaka', 2000, 3500, 60, 120);
  if (dhakaShipping.fee !== 60 || dhakaShipping.provider !== 'PATHAO') {
    throw new Error('Dhaka shipping calculation failed');
  }

  // Test 3: Shipping Outside Dhaka
  const outsideShipping = calculateShipping('Chattogram', 2000, 3500, 60, 120);
  if (outsideShipping.fee !== 120 || outsideShipping.provider !== 'STEADFAST') {
    throw new Error('Outside Dhaka shipping calculation failed');
  }

  // Test 4: Free shipping over threshold (৳3,500)
  const freeShipping = calculateShipping('Sylhet', 4200, 3500, 60, 120);
  if (freeShipping.fee !== 0 || !freeShipping.isFree) {
    throw new Error('Free shipping threshold qualification failed');
  }

  // Test 5: UTC order timestamps display in Bangladesh local time.
  const dhakaOrderDate = formatDate('2026-10-21T20:02:31.642302+00:00');
  if (dhakaOrderDate !== '22 Oct 2026, 2:02 AM') {
    throw new Error(`Expected Bangladesh order time "22 Oct 2026, 2:02 AM", got "${dhakaOrderDate}"`);
  }

  // Test 6: Date-only fields remain date-only (no fabricated time).
  const couponExpiry = formatDateOnly('2026-12-31');
  if (couponExpiry !== '31 Dec 2026') {
    throw new Error(`Expected date-only value "31 Dec 2026", got "${couponExpiry}"`);
  }

  // Test 7: Invalid timestamp is preserved instead of throwing.
  const invalidDate = formatDate('not-a-date');
  if (invalidDate !== 'not-a-date') {
    throw new Error('Invalid timestamp fallback failed');
  }

  console.log('✔ All Pricing & Shipping unit tests passed!');
  return true;
}

runPricingTests();
