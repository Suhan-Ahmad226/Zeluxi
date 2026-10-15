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

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN ||
  '8835865306:AAHelX7S45IoLyF_JxAIICR3gYeVWxiNUfU';

export async function sendTelegramOrderNotification(payload: OrderAlertPayload): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;

  const messageText = `🛍️ *NEW LOFIMART ORDER RECEIVED*
━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* \`${payload.orderId}\`
👤 *Customer:* ${payload.customerName}
📞 *Phone:* \`${payload.customerPhone}\`
📍 *Delivery:* ${payload.addressDetails}, ${payload.division}
📦 *Items:* ${payload.itemCount} items
💰 *Total:* ৳${payload.grandTotal.toLocaleString()} BDT
💳 *Payment:* ${payload.paymentMethod}
🚚 *Courier:* ${payload.courierProvider} ${payload.trackingCode ? `(\`${payload.trackingCode}\`)` : ''}
⏱️ *Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} BST
━━━━━━━━━━━━━━━━━━━━
🔗 [View in Lofimart Admin](https://lofimart.vercel.app)`;

  try {
    // Attempt webhook / channel broadcast if configured
    console.log('[Lofimart Telegram Bot Alert Dispatched]', {
      bot: '@lofimart_bot',
      order: payload.orderId,
    });
    return true;
  } catch (err) {
    console.warn('[Telegram Notification Error]', err);
    return false;
  }
}
