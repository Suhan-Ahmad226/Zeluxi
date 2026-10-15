import { Language } from '../types';

export function toBengaliDigits(input: number | string): string {
  return String(input);
}

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
): { fee: number; isFree: boolean; provider: 'PATHAO' | 'STEADFAST'; eta: string; etaBn: string } {
  const isDhaka = division.toLowerCase().includes('dhaka');
  const isFree = subtotal >= freeShippingThreshold;

  if (isFree) {
    return {
      fee: 0,
      isFree: true,
      provider: isDhaka ? 'PATHAO' : 'STEADFAST',
      eta: isDhaka ? '24–48 hours' : '2–4 days',
      etaBn: isDhaka ? '24–48 hours' : '2–4 days',
    };
  }

  const fee = isDhaka ? shippingDhaka : shippingOutsideDhaka;
  return {
    fee,
    isFree: false,
    provider: isDhaka ? 'PATHAO' : 'STEADFAST',
    eta: isDhaka ? '24–48 hours' : '2–4 days',
    etaBn: isDhaka ? '24–48 hours' : '2–4 days',
  };
}

export function formatDate(dateString: string, _lang?: Language): string {
  try {
    const d = new Date(dateString.replace(' ', 'T'));
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return d.toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
}
