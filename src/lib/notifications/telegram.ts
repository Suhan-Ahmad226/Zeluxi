/**
 * Telegram Order Notification Service
 * In-browser delivery is disabled for security reasons to prevent exposure of bot tokens.
 * In production, order alerts must be dispatched through an authenticated server-side endpoint.
 */

export interface TelegramOrderNotificationPayload {
  orderId: string;
  customerName: string;
  customerPhone: string;
  division: string;
  addressDetails: string;
  itemCount: number;
  grandTotal: number;
  paymentMethod: string;
  courierProvider: string;
}

export interface TelegramNotificationResult {
  success: boolean;
  error?: string;
}

export async function sendTelegramOrderNotification(
  payload: TelegramOrderNotificationPayload
): Promise<TelegramNotificationResult> {
  // Telegram bot tokens must never be exposed client-side.
  // This adapter logs safely in non-production / unconfigured environments.
  if (process.env.NODE_ENV !== 'production') {
    console.info('[Telegram Notification Stub] Order notification queued:', payload.orderId);
  }

  return {
    success: false,
    error: 'Telegram delivery is disabled client-side. Real notifications must be dispatched from a secure backend service.',
  };
}
