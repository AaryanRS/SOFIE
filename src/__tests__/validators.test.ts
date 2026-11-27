/**
 * validators.test.ts
 *
 * Tests for the pure validation helpers: isValidLuhn and isValidIpv4.
 */

import { describe, it, expect } from 'vitest';
import { isValidLuhn, isValidIpv4 } from '../core/pii/validators';

// ---------------------------------------------------------------------------
// Luhn algorithm tests
// ---------------------------------------------------------------------------

describe('isValidLuhn', () => {
  // --- Valid numbers ---
  it('accepts a well-known valid Visa test number (plain)', () => {
    expect(isValidLuhn('4111111111111111')).toBe(true);
  });

  it('accepts a valid Mastercard test number', () => {
    expect(isValidLuhn('5500005555555559')).toBe(true);
  });

  it('accepts a valid Amex test number (15-digit)', () => {
    expect(isValidLuhn('371449635398431')).toBe(true);
  });

  it('accepts a formatted number with spaces', () => {
    expect(isValidLuhn('4111 1111 1111 1111')).toBe(true);
  });

  it('accepts a formatted number with hyphens', () => {
    expect(isValidLuhn('4111-1111-1111-1111')).toBe(true);
  });

  it('accepts another known valid number', () => {
    // Discover test card
    expect(isValidLuhn('6011111111111117')).toBe(true);
  });

  // --- Invalid numbers ---
  it('rejects an invalid Luhn number (last digit off by one)', () => {
    expect(isValidLuhn('4111111111111112')).toBe(false);
  });

  it('rejects a random 16-digit number that fails Luhn', () => {
    expect(isValidLuhn('1234567890123456')).toBe(false);
  });

  it('rejects a number that is too short (< 12 digits)', () => {
    expect(isValidLuhn('41111')).toBe(false);
  });

  it('rejects a number that is too long (> 19 digits)', () => {
    expect(isValidLuhn('12345678901234567890')).toBe(false);
  });

  it('rejects a string containing non-digit characters after stripping separators', () => {
    expect(isValidLuhn('4111-1111-1111-111X')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidLuhn('')).toBe(false);
  });

  it('rejects all-zeros (12 zeros passes Luhn but is out of practical range — still valid structurally)', () => {
    // 000000000000 — 12 zeros: Luhn sum is 0, divisible by 10 → valid per algorithm
    expect(isValidLuhn('000000000000')).toBe(true);
  });

  it('rejects a 16-digit number with correct length but wrong checksum', () => {
    expect(isValidLuhn('4111111111111110')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IPv4 octet validator tests
// ---------------------------------------------------------------------------

describe('isValidIpv4', () => {
  it('accepts a standard private IP', () => {
    expect(isValidIpv4('192.168.1.1')).toBe(true);
  });

  it('accepts a well-known DNS server IP', () => {
    expect(isValidIpv4('8.8.8.8')).toBe(true);
  });

  it('accepts edge values (all zeros)', () => {
    expect(isValidIpv4('0.0.0.0')).toBe(true);
  });

  it('accepts broadcast address', () => {
    expect(isValidIpv4('255.255.255.255')).toBe(true);
  });

  it('rejects an octet > 255', () => {
    expect(isValidIpv4('999.999.999.999')).toBe(false);
  });

  it('rejects 300.1.1.1', () => {
    expect(isValidIpv4('300.1.1.1')).toBe(false);
  });

  it('rejects too few octets', () => {
    expect(isValidIpv4('192.168.1')).toBe(false);
  });

  it('rejects too many octets', () => {
    expect(isValidIpv4('192.168.1.1.1')).toBe(false);
  });

  it('rejects non-numeric octets', () => {
    expect(isValidIpv4('abc.def.ghi.jkl')).toBe(false);
  });
});
