import test from 'node:test';
import assert from 'node:assert/strict';
import { PaymentService } from '../../src/lib/payments/paymentService';
import {
  PathaoCourierProvider,
  SteadfastCourierProvider,
} from '../../src/lib/shipping/couriers';

const baseRequest = {
  idempotencyKey: 'payment-test-cod-001',
  orderId: 'ZLX-TEST-0001',
  amount: 1200,
  paymentMethod: 'COD' as const,
  customerPhone: '01712345678',
  customerEmail: 'customer@example.com',
};

test('COD validation never marks money as already paid', async () => {
  const result = await PaymentService.verifyPayment(baseRequest);

  assert.equal(result.success, true);
  assert.equal(result.paymentStatus, 'UNPAID');
  assert.equal(result.paymentMethod, 'COD');
  assert.equal(result.amount, 1200);
});

test('online payment methods fail closed until server-side verification exists', async () => {
  await assert.rejects(
    PaymentService.verifyPayment({
      ...baseRequest,
      idempotencyKey: 'payment-test-bkash-001',
      paymentMethod: 'BKASH',
      transactionReference: 'CUSTOMER-SUPPLIED-TRX',
    }),
    /Live BKASH payment verification is not configured/
  );
});

test('missing idempotency key is rejected', async () => {
  await assert.rejects(
    PaymentService.verifyPayment({
      ...baseRequest,
      idempotencyKey: '',
    }),
    /Idempotency key is required/
  );
});

test('Pathao booking fails closed rather than returning a fake success', async () => {
  const provider = new PathaoCourierProvider();
  const result = await provider.createShipment({
    orderId: 'ZLX-TEST-0002',
    customerName: 'Test Customer',
    customerPhone: '01712345678',
    deliveryAddress: 'Test address, Dhaka',
    division: 'Dhaka',
    district: 'Dhaka',
    itemCount: 1,
    codAmount: 1200,
  });

  assert.equal(result.success, false);
  assert.match(result.errorMessage ?? '', /not implemented/i);
  assert.equal(result.trackingCode, '');
});

test('Steadfast booking fails closed rather than returning a fake success', async () => {
  const provider = new SteadfastCourierProvider();
  const result = await provider.createShipment({
    orderId: 'ZLX-TEST-0003',
    customerName: 'Test Customer',
    customerPhone: '01712345678',
    deliveryAddress: 'Test address, Dhaka',
    division: 'Dhaka',
    district: 'Dhaka',
    itemCount: 1,
    codAmount: 1200,
  });

  assert.equal(result.success, false);
  assert.match(result.errorMessage ?? '', /not implemented/i);
  assert.equal(result.trackingCode, '');
});
