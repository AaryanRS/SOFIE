/**
 * detectors.ts
 *
 * Individual PII detector functions.  Each detector:
 *   - Accepts the full input text string.
 *   - Returns an array of PiiEntity objects (may be empty).
 *   - NEVER modifies the input string.
 *   - NEVER performs redaction.
 *   - Preserves the original matched value (no normalisation of the returned value).
 *   - Returns accurate start/end character indexes so that
 *     `text.slice(entity.start, entity.end) === entity.value` always holds.
 */

import { EntityType, PiiEntity } from './types.js';
import { isValidIpv4, isValidLuhn } from './validators.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect all non-overlapping regex matches from `text`.
 * Returns raw RegExpExecArray objects so callers can inspect groups.
 */
function matchAll(pattern: RegExp, text: string): RegExpExecArray[] {
  // Ensure the regex has the global flag
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const results: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push(m);
    // Prevent infinite loop on zero-length matches
    if (m[0].length === 0) re.lastIndex++;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Email detector
// ---------------------------------------------------------------------------

/**
 * Detects common email addresses.
 * Covers: local+tag@sub.domain.tld
 * Intentionally practical — does not implement full RFC 5322.
 */
export function detectEmails(text: string): PiiEntity[] {
  const entities: PiiEntity[] = [];

  // Use a simple global regex; iterate manually to get correct indexes
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = m[0];
    const start = m.index;
    const end = start + value.length;

    // Basic sanity: must have at least one dot in the domain part
    const atIdx = value.indexOf('@');
    const domain = value.slice(atIdx + 1);
    if (!domain.includes('.')) continue;

    entities.push({ type: EntityType.EMAIL, value, start, end });
  }

  return entities;
}

// ---------------------------------------------------------------------------
// Phone number detector
// ---------------------------------------------------------------------------

/**
 * Detects Indian phone numbers in common formats:
 *   9876543210
 *   +91 9876543210
 *   +91-9876543210
 *   09876543210
 *
 * Uses word boundaries and negative look-around to avoid matching arbitrary
 * long digit strings (e.g. credit-card numbers or Aadhaar).
 *
 * The regex captures the full token including country code / leading zero.
 */
export function detectPhones(text: string): PiiEntity[] {
  const entities: PiiEntity[] = [];

  // Track covered character ranges to avoid returning sub-matches of longer matches.
  // A new match is accepted only if its entire range does not overlap an already-accepted range.
  const covered: Array<{ start: number; end: number }> = [];

  const isOverlap = (start: number, end: number) =>
    covered.some((r) => start < r.end && end > r.start);

  const addMatch = (value: string, start: number) => {
    const end = start + value.length;
    if (!isOverlap(start, end)) {
      covered.push({ start, end });
      entities.push({ type: EntityType.PHONE, value, start, end });
    }
  };

  let m: RegExpExecArray | null;

  // Priority 1: +91 prefix variants (e.g. +91 9876543210, +91-9876543210)
  const re1 = /(?<!\d)(\+91[\s\-]?[6-9]\d{9})(?!\d)/g;
  while ((m = re1.exec(text)) !== null) addMatch(m[0], m.index);

  // Priority 2: 0-prefixed 10-digit numbers (e.g. 09876543210)
  const re2 = /(?<!\d)(0[6-9]\d{9})(?!\d)/g;
  while ((m = re2.exec(text)) !== null) addMatch(m[0], m.index);

  // Priority 3: bare 10-digit numbers starting with 6-9
  // These will be skipped if the digits were already captured as part of a longer +91 match.
  const re3 = /(?<!\d)([6-9]\d{9})(?!\d)/g;
  while ((m = re3.exec(text)) !== null) addMatch(m[0], m.index);

  return entities;
}

// ---------------------------------------------------------------------------
// IP address detector
// ---------------------------------------------------------------------------

/**
 * Detects valid IPv4 addresses.
 * Uses a broad numeric pattern first, then validates each octet (0–255)
 * to avoid false positives like 999.999.999.999.
 */
