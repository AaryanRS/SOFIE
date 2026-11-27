/**
 * validators.ts
 *
 * Pure validation functions that do NOT scan text — they receive a
 * candidate string and return true/false.  Used by detectors to filter
 * candidates before creating a PiiEntity.
 */

// ---------------------------------------------------------------------------
// Luhn algorithm
// ---------------------------------------------------------------------------

/**
 * Validates a credit-card candidate string using the Luhn algorithm.
 *
 * Steps:
 *  1. Strip spaces and hyphens.
 *  2. Reject anything that is not entirely digits.
 *  3. Reject strings outside the typical card-number length range (12–19).
 *  4. Run the Luhn checksum.
 *
 * The algorithm (from right to left):
 *  - Digits at odd positions (1-indexed from the right) are taken as-is.
 *  - Digits at even positions are doubled; if the result > 9, subtract 9.
 *  - Sum all resulting digits; a valid number gives a sum divisible by 10.
 */
export function isValidLuhn(value: string): boolean {
  // Normalise: remove separators that appear in formatted card numbers
  const digits = value.replace(/[\s-]/g, '');

  // Must consist entirely of digits
  if (!/^\d+$/.test(digits)) return false;

  // Credit card numbers are 12–19 digits (Visa, MC, Amex, Discover, etc.)
  if (digits.length < 12 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false; // the rightmost digit is never doubled

  // Traverse from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (shouldDouble) {
      digit *= 2;
      // If doubling produced two digits, subtract 9 (equivalent to summing the two digits)
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

// ---------------------------------------------------------------------------
// IP address octet validation
// ---------------------------------------------------------------------------

/**
 * Returns true when every octet of a dotted-quad string is 0–255.
 * Expects exactly 4 segments separated by dots.
 */
export function isValidIpv4(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const n = parseInt(part, 10);
    return n >= 0 && n <= 255;
  });
}
