/**
 * Formats a database order_number for customer-facing display.
 * The internal UUID remains the order's primary key and API relationship ID.
 */
export function formatOrderNumber(value: unknown): string | undefined {
  let digits: string;

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 1) return undefined;
    digits = String(value);
  } else if (typeof value === 'string' && /^\d+$/.test(value)) {
    digits = value.replace(/^0+(?=\d)/, '');
  } else {
    return undefined;
  }

  if (!digits || /^0+$/.test(digits)) return undefined;
  return `ZLX-${digits.padStart(6, '0')}`;
}
