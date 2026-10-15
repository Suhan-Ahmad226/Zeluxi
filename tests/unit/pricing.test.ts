/**
 * Unit Tests for Zelux Financial & Shipping Logic
 */
import { formatPrice, calculateShipping } from '../../src/utils/formatters';

export function runPricingTests() {
  console.log('Running Pricing & Shipping Logic Tests...');

  // Test 1: BDT Price formatting
  const priceEn = formatPrice(6850, 'en');
  if (priceEn !== '৳6,850') {
    throw new Error(`Expected ৳6,850, got ${priceEn}`);
  }

  const priceBn = formatPrice(6850, 'bn');
  if (!priceBn.includes('৬,৮৫০')) {
    throw new Error(`Expected Bengali formatted price, got ${priceBn}`);
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

  console.log('✔ All Pricing & Shipping unit tests passed!');
  return true;
}

runPricingTests();
