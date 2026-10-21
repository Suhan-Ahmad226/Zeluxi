/**
 * Unit Tests for Zelux Zod Validation Schemas
 */
import { shippingAddressSchema, bdPhoneRegex } from '../../src/lib/validation/schemas';

export function runValidationTests() {
  console.log('Running Zod Validation Schemas Tests...');

  // Test 1: Bangladesh Phone Regex
  if (!bdPhoneRegex.test('01712334455')) {
    throw new Error('Valid 11-digit BD number failed regex');
  }
  if (!bdPhoneRegex.test('+8801812345678')) {
    throw new Error('Valid international +880 format failed regex');
  }
  if (bdPhoneRegex.test('01212334455')) {
    throw new Error('Invalid prefix 012 falsely passed');
  }

  // Test 2: Valid Delivery Address
  const validAddress = {
    fullName: 'Suhan Ahmad',
    phone: '01712334455',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Gulshan',
    addressDetails: 'Road 11, Block D, House 14',
  };

  const parsedValid = shippingAddressSchema.safeParse(validAddress);
  if (!parsedValid.success) {
    throw new Error(`Valid shipping address failed validation: ${JSON.stringify(parsedValid.error)}`);
  }

  // Test 3: Invalid Delivery Address (short address)
  const invalidAddress = {
    fullName: 'Suhan',
    phone: '01712334455',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Gulshan',
    addressDetails: 'Rd1', // Less than 5 chars
  };

  const parsedInvalid = shippingAddressSchema.safeParse(invalidAddress);
  if (parsedInvalid.success) {
    throw new Error('Short addressDetails should have failed validation');
  }

  console.log('✔ All Zod validation tests passed!');
  return true;
}

runValidationTests();
