/**
 * detectors.test.ts
 *
 * Tests for each individual detector function and the combined detectPII pipeline.
 * Tests verify:
 *   - Correct entity type
 *   - Correct matched value (original text, no normalisation)
 *   - Correct start and end indexes (text.slice(start, end) === value)
 *   - Non-destructive behaviour (input string unchanged)
 *   - No false positives on invalid inputs
 */

import { describe, it, expect } from 'vitest';
import { EntityType } from '../core/pii/types';
import {
  detectEmails,
  detectPhones,
  detectIPs,
  detectPANs,
  detectAaadhaars,
  detectCreditCards,
} from '../core/pii/detectors';
import { detectPII } from '../core/pii/index';

// ---------------------------------------------------------------------------
// Helper: verify start/end index accuracy
// ---------------------------------------------------------------------------
function assertIndexes(text: string, value: string, start: number, end: number) {
  expect(text.slice(start, end)).toBe(value);
}

// ---------------------------------------------------------------------------
// Email detection
// ---------------------------------------------------------------------------

describe('detectEmails', () => {
  it('detects a simple email address', () => {
    const text = 'Contact test@example.com for info.';
    const results = detectEmails(text);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(EntityType.EMAIL);
    expect(results[0].value).toBe('test@example.com');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects an email with subdomain', () => {
    const text = 'Send to user@mail.example.co.uk please';
    const results = detectEmails(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('user@mail.example.co.uk');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects an email with dot in local part', () => {
    const text = 'Reply to user.name@example.com';
    const results = detectEmails(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('user.name@example.com');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects an email with + tag', () => {
    const text = 'Signed up with user+tag@example.co.in';
    const results = detectEmails(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('user+tag@example.co.in');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects multiple emails in one text', () => {
    const text = 'From: a@example.com, To: b@test.org';
    const results = detectEmails(text);
    expect(results).toHaveLength(2);
    expect(results.map(e => e.value)).toContain('a@example.com');
    expect(results.map(e => e.value)).toContain('b@test.org');
  });

  it('does not detect a string with no @ as an email', () => {
    const text = 'Visit example.com for more info';
    const results = detectEmails(text);
    expect(results).toHaveLength(0);
  });

  it('does not detect a bare @ symbol as an email', () => {
    const text = 'Use the @ symbol carefully';
    const results = detectEmails(text);
    expect(results).toHaveLength(0);
  });

  it('does not modify the input text', () => {
    const text = 'Contact test@example.com now';
    const copy = text;
    detectEmails(text);
    expect(text).toBe(copy);
  });
});

// ---------------------------------------------------------------------------
// Phone detection
// ---------------------------------------------------------------------------

describe('detectPhones', () => {
  it('detects a bare 10-digit Indian number', () => {
    const text = 'Call 9876543210 today';
    const results = detectPhones(text);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(EntityType.PHONE);
    expect(results[0].value).toBe('9876543210');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a +91-prefixed number with space', () => {
    const text = 'WhatsApp: +91 9876543210';
    const results = detectPhones(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('+91 9876543210');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a +91-prefixed number with hyphen', () => {
    const text = 'Tel: +91-9876543210';
    const results = detectPhones(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('+91-9876543210');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a 0-prefixed 10-digit number', () => {
    const text = 'Dial 09876543210 now';
    const results = detectPhones(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('09876543210');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('does not detect a 5-digit number as a phone', () => {
    const text = 'Order #12345 is ready';
    const results = detectPhones(text);
    expect(results).toHaveLength(0);
  });

  it('does not detect a number starting with digit < 6 as Indian mobile', () => {
    // 1234567890 starts with 1, not a valid Indian mobile prefix
    const text = 'Number: 1234567890';
    const results = detectPhones(text);
    expect(results).toHaveLength(0);
  });

  it('does not modify the input text', () => {
    const text = 'Call 9876543210';
    const copy = text;
    detectPhones(text);
    expect(text).toBe(copy);
  });
});

// ---------------------------------------------------------------------------
// IP address detection
// ---------------------------------------------------------------------------

describe('detectIPs', () => {
  it('detects a valid private IP', () => {
    const text = 'Server at 192.168.1.1 is up';
    const results = detectIPs(text);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(EntityType.IP);
    expect(results[0].value).toBe('192.168.1.1');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects 8.8.8.8', () => {
    const text = 'DNS: 8.8.8.8';
    const results = detectIPs(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('8.8.8.8');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('rejects an IP with octets > 255', () => {
    const text = 'Bad IP: 999.999.999.999';
    const results = detectIPs(text);
    expect(results).toHaveLength(0);
  });

  it('rejects 300.1.1.1', () => {
    const text = 'Invalid: 300.1.1.1';
    const results = detectIPs(text);
    expect(results).toHaveLength(0);
  });

  it('detects multiple IPs in one text', () => {
    const text = 'Route from 10.0.0.1 to 10.0.0.2';
    const results = detectIPs(text);
    expect(results).toHaveLength(2);
    const values = results.map(r => r.value);
    expect(values).toContain('10.0.0.1');
    expect(values).toContain('10.0.0.2');
    results.forEach(r => assertIndexes(text, r.value, r.start, r.end));
  });

  it('does not modify the input text', () => {
    const text = 'IP is 192.168.0.1';
    const copy = text;
    detectIPs(text);
    expect(text).toBe(copy);
  });
});

// ---------------------------------------------------------------------------
// PAN detection
// ---------------------------------------------------------------------------

describe('detectPANs', () => {
  it('detects a valid PAN in uppercase', () => {
    const text = 'PAN: ABCDE1234F submitted';
    const results = detectPANs(text);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(EntityType.PAN);
    expect(results[0].value).toBe('ABCDE1234F');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects another valid PAN', () => {
    const text = 'Taxpayer BNZPM2501K';
    const results = detectPANs(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('BNZPM2501K');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a lowercase PAN (case-insensitive) and preserves original casing', () => {
    const text = 'Pan: abcde1234f';
    const results = detectPANs(text);
    expect(results).toHaveLength(1);
    // Value should be the ORIGINAL text, not uppercased
    expect(results[0].value).toBe('abcde1234f');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a mixed-case PAN', () => {
    const text = 'Filed by AbCdE1234F';
    const results = detectPANs(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('AbCdE1234F');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('does not detect an invalid PAN (too many digits)', () => {
    const text = 'ABCDE12345F is wrong';
    const results = detectPANs(text);
    // ABCDE12345F has 5 digits not 4 — should NOT match
    expect(results.map(r => r.value)).not.toContain('ABCDE12345F');
  });

  it('does not detect a string shorter than PAN format', () => {
    const text = 'ABC1234F';
    const results = detectPANs(text);
    expect(results).toHaveLength(0);
  });

  it('does not modify the input text', () => {
    const text = 'PAN ABCDE1234F here';
    const copy = text;
    detectPANs(text);
    expect(text).toBe(copy);
  });
});

// ---------------------------------------------------------------------------
// Aadhaar detection
// ---------------------------------------------------------------------------

describe('detectAaadhaars', () => {
  it('detects a 12-digit consecutive Aadhaar', () => {
    const text = 'Aadhaar: 123456789012';
    const results = detectAaadhaars(text);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(EntityType.AADHAAR);
    expect(results[0].value).toBe('123456789012');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a space-separated Aadhaar (1234 5678 9012)', () => {
    const text = 'ID: 1234 5678 9012 verified';
    const results = detectAaadhaars(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('1234 5678 9012');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a hyphen-separated Aadhaar (1234-5678-9012)', () => {
    const text = 'Aadhaar No: 1234-5678-9012';
    const results = detectAaadhaars(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('1234-5678-9012');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('does not detect an 11-digit number as Aadhaar', () => {
    const text = '12345678901'; // 11 digits
    const results = detectAaadhaars(text);
    expect(results).toHaveLength(0);
  });

  it('does not detect a 13-digit number as Aadhaar', () => {
    const text = '1234567890123'; // 13 digits
    const results = detectAaadhaars(text);
    expect(results).toHaveLength(0);
  });

  it('does not modify the input text', () => {
    const text = 'Aadhaar 123456789012 is valid';
    const copy = text;
    detectAaadhaars(text);
    expect(text).toBe(copy);
  });
});

// ---------------------------------------------------------------------------
// Credit card detection (with Luhn validation)
// ---------------------------------------------------------------------------

describe('detectCreditCards', () => {
  it('detects a valid credit card (plain 16-digit)', () => {
    const text = 'Card: 4111111111111111 expired';
    const results = detectCreditCards(text);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(EntityType.CREDIT_CARD);
    expect(results[0].value).toBe('4111111111111111');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a valid credit card with spaces', () => {
    const text = 'Pay with 4111 1111 1111 1111';
    const results = detectCreditCards(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('4111 1111 1111 1111');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a valid credit card with hyphens', () => {
    const text = 'Token: 4111-1111-1111-1111';
    const results = detectCreditCards(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('4111-1111-1111-1111');
    assertIndexes(text, results[0].value, results[0].start, results[0].end);
  });

  it('detects a valid Mastercard number', () => {
    const text = 'MC: 5500005555555559';
    const results = detectCreditCards(text);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('5500005555555559');
  });

  it('does NOT detect an invalid Luhn number as credit card', () => {
    const text = 'Num: 4111111111111112';
    const results = detectCreditCards(text);
    expect(results).toHaveLength(0);
  });

  it('does NOT detect a random 16-digit number that fails Luhn', () => {
    const text = 'Random: 1234567890123456';
    const results = detectCreditCards(text);
    expect(results).toHaveLength(0);
  });

  it('does not modify the input text', () => {
    const text = 'Card 4111111111111111 saved';
    const copy = text;
    detectCreditCards(text);
    expect(text).toBe(copy);
  });
});

// ---------------------------------------------------------------------------
// Combined detection pipeline
// ---------------------------------------------------------------------------

describe('detectPII — combined pipeline', () => {
  it('detects email and IP in one pass', () => {
    const text = 'Contact test@example.com from 192.168.1.1';
    const results = detectPII(text);
    const types = results.map(r => r.type);
    expect(types).toContain(EntityType.EMAIL);
    expect(types).toContain(EntityType.IP);
    // Input must be untouched
    expect(text).toBe('Contact test@example.com from 192.168.1.1');
  });

  it('detects multiple PII types in noisy text', () => {
    const text = [
      'Patient: Rahul Sharma',
      'Email: rahul.sharma@hospital.in',
      'Phone: +91 9876543210',
      'IP: 10.0.0.25',
      'PAN: ABCDE1234F',
      'Aadhaar: 1234 5678 9012',
      'Credit Card: 4111 1111 1111 1111',
    ].join('\n');

    const results = detectPII(text);
    const types = results.map(r => r.type);

    expect(types).toContain(EntityType.EMAIL);
    expect(types).toContain(EntityType.PHONE);
    expect(types).toContain(EntityType.IP);
    expect(types).toContain(EntityType.PAN);
    expect(types).toContain(EntityType.AADHAAR);
    expect(types).toContain(EntityType.CREDIT_CARD);
  });

  it('returns results sorted by start position', () => {
    const text = 'Email: a@b.com and IP: 10.0.0.1 and phone 9876543210';
    const results = detectPII(text);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].start).toBeGreaterThanOrEqual(results[i - 1].start);
    }
  });

  it('returns no duplicates for a single entity', () => {
    const text = 'Only one email: test@example.com';
    const results = detectPII(text);
    const emails = results.filter(r => r.type === EntityType.EMAIL);
    expect(emails).toHaveLength(1);
  });

  it('does not return overlapping entities', () => {
    const text = 'CC: 4111111111111111 paid';
    const results = detectPII(text);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].start).toBeGreaterThanOrEqual(results[i - 1].end);
    }
  });

  it('leaves the original text completely unmodified', () => {
    const original = 'Email test@example.com | IP 10.0.0.1 | Card 4111111111111111';
    const copy = original;
    detectPII(original);
    expect(original).toBe(copy);
  });

  it('index accuracy: slice always reproduces the matched value', () => {
    const text = 'Reach me at user+tag@example.co.in or call +91 9876543210';
    const results = detectPII(text);
    for (const entity of results) {
      expect(text.slice(entity.start, entity.end)).toBe(entity.value);
    }
  });

  it('handles empty string without throwing', () => {
    expect(() => detectPII('')).not.toThrow();
    expect(detectPII('')).toEqual([]);
  });

  it('handles text with no PII', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const results = detectPII(text);
    expect(results).toHaveLength(0);
  });

  it('handles text with ONLY credit card — not misidentified as Aadhaar/phone', () => {
    const text = 'CC: 4111111111111111';
    const results = detectPII(text);
    expect(results.some(r => r.type === EntityType.CREDIT_CARD)).toBe(true);
    // The same number must not ALSO appear as aadhaar or phone
    const nonCC = results.filter(r => r.type !== EntityType.CREDIT_CARD);
    expect(nonCC).toHaveLength(0);
  });

  it('detects both PAN and Aadhaar when present', () => {
    const text = 'PAN: ABCDE1234F | Aadhaar: 123456789012';
    const results = detectPII(text);
    expect(results.some(r => r.type === EntityType.PAN)).toBe(true);
    expect(results.some(r => r.type === EntityType.AADHAAR)).toBe(true);
  });
});
