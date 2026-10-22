import { Language } from '../types';

export function formatPrice(amount: number, _lang?: Language): string {
  const formatted = amount.toLocaleString('en-US');
  return `৳${formatted}`;
}

export function calculateShipping(
  division: string,
  subtotal: number,
  freeShippingThreshold: number,
  shippingDhaka: number,
  shippingOutsideDhaka: number
): { fee: number; isFree: boolean; provider: 'PATHAO' | 'STEADFAST'; eta: string } {
  const isDhaka = division.toLowerCase().includes('dhaka');
  const isFree = subtotal >= freeShippingThreshold;

  if (isFree) {
    return {
      fee: 0,
      isFree: true,
      provider: isDhaka ? 'PATHAO' : 'STEADFAST',
      eta: isDhaka ? '24–48 hours' : '2–4 days',
    };
  }

  const fee = isDhaka ? shippingDhaka : shippingOutsideDhaka;
  return {
    fee,
    isFree: false,
    provider: isDhaka ? 'PATHAO' : 'STEADFAST',
    eta: isDhaka ? '24–48 hours' : '2–4 days',
  };
}

/**
 * Render stored timestamps consistently for Bangladesh customers and admins.
 * Database timestamps remain UTC; only presentation uses Asia/Dhaka.
 */
export function formatDate(dateString: string, _lang?: Language): string {
  try {
    const normalized = dateString.trim().replace(' ', 'T');
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);
    const value = !hasTimezone && normalized.includes('T') ? `${normalized}Z` : normalized;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return dateString;

    const datePart = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Dhaka',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka',
    }).format(date);

    return `${datePart}, ${timePart}`;
  } catch {
    return dateString;
  }
}
