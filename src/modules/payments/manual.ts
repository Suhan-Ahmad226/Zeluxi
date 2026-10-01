import type { PaymentProvider, PaymentResult } from "./contracts";
type PaymentInput = Parameters<PaymentProvider["createPayment"]>[0];
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "MANUAL";
  async createPayment(input: PaymentInput): Promise<PaymentResult> {
    return { provider: this.name, providerReference: `MANUAL-${input.orderId}`, status: "PENDING" };
  }
  async verifyPayment(providerReference: string): Promise<PaymentResult> {
    return { provider: this.name, providerReference, status: "PENDING" };
  }
}