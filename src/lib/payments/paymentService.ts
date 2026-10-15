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
    const { idempotencyKey, orderId, amount, paymentMethod, transactionReference } = request;

    if (!idempotencyKey) {
      throw new Error('Security Error: Idempotency key is required to prevent double-charging.');
    }

    if (processedIdempotencyKeys.has(idempotencyKey)) {
      throw new Error('Duplicate Request: This transaction has already been captured and processed.');
    }

    const now = new Date().toISOString();

    if (paymentMethod === 'COD') {
      processedIdempotencyKeys.add(idempotencyKey);
      return {
        success: true,
        transactionId: `COD-${orderId}`,
        amount,
        paymentStatus: 'UNPAID',
        paymentMethod: 'COD',
        gatewayFee: 0,
        verifiedAt: now,
        message: 'Order verified for Cash on Delivery collection upon handover.',
      };
    }

    // Online payment methods must never be marked PAID from a client-supplied
    // transaction reference. Until server-side gateway initiation and callback
    // signature verification are configured, fail closed.
    throw new Error(
      `Online payment provider "${paymentMethod}" is not configured for verified production payments. Please choose Cash on Delivery or contact support.`
    );

    throw new Error(`Unsupported payment provider: ${paymentMethod}`);
  }
}
