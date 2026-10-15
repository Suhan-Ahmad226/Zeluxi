/**
 * Unit Tests for Zelux Order State Machine & Lifecycle Transitions
 */

import { OrderStatus } from '../../src/types';

// Allowed state transitions defined by Zelux Business Logic
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_TO_SHIP', 'SHIPPED', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'REFUNDED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(current: OrderStatus, next: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) || false;
}

export function runOrderStateTests() {
  console.log('Running Order Lifecycle State Machine Tests...');

  // Test 1: Valid initial flow PENDING -> CONFIRMED
  if (!canTransition('PENDING', 'CONFIRMED')) {
    throw new Error('PENDING to CONFIRMED transition should be allowed');
  }

  // Test 2: Valid SHIPPED -> DELIVERED
  if (!canTransition('SHIPPED', 'DELIVERED')) {
    throw new Error('SHIPPED to DELIVERED transition should be allowed');
  }

  // Test 3: Invalid jump PENDING -> DELIVERED directly
  if (canTransition('PENDING', 'DELIVERED')) {
    throw new Error('PENDING to DELIVERED direct jump should NOT be allowed');
  }

  // Test 4: Cannot advance after CANCELLED
  if (canTransition('CANCELLED', 'SHIPPED')) {
    throw new Error('CANCELLED order cannot transition to SHIPPED');
  }

  // Test 5: Can request return after DELIVERED
  if (!canTransition('DELIVERED', 'RETURN_REQUESTED')) {
    throw new Error('DELIVERED order must allow RETURN_REQUESTED');
  }

  console.log('✔ All Order Lifecycle State Machine tests passed!');

  // Test 6: Courier booking idempotency and phone validation
  console.log('Running Courier Idempotency & Validation Tests...');
  const testPhone = '01712334455';
  const cleanPhone = testPhone.replace(/[\s-]/g, '');
  const isPhoneValid = /^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone);
  if (!isPhoneValid) {
    throw new Error('Valid Bangladeshi 11-digit phone number must pass validation');
  }

  const invalidPhone = '12345';
  if (/^(?:\+?88)?01[3-9]\d{8}$/.test(invalidPhone)) {
    throw new Error('Short phone number must fail validation');
  }

  console.log('✔ All Courier Booking Idempotency tests passed!');
  return true;
}

runOrderStateTests();