const IPV4_CANDIDATE_RE = /(?<!\d)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?!\d)/g;

export function detectIPs(text: string): PiiEntity[] {
  const entities: PiiEntity[] = [];
  const matches = matchAll(IPV4_CANDIDATE_RE, text);

  for (const m of matches) {
    const value = m[0];
    if (isValidIpv4(value)) {
      entities.push({ type: EntityType.IP, value, start: m.index, end: m.index + value.length });
    }
  }

  return entities;
}

// ---------------------------------------------------------------------------
// Indian PAN detector
// ---------------------------------------------------------------------------

/**
 * Detects Indian Permanent Account Numbers.
 * Format: 5 uppercase letters + 4 digits + 1 uppercase letter  (AAAAA9999A)
 * Case-insensitive matching; the original casing is preserved in the result.
 *
 * Word boundaries prevent matching inside longer strings.
 */
const PAN_RE = /(?<![A-Z0-9])([A-Z]{5}[0-9]{4}[A-Z])(?![A-Z0-9])/gi;

export function detectPANs(text: string): PiiEntity[] {
  const entities: PiiEntity[] = [];
  const matches = matchAll(PAN_RE, text);

  for (const m of matches) {
    const value = m[0];
    // Validate strict structure on the uppercased version to be safe
    if (/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(value)) {
      entities.push({ type: EntityType.PAN, value, start: m.index, end: m.index + value.length });
    }
  }

  return entities;
}

// ---------------------------------------------------------------------------
// Aadhaar detector
// ---------------------------------------------------------------------------

/**
 * Detects Indian Aadhaar numbers in three common formats:
 *   123456789012          (12 consecutive digits)
 *   1234 5678 9012        (3 groups of 4, space-separated)
 *   1234-5678-9012        (3 groups of 4, hyphen-separated)
 *
 * After stripping separators, the normalised number must be exactly 12 digits.
 * Word-boundary look-arounds prevent matching subsets of longer numbers.
 */
const AADHAAR_RE =
  /(?<!\d)(\d{4}[\s\-]\d{4}[\s\-]\d{4}|\d{12})(?!\d)/g;

export function detectAaadhaars(text: string): PiiEntity[] {
  const entities: PiiEntity[] = [];
  const matches = matchAll(AADHAAR_RE, text);

  for (const m of matches) {
    const value = m[0];
    // Normalise to digits only and confirm exactly 12 digits
    const digits = value.replace(/[\s\-]/g, '');
    if (digits.length === 12 && /^\d{12}$/.test(digits)) {
      entities.push({ type: EntityType.AADHAAR, value, start: m.index, end: m.index + value.length });
    }
  }

  return entities;
}

// ---------------------------------------------------------------------------
// Credit card detector
// ---------------------------------------------------------------------------

/**
 * Detects credit-card candidates in common formats:
 *   4111111111111111       (16 digits, no separator)
 *   4111 1111 1111 1111   (4×4, space-separated)
 *   4111-1111-1111-1111   (4×4, hyphen-separated)
 *
 * A candidate is ONLY returned as a confirmed credit_card entity if it
 * passes the Luhn checksum.  This distinction prevents false positives.
 *
 * Also handles 15-digit Amex (4-6-5 grouping) and 13-digit Visa.
 */
const CC_CANDIDATE_RE =
  /(?<!\d)(\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}|\d{4}[\s\-]\d{6}[\s\-]\d{5}|\d{13,19})(?!\d)/g;

export function detectCreditCards(text: string): PiiEntity[] {
  const entities: PiiEntity[] = [];
  const matches = matchAll(CC_CANDIDATE_RE, text);

  for (const m of matches) {
    const value = m[0];
    // Only emit as credit_card if Luhn passes
    if (isValidLuhn(value)) {
      entities.push({
        type: EntityType.CREDIT_CARD,
        value,
        start: m.index,
        end: m.index + value.length,
      });
    }
  }

  return entities;
}

// Re-export helpers for use by pipeline
export { matchAll };
