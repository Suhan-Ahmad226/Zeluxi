/**
 * Lofimart Telegram Bot Notification Service
 * Sends instant order dispatches and merchant alerts
 */

export interface OrderAlertPayload {
  orderId: string;
  customerName: string;
  customerPhone: string;
  division: string;
  addressDetails: string;
  itemCount: number;
  grandTotal: number;
  paymentMethod: string;
  courierProvider: string;
  trackingCode?: string;
}

/**
 * Telegram notifications must be sent by a trusted server endpoint. Never put a
 * Telegram bot token in a Vite client bundle or return success without delivery.
 */
export async function sendTelegramOrderNotification(_payload: OrderAlertPayload): Promise<boolean> {
  // No server-side notification endpoint is implemented in this Vite SPA.
  // Intentionally fail closed; add a protected server endpoint before enabling.
  return false;
}
