/**
 * Normalize phone number for consistent lookup
 * Strips +, spaces, dashes, dots — keeps only digits
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
