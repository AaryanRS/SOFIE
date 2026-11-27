/**
 * redaction.ts
 *
 * Core pure redaction functions for SOFIE.
 * Implements Full Mask, Partial Mask, and Consistent Pseudonymization.
 */

import { EntityType, PiiEntity } from '../pii/types';
import { createEmptyEntityCounts } from '../pii/entityCounts';
import { Pseudonymizer } from './pseudonymization';
import {
  RedactionMode,
  SanitizationAudit,
  SanitizationResult,
  SanitizedReplacement,
  SanitizeOptions,
} from './types';

// ---------------------------------------------------------------------------
// Partial Masking Helpers
// ---------------------------------------------------------------------------

function maskDigitsKeepingLastFour(value: string, mask: string): string {
  const digitIndices: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i])) digitIndices.push(i);
  }

  if (digitIndices.length <= 4) {
    return value.replace(/\d/g, mask);
  }

  const firstVisibleDigit = digitIndices[digitIndices.length - 4];
  return value
    .split('')
    .map((char, index) => (/\d/.test(char) && index < firstVisibleDigit ? mask : char))
    .join('');
}

/**
 * Partially masks an email address:
 *   john.smith@example.com -> j***@example.com
 */
export function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return '***';
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  const firstChar = local.length > 0 ? local.charAt(0) : '';
  return `${firstChar}***@${domain}`;
}

/**
 * Partially masks a phone number:
 *   +91-9876543210 -> +91-******3210
 *   +91 9876543210 -> +91 ******3210
 *   09876543210    -> 0******3210
 *   9876543210     -> ******3210
 */
export function maskPhone(phone: string): string {
  // Check for common prefix patterns
  let prefix = '';
  let rest = phone;

  if (phone.startsWith('+91-')) {
    prefix = '+91-';
    rest = phone.slice(4);
  } else if (phone.startsWith('+91 ')) {
    prefix = '+91 ';
    rest = phone.slice(4);
  } else if (phone.startsWith('+91')) {
    prefix = '+91';
    rest = phone.slice(3);
  } else if (phone.startsWith('0')) {
    prefix = '0';
    rest = phone.slice(1);
  }

  return prefix + maskDigitsKeepingLastFour(rest, '*');
}

/**
 * Partially masks a credit card number:
 *   4111-1111-1111-1234 -> XXXX-XXXX-XXXX-1234
 *   4111 1111 1111 1234 -> XXXX XXXX XXXX 1234
 *   4111111111111234    -> XXXXXXXXXXXX1234
 */
export function maskCreditCard(cc: string): string {
  return maskDigitsKeepingLastFour(cc, 'X');
}

/**
 * Partially masks an Indian PAN:
 *   ABCDE1234F -> ABCDE****F
 */
export function maskPAN(pan: string): string {
  if (pan.length !== 10) {
    return pan.slice(0, 3) + '****' + pan.slice(-1);
  }
  return pan.slice(0, 5) + '****' + pan.slice(9);
}

/**
 * Partially masks an Indian Aadhaar number:
 *   1234-5678-9012 -> XXXX-XXXX-9012
 *   1234 5678 9012 -> XXXX XXXX 9012
 *   123456789012   -> XXXXXXXX9012
 */
export function maskAadhaar(aadhaar: string): string {
  return maskDigitsKeepingLastFour(aadhaar, 'X');
}

/**
 * Partially masks an IPv4 address:
 *   192.168.1.25 -> 192.168.*.*
 */
export function maskIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip.replace(/\d+$/, '*');
}

/**
 * Dispatches entity value to appropriate partial masking transformer.
 */
export function getPartialMask(type: EntityType, value: string): string {
  switch (type) {
    case EntityType.EMAIL:
      return maskEmail(value);
    case EntityType.PHONE:
      return maskPhone(value);
    case EntityType.CREDIT_CARD:
      return maskCreditCard(value);
    case EntityType.PAN:
      return maskPAN(value);
    case EntityType.AADHAAR:
      return maskAadhaar(value);
    case EntityType.IP:
      return maskIP(value);
    default:
      return '[REDACTED]';
  }
}

// ---------------------------------------------------------------------------
// Main Sanitization Engine
// ---------------------------------------------------------------------------

/**
 * Computes replacement string for a single entity based on the selected mode.
 */
export function getReplacementValue(
  entity: PiiEntity,
  mode: RedactionMode,
  pseudonymizer: Pseudonymizer
): string {
  switch (mode) {
    case RedactionMode.FULL_MASK:
      return '[REDACTED]';
    case RedactionMode.PARTIAL_MASK:
      return getPartialMask(entity.type, entity.value);
    case RedactionMode.PSEUDONYMIZATION:
      return pseudonymizer.getPseudonym(entity.type, entity.value);
  }
}

/**
 * Sanitizes arbitrary text using the provided detected PII entities and redaction mode.
 *
 * Requirements:
 * - Deterministic and non-destructive.
 * - Reconstructs string safely from original text using exact start and end ranges.
 * - Avoids modified-index drift.
 * - Returns detailed replacement evidence and audit metrics.
 */
export function sanitizeText({
  text,
  entities,
  mode,
  pseudonymMap,
}: SanitizeOptions): SanitizationResult {
  const pseudonymizer = new Pseudonymizer(pseudonymMap);

  // Initialize counts for audit
  const counts = createEmptyEntityCounts();

  if (!text || entities.length === 0) {
    const audit: SanitizationAudit = {
      totalEntities: 0,
      counts,
      originalLength: text.length,
      sanitizedLength: text.length,
      mode,
    };
    return {
      sanitizedText: text,
      replacements: [],
      mode,
      audit,
    };
  }

  // Sort entities by start asc, length desc
  const sorted = [...entities].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  // Filter overlapping entities
  const nonOverlapping: PiiEntity[] = [];
  let lastEnd = -1;
  for (const entity of sorted) {
    if (entity.start >= lastEnd) {
      nonOverlapping.push(entity);
      lastEnd = entity.end;
    }
  }

  const replacements: SanitizedReplacement[] = [];
  let result = '';
  let cursor = 0;

  for (const entity of nonOverlapping) {
    // Preserve preceding non-sensitive text byte-for-byte
    if (entity.start > cursor) {
      result += text.slice(cursor, entity.start);
    }

    const replacementValue = getReplacementValue(entity, mode, pseudonymizer);
    const sanitizedStart = result.length;
    result += replacementValue;
    const sanitizedEnd = result.length;

    replacements.push({
      entity,
      replacementValue,
      originalStart: entity.start,
      originalEnd: entity.end,
      sanitizedStart,
      sanitizedEnd,
    });

    counts[entity.type] += 1;
    cursor = entity.end;
  }

  // Append remaining text after the last entity
  if (cursor < text.length) {
    result += text.slice(cursor);
  }

  const audit: SanitizationAudit = {
    totalEntities: nonOverlapping.length,
    counts,
    originalLength: text.length,
    sanitizedLength: result.length,
    mode,
  };

  return {
    sanitizedText: result,
    replacements,
    mode,
    audit,
  };
}
