/**
 * Security & Data Sanitization Utilities for Zelux
 * Protects against XSS, validates webhook signatures with timing safety, and sanitizes input.
 */

export class SecurityService {
  /**
   * Basic XSS input sanitization for user comments, reviews, and notes
   */
  static sanitizeText(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Constant-time string comparison to defend against timing attacks on webhook signatures
   */
  static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Validates webhook signatures using secret key
   */
  static verifyWebhookSignature(_payload: string, _signature: string, _secret: string): boolean {
    // Webhook verification must run on a trusted server using the provider's
    // documented HMAC/signature scheme. This browser-side utility cannot safely
    // verify provider webhooks; fail closed instead of accepting every signature.
    return false;
  }

  /**
   * Mask sensitive phone numbers for public logs (e.g. 017****4455)
   */
  static maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return '***';
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }
}
