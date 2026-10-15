/**
 * Zelux Payment Verification & Idempotency Service
 * Supports Cash on Delivery, bKash, Nagad, DBBL Rocket, and SSLCommerz
 */

import { PaymentMethod, PaymentStatus } from '../../types';

export interface PaymentInitiationRequest {
  idempotencyKey: string;
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  customerPhone: string;
  customerEmail: string;
  transactionReference?: string;
}

export interface PaymentValidationResult {
  success: boolean;
  transactionId: string;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  gatewayFee: number;
  verifiedAt: string;
  message: string;
}

// In-memory idempotency cache to protect against duplicate submission
const processedIdempotencyKeys = new Set<string>();

export class PaymentService {
  /**
   * Validates and verifies transaction state
   */
  static async verifyPayment(request: PaymentInitiationRequest): Promise<PaymentValidationResult> {
    const { idempotencyKey, orderId, amount, paymentMethod } = request;

    if (!idempotencyKey) {
      throw new Error('Security Error: Idempotency key is required to prevent double-charging.');
    }

    if (processedIdempotencyKeys.has(idempotencyKey)) {
      throw new Error('Duplicate Request: This transaction has already been captured and processed.');
    }

    // This frontend has no server-side gateway verification yet. Never trust a customer-supplied TrxID
    // or manufacture a successful payment result for an online payment method.
    if (paymentMethod !== 'COD') {
      throw new Error(`Live ${paymentMethod} payment verification is not configured. The payment remains unverified.`);
    }

    processedIdempotencyKeys.add(idempotencyKey);

    const now = new Date().toISOString();

    if (paymentMethod === 'COD') {
      return {
        success: true,
        transactionId: '',
        amount,
        paymentStatus: 'UNPAID',
        paymentMethod: 'COD',
        gatewayFee: 0,
        verifiedAt: now,
        message: 'Order verified for Cash on Delivery collection upon handover.',
      };
    }

    throw new Error(`Unsupported payment provider: ${paymentMethod}`);
  }
}
