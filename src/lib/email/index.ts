/**
 * Transactional Email Notification Adapter for Zelux
 * Generates a branded HTML email template. Delivery is intentionally disabled until a real
 * server-side SMTP/Resend/SendGrid adapter is implemented.
 */

import { Order } from '../../types';
import { formatPrice } from '../../utils/formatters';

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;')
  .replace(/'/g, '&#x27;');

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  provider: 'SMTP' | 'CONSOLE_LOG';
  error?: string;
}

export class EmailService {
  /**
   * Generates formatted order confirmation email template
   */
  static renderOrderConfirmationHtml(order: Order): string {
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 12px 0;">
            <p style="margin: 0; font-weight: 600; color: #0F172A;">${escapeHtml(item.productName)}</p>
            ${item.variantLabel ? `<p style="margin: 2px 0 0; font-size: 12px; color: #64748B;">${escapeHtml(item.variantLabel)}</p>` : ''}
          </td>
          <td style="padding: 12px 0; text-align: center; color: #475569;">x${item.quantity}</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #0F172A;">${formatPrice(item.price * item.quantity)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 24px 0; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color: #4F46E5; padding: 24px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; letter-spacing: 1px;">ZELUX</h1>
            <p style="color: #E0E7FF; margin: 6px 0 0; font-size: 13px;">Bangladesh Atelier & Lifestyle Goods</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="font-size: 18px; color: #0F172A; margin: 0 0 12px;">Thank you for your order, ${escapeHtml(order.customer.fullName)}!</h2>
            <p style="font-size: 14px; color: #475569; margin: 0 0 20px;">
              Your order <strong>#${escapeHtml(order.id)}</strong> has been received. We will confirm fulfillment details after the order is verified.
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
              <thead>
                <tr style="border-bottom: 2px solid #CBD5E1; text-align: left; color: #64748B; font-size: 12px; text-transform: uppercase;">
                  <th style="padding-bottom: 8px;">Item</th>
                  <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                  <th style="padding-bottom: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="background-color: #F8FAFC; padding: 16px; border-radius: 8px; font-size: 14px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748B;">Subtotal:</span>
                <span style="font-weight: 600;">${formatPrice(order.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748B;">Delivery Fee (${escapeHtml(order.customer.division)}):</span>
                <span style="font-weight: 600;">${order.shippingFee === 0 ? 'FREE' : formatPrice(order.shippingFee)}</span>
              </div>
              ${order.discount ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16A34A;">
                <span>Discount:</span>
                <span>-${formatPrice(order.discount)}</span>
              </div>` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 1px solid #E2E8F0; padding-top: 8px; margin-top: 8px;">
                <span>Grand Total:</span>
                <span style="color: #4F46E5;">${formatPrice(order.grandTotal)}</span>
              </div>
            </div>
            <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 0;">
              Zelux Customer Support
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Dispatch notification safely
   */
  static async sendOrderNotification(_order: Order): Promise<EmailDispatchResult> {
    // No SMTP/Resend provider client is implemented in this SPA. Never return success for a
    // notification that was not actually sent; real delivery belongs in a server-side service.
    return {
      success: false,
      provider: 'CONSOLE_LOG',
      error: 'Email delivery is not configured. Add a server-side SMTP/Resend adapter before enabling order notifications.',
    };
  }
}
