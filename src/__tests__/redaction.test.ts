/**
 * redaction.test.ts
 *
 * Comprehensive unit tests for SOFIE Phase 3 Redaction Engine:
 * - Full Mask
 * - Partial Mask
 * - Consistent Pseudonymization
 * - Range accuracy & byte-for-byte non-PII preservation
 * - CSV structure preservation
 * - Export utilities
 */

import { describe, it, expect } from 'vitest';
import { EntityType, PiiEntity } from '../core/pii/types';
import { detectPII } from '../core/pii/index';
import {
  maskEmail,
  maskPhone,
  maskIP,
  maskPAN,
  maskAadhaar,
  maskCreditCard,
  getPartialMask,
  sanitizeText,
} from '../core/redaction/redaction';
import { Pseudonymizer } from '../core/redaction/pseudonymization';
import { RedactionMode } from '../core/redaction/types';
import { getSanitizedFilename } from '../utils/export';

describe('Phase 3: Core Redaction Engine', () => {
  // -------------------------------------------------------------------------
  // 1. Partial Masking Functions
  // -------------------------------------------------------------------------
  describe('Partial Masking individual functions', () => {
    it('masks email safely without leaking local part', () => {
      expect(maskEmail('john.smith@example.com')).toBe('j***@example.com');
      expect(maskEmail('alex@domain.co.in')).toBe('a***@domain.co.in');
      expect(maskEmail('z@test.org')).toBe('z***@test.org');
    });

    it('masks phone numbers preserving format and last 4 digits', () => {
      expect(maskPhone('+91-9876543210')).toBe('+91-******3210');
      expect(maskPhone('+91 9876543210')).toBe('+91 ******3210');
      expect(maskPhone('09876543210')).toBe('0******3210');
      expect(maskPhone('9876543210')).toBe('******3210');
      expect(maskPhone('1234')).toBe('****');
    });

    it('masks credit card preserving grouping and last 4 digits', () => {
      expect(maskCreditCard('4111-1111-1111-1234')).toBe('XXXX-XXXX-XXXX-1234');
      expect(maskCreditCard('4111 1111 1111 1234')).toBe('XXXX XXXX XXXX 1234');
      expect(maskCreditCard('4111111111111234')).toBe('XXXXXXXXXXXX1234');
      expect(maskCreditCard('1234')).toBe('XXXX');
    });

    it('masks Indian PAN preserving first 5 and last letter', () => {
      expect(maskPAN('ABCDE1234F')).toBe('ABCDE****F');
      expect(maskPAN('BNZPM2501K')).toBe('BNZPM****K');
    });

    it('masks Aadhaar preserving formatting and last 4 digits', () => {
      expect(maskAadhaar('1234-5678-9012')).toBe('XXXX-XXXX-9012');
      expect(maskAadhaar('1234 5678 9012')).toBe('XXXX XXXX 9012');
      expect(maskAadhaar('123456789012')).toBe('XXXXXXXX9012');
      expect(maskAadhaar('1234')).toBe('XXXX');
    });

    it('masks IPv4 keeping first two octets', () => {
      expect(maskIP('192.168.1.25')).toBe('192.168.*.*');
      expect(maskIP('10.0.0.1')).toBe('10.0.*.*');
      expect(maskIP('8.8.8.8')).toBe('8.8.*.*');
    });

    it('dispatches to all types via getPartialMask', () => {
      expect(getPartialMask(EntityType.EMAIL, 'user@test.com')).toBe('u***@test.com');
      expect(getPartialMask(EntityType.PHONE, '9876543210')).toBe('******3210');
      expect(getPartialMask(EntityType.IP, '10.1.2.3')).toBe('10.1.*.*');
      expect(getPartialMask(EntityType.PAN, 'ABCDE1234F')).toBe('ABCDE****F');
      expect(getPartialMask(EntityType.AADHAAR, '1234 5678 9012')).toBe('XXXX XXXX 9012');
      expect(getPartialMask(EntityType.CREDIT_CARD, '4111 1111 1111 1111')).toBe('XXXX XXXX XXXX 1111');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Full Mask Mode
  // -------------------------------------------------------------------------
  describe('Full Mask Mode', () => {
    it('replaces every PII entity with [REDACTED]', () => {
      const text = 'Contact john@example.com from IP 192.168.1.1 or call 9876543210';
      const entities = detectPII(text);
      const res = sanitizeText({ text, entities, mode: RedactionMode.FULL_MASK });

      expect(res.sanitizedText).toBe('Contact [REDACTED] from IP [REDACTED] or call [REDACTED]');
      expect(res.replacements).toHaveLength(3);
      res.replacements.forEach((r) => {
        expect(r.replacementValue).toBe('[REDACTED]');
      });
    });

    it('preserves non-sensitive text byte-for-byte', () => {
      const text = 'The server reported OK at 10:00 AM.';
      const res = sanitizeText({ text, entities: [], mode: RedactionMode.FULL_MASK });
      expect(res.sanitizedText).toBe(text);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Consistent Pseudonymization
  // -------------------------------------------------------------------------
  describe('Consistent Pseudonymization', () => {
    it('maps repeated values to the exact same token throughout the session', () => {
      const text = 'Send from john@example.com to john@example.com and cc admin@example.com';
      const entities = detectPII(text);
      const res = sanitizeText({ text, entities, mode: RedactionMode.PSEUDONYMIZATION });

      expect(res.sanitizedText).toBe('Send from EMAIL_01 to EMAIL_01 and cc EMAIL_02');
    });

    it('starts numbering at 01 for each entity type and uses correct prefixes', () => {
      const p = new Pseudonymizer();
      expect(p.getPseudonym(EntityType.EMAIL, 'a@b.com')).toBe('EMAIL_01');
      expect(p.getPseudonym(EntityType.PHONE, '9876543210')).toBe('PHONE_01');
      expect(p.getPseudonym(EntityType.IP, '10.0.0.1')).toBe('IP_01');
      expect(p.getPseudonym(EntityType.PAN, 'ABCDE1234F')).toBe('PAN_01');
      expect(p.getPseudonym(EntityType.AADHAAR, '123456789012')).toBe('AADHAAR_01');
      expect(p.getPseudonym(EntityType.CREDIT_CARD, '4111111111111111')).toBe('CARD_01');

      // Next distinct values increment to 02
      expect(p.getPseudonym(EntityType.EMAIL, 'c@d.com')).toBe('EMAIL_02');
      expect(p.getPseudonym(EntityType.PHONE, '9876543211')).toBe('PHONE_02');
    });

    it('restores counters from valid seeded mappings and ignores unknown entity prefixes', () => {
      const p = new Pseudonymizer(new Map([
        ['email:known@example.com', 'EMAIL_04'],
        ['unknown:value', 'EMAIL_99'],
      ]));

      expect(p.getPseudonym(EntityType.EMAIL, 'new@example.com')).toBe('EMAIL_05');
    });

    it('clearing/resetting starts a fresh mapping', () => {
      const p = new Pseudonymizer();
      expect(p.getPseudonym(EntityType.EMAIL, 'first@example.com')).toBe('EMAIL_01');
      p.reset();
      expect(p.getPseudonym(EntityType.EMAIL, 'second@example.com')).toBe('EMAIL_01');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Mixed Input & Non-PII Preservation
  // -------------------------------------------------------------------------
  describe('Mixed Input & Range Integrity', () => {
    it('sanitizes noisy multi-PII text without leaking original sensitive tokens', () => {
      const text = [
        'User: Rahul',
        'Email: rahul@example.com',
        'Phone: +91 9876543210',
        'PAN: ABCDE1234F',
        'Card: 4111 1111 1111 1111',
        'IP: 192.168.1.1',
      ].join('\n');

      const entities = detectPII(text);
      const res = sanitizeText({ text, entities, mode: RedactionMode.PARTIAL_MASK });

      // None of the raw sensitive values should appear anywhere in the sanitized text
      expect(res.sanitizedText).not.toContain('rahul@example.com');
      expect(res.sanitizedText).not.toContain('9876543210');
      expect(res.sanitizedText).not.toContain('1234F');
      expect(res.sanitizedText).not.toContain('4111 1111 1111 1111');
      expect(res.sanitizedText).not.toContain('192.168.1.1');

      // Safe masks should appear
      expect(res.sanitizedText).toContain('r***@example.com');
      expect(res.sanitizedText).toContain('+91 ******3210');
      expect(res.sanitizedText).toContain('ABCDE****F');
      expect(res.sanitizedText).toContain('XXXX XXXX XXXX 1111');
      expect(res.sanitizedText).toContain('192.168.*.*');
    });

    it('preserves surrounding CSV delimiters and newlines intact', () => {
      const csv = 'id,name,email,ip\n1,Alice,alice@example.com,10.0.0.1\n2,Bob,bob@example.com,10.0.0.2';
      const entities = detectPII(csv);
      const res = sanitizeText({ text: csv, entities, mode: RedactionMode.FULL_MASK });

      expect(res.sanitizedText).toBe(
        'id,name,email,ip\n1,Alice,[REDACTED],[REDACTED]\n2,Bob,[REDACTED],[REDACTED]'
      );

      // Verify line count and column comma structure
      const lines = res.sanitizedText.split('\n');
      expect(lines).toHaveLength(3);
      lines.forEach((line) => {
        expect(line.split(',')).toHaveLength(4);
      });
    });

    it('records accurate sanitized character start/end coordinates', () => {
      const text = 'Send to user@example.com immediately.';
      const entities: PiiEntity[] = [
        {
          type: EntityType.EMAIL,
          value: 'user@example.com',
          start: 8,
          end: 24,
        },
      ];
      const res = sanitizeText({ text, entities, mode: RedactionMode.FULL_MASK });
      const repl = res.replacements[0];

      expect(res.sanitizedText.slice(repl.sanitizedStart, repl.sanitizedEnd)).toBe('[REDACTED]');
      expect(res.sanitizedText).toBe('Send to [REDACTED] immediately.');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Audit Metrics
  // -------------------------------------------------------------------------
  describe('Audit Metrics', () => {
    it('accurately computes total count, breakdown, and character length changes', () => {
      const text = 'IP 1.2.3.4 and email a@b.com';
      const entities = detectPII(text);
      const res = sanitizeText({ text, entities, mode: RedactionMode.FULL_MASK });

      expect(res.audit.totalEntities).toBe(2);
      expect(res.audit.counts[EntityType.IP]).toBe(1);
      expect(res.audit.counts[EntityType.EMAIL]).toBe(1);
      expect(res.audit.originalLength).toBe(text.length);
      expect(res.audit.sanitizedLength).toBe(res.sanitizedText.length);
      expect(res.audit.mode).toBe(RedactionMode.FULL_MASK);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Export Filename Helper
  // -------------------------------------------------------------------------
  describe('Export Filename Utilities', () => {
    it('generates correct sanitized filenames for .txt', () => {
      expect(getSanitizedFilename('report.txt', false)).toBe('report.sanitized.txt');
    });

    it('generates correct sanitized filenames for .csv', () => {
      expect(getSanitizedFilename('customers.csv', true)).toBe('customers.sanitized.csv');
    });

    it('falls back to default names when no original filename is present', () => {
      expect(getSanitizedFilename(null, false)).toBe('sofie-sanitized.txt');
      expect(getSanitizedFilename(null, true)).toBe('sofie-sanitized.csv');
    });
  });
});
