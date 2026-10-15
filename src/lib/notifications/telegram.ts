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

export async function sendTelegramOrderNotification(_payload: OrderAlertPayload): Promise<boolean> {
  // Telegram bot tokens must never be embedded in a browser bundle. This app has no authenticated
  // server-side notification endpoint yet, so report unavailable rather than pretending delivery worked.
  console.warn('[Telegram Notification] Disabled until a server-side notification endpoint is configured.');
  return false;
}
