import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentService } from '../../src/lib/payments/paymentService';
import { SecurityService } from '../../src/lib/security';
import { getCourierProvider } from '../../src/lib/shipping/couriers';
import { EmailService } from '../../src/lib/email';

describe('Production safety: payment, webhook and courier adapters', () => {
  it('does not treat a customer-provided online payment reference as verified payment', async () => {
    await assert.rejects(
      PaymentService.verifyPayment({
        idempotencyKey: 'online-payment-unconfigured-test',
        orderId: 'ZLX-TEST-ONLINE',
        amount: 1500,
        paymentMethod: 'BKASH',
        customerPhone: '01712345678',
        customerEmail: 'customer@example.com',
        transactionReference: 'CUSTOMER-SUPPLIED-TRX',
      }),
      /not configured|unverified/i,
    );
  });

  it('keeps COD orders unpaid until cash is actually collected', async () => {
    const result = await PaymentService.verifyPayment({
      idempotencyKey: 'cod-payment-unconfigured-test',
      orderId: 'ZLX-TEST-COD',
      amount: 1500,
      paymentMethod: 'COD',
      customerPhone: '01712345678',
      customerEmail: 'customer@example.com',
    });

    assert.equal(result.success, true);
    assert.equal(result.paymentStatus, 'UNPAID');
    assert.equal(result.transactionId, '');
  });

  it('rejects webhook signatures until server-side HMAC verification exists', () => {
    assert.equal(SecurityService.verifyWebhookSignature('payload', 'arbitrary-signature', 'secret'), false);
  });

  it('does not report email delivery success without a real provider adapter', async () => {
    const result = await EmailService.sendOrderNotification({} as any);
    assert.equal(result.success, false);
    assert.match(result.error || '', /not configured/i);
  });

  it('never invents successful courier bookings when live provider APIs are not configured', async () => {
    const request = {
      orderId: 'ZLX-TEST-COURIER',
      customerName: 'Test Customer',
      customerPhone: '01712345678',
      deliveryAddress: 'Test Road, Dhaka',
      division: 'Dhaka',
      district: 'Dhaka',
      thanaCity: 'Gulshan',
      itemCount: 1,
      codAmount: 1500,
    };

    for (const providerCode of ['PATHAO', 'STEADFAST', 'IN_HOUSE'] as const) {
      const result = await getCourierProvider(providerCode).createShipment(request);
      assert.equal(result.success, false, providerCode);
      assert.equal(result.consignmentId, '', providerCode);
      assert.equal(result.trackingCode, '', providerCode);
    }
  });
});
