/**
 * ai.test.ts
 *
 * Unit tests for Google Built-in AI / LanguageModel integration:
 * - Safe metadata extraction (zero raw PII)
 * - Safe prompt construction
 * - Availability mapping
 * - Structured JSON output parsing & code-fence stripping
 * - Mocked on-device LanguageModel inference & session cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EntityType } from '../core/pii/types';
import { RedactionMode, SanitizationAudit } from '../core/redaction/types';
import {
  AI_SYSTEM_INSTRUCTION,
  buildSafeAiMetadata,
  buildUserPrompt,
  INSIGHT_JSON_SCHEMA,
  parseStructuredInsight,
} from '../core/ai/prompt';
import {
  checkAiAvailability,
  generatePrivacyInsight,
  mapAvailabilityStatus,
} from '../core/ai/browserAi';
import { ChromeLanguageModelFactory } from '../core/ai/types';

describe('Phase 4: Google Built-in AI Service Layer', () => {
  const sampleAudit: SanitizationAudit = {
    totalEntities: 5,
    counts: {
      [EntityType.EMAIL]: 2,
      [EntityType.PHONE]: 1,
      [EntityType.IP]: 1,
      [EntityType.PAN]: 0,
      [EntityType.AADHAAR]: 0,
      [EntityType.CREDIT_CARD]: 1,
    },
    originalLength: 450,
    sanitizedLength: 420,
    mode: RedactionMode.PSEUDONYMIZATION,
  };

  // -------------------------------------------------------------------------
  // 1. Safe Metadata Extraction
  // -------------------------------------------------------------------------
  it('buildSafeAiMetadata extracts only safe aggregate metrics', () => {
    const meta = buildSafeAiMetadata(sampleAudit);

    expect(meta.totalEntities).toBe(5);
    expect(meta.counts[EntityType.EMAIL]).toBe(2);
    expect(meta.counts[EntityType.CREDIT_CARD]).toBe(1);
    expect(meta.originalCharacterCount).toBe(450);
    expect(Object.keys(meta).sort()).toEqual([
      'counts',
      'originalCharacterCount',
      'redactionMode',
      'totalEntities',
    ]);

    // Verify there are no raw text fields or entity arrays
    expect(Reflect.has(meta, 'text')).toBe(false);
    expect(Reflect.has(meta, 'rawText')).toBe(false);
    expect(Reflect.has(meta, 'entities')).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 2. Safe User Prompt Construction
  // -------------------------------------------------------------------------
  it('buildUserPrompt formats aggregate counts and excludes raw text', () => {
    const meta = buildSafeAiMetadata(sampleAudit);
    const prompt = buildUserPrompt(meta);

    expect(prompt).toContain('Total sensitive entities detected: 5');
    expect(prompt).toContain('email: 2');
    expect(prompt).toContain('credit_card: 1');
    expect(prompt).toContain('450 characters');
    expect(prompt).toContain('summary');
    expect(prompt).toContain('recommendation');
    expect(prompt).toContain('caution');

    // System instruction contains privacy boundaries
    expect(AI_SYSTEM_INSTRUCTION).toContain('Never ask for, guess, or reconstruct original sensitive data');
  });

  // -------------------------------------------------------------------------
  // 3. Availability State Mapping
  // -------------------------------------------------------------------------
  it('mapAvailabilityStatus maps Chrome Prompt API states correctly', () => {
    expect(mapAvailabilityStatus('readily')).toBe('available');
    expect(mapAvailabilityStatus('available')).toBe('available');
    expect(mapAvailabilityStatus('after-download')).toBe('downloadable');
    expect(mapAvailabilityStatus('downloadable')).toBe('downloadable');
    expect(mapAvailabilityStatus('downloading')).toBe('downloading');
    expect(mapAvailabilityStatus('no')).toBe('unavailable');
    expect(mapAvailabilityStatus('unavailable')).toBe('unavailable');
    expect(mapAvailabilityStatus('unknown_status')).toBe('unavailable');
  });

  // -------------------------------------------------------------------------
  // 4. Structured Output Parser
  // -------------------------------------------------------------------------
  describe('parseStructuredInsight', () => {
    it('parses valid structured JSON successfully', () => {
      const raw = JSON.stringify({
        summary: 'Multiple financial and identity records detected.',
        recommendation: 'Consistent pseudonymization preserves linkability safely.',
        caution: 'Ensure pseudonym tokens are not combined with external re-identification sets.',
      });

      const parsed = parseStructuredInsight(raw);
      expect(parsed.summary).toBe('Multiple financial and identity records detected.');
      expect(parsed.recommendation).toBe(
        'Consistent pseudonymization preserves linkability safely.'
      );
      expect(parsed.caution).toContain('Ensure pseudonym tokens are not combined');
    });

    it('strips markdown code fences before parsing', () => {
      const fenced =
        '```json\n' +
        JSON.stringify({
          summary: 'Detected IP addresses and emails.',
          recommendation: 'Full masking is recommended for external transmission.',
          caution: 'Verify no indirect identifiers remain.',
        }) +
        '\n```';

      const parsed = parseStructuredInsight(fenced);
      expect(parsed.summary).toBe('Detected IP addresses and emails.');
    });

    it('throws when required fields are missing', () => {
      const incomplete = JSON.stringify({
        summary: 'Only summary here.',
      });

      expect(() => parseStructuredInsight(incomplete)).toThrow(
        /missing required insight fields/i
      );
    });

    it('throws when output is not valid JSON', () => {
      expect(() => parseStructuredInsight('Plain text with no JSON')).toThrow(
        /not be parsed as valid JSON/i
      );
    });

    it('rejects a JSON array instead of accepting it as an object', () => {
      expect(() => parseStructuredInsight('[]')).toThrow(/expected JSON object/i);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Mocked LanguageModel In-Browser Lifecycle
  // -------------------------------------------------------------------------
  describe('Mocked Browser LanguageModel lifecycle', () => {
    let originalLanguageModel: ChromeLanguageModelFactory | undefined;
    let originalAi: Window['ai'];

    beforeEach(() => {
      originalLanguageModel = window.LanguageModel;
      originalAi = window.ai;
    });

    afterEach(() => {
      window.LanguageModel = originalLanguageModel;
      window.ai = originalAi;
      vi.restoreAllMocks();
    });

    it('returns unsupported when window.LanguageModel is absent', async () => {
      delete window.LanguageModel;
      delete window.ai;
      const status = await checkAiAvailability();
      expect(status).toBe('unsupported');
    });

    it('checks availability and executes session prompt with clean destroy()', async () => {
      const mockDestroy = vi.fn();
      const mockPrompt = vi.fn().mockResolvedValue(
        JSON.stringify({
          summary: 'Mocked summary.',
          recommendation: 'Mocked recommendation.',
          caution: 'Mocked caution.',
        })
      );

      const mockFactory: ChromeLanguageModelFactory = {
        availability: vi.fn().mockResolvedValue('readily'),
        create: vi.fn().mockResolvedValue({
          prompt: mockPrompt,
          destroy: mockDestroy,
        }),
      };

      window.LanguageModel = mockFactory;

      const availability = await checkAiAvailability();
      expect(availability).toBe('available');

      const meta = buildSafeAiMetadata(sampleAudit);
      const insight = await generatePrivacyInsight(meta);

      expect(insight.summary).toBe('Mocked summary.');
      expect(mockPrompt).toHaveBeenCalledTimes(1);
      expect(mockPrompt).toHaveBeenCalledWith(
        buildUserPrompt(meta),
        { responseConstraint: INSIGHT_JSON_SCHEMA }
      );
      expect(mockFactory.create).toHaveBeenCalledWith({
        initialPrompts: [{ role: 'system', content: AI_SYSTEM_INSTRUCTION }],
      });
      const createOptions = vi.mocked(mockFactory.create).mock.calls[0][0];
      expect(createOptions).not.toHaveProperty('responseConstraint');
      expect(Object.keys(INSIGHT_JSON_SCHEMA.properties)).toEqual([
        'summary', 'recommendation', 'caution',
      ]);
      expect(INSIGHT_JSON_SCHEMA.required).toEqual([
        'summary', 'recommendation', 'caution',
      ]);
      // Session should be destroyed immediately after prompt to avoid lingering memory
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('cleans up session in finally block even if prompt throws an exception', async () => {
      const mockDestroy = vi.fn();
      const mockPrompt = vi.fn().mockRejectedValue(new Error('Internal inference failure'));
      const mockFactory: ChromeLanguageModelFactory = {
        availability: vi.fn().mockResolvedValue('readily'),
        create: vi.fn().mockResolvedValue({
          prompt: mockPrompt,
          destroy: mockDestroy,
        }),
      };

      window.LanguageModel = mockFactory;

      const meta = buildSafeAiMetadata(sampleAudit);
      await expect(generatePrivacyInsight(meta)).rejects.toThrow(/Internal inference failure/i);
      expect(mockPrompt).toHaveBeenCalledWith(
        buildUserPrompt(meta),
        { responseConstraint: INSIGHT_JSON_SCHEMA }
      );

      // Verify destroy was still called to release model memory
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('security boundary: generated AI prompt excludes raw document and PII values', async () => {
      const rawText = 'Private test: rahul@target.com, +919876543210, 8.8.8.8, ABCDE1234F, 1234 5678 9012, 4111111111111111';
      const audit: SanitizationAudit = {
        totalEntities: 3,
        counts: {
          [EntityType.EMAIL]: 1,
          [EntityType.CREDIT_CARD]: 1,
          [EntityType.PAN]: 1,
          [EntityType.PHONE]: 0,
          [EntityType.IP]: 0,
          [EntityType.AADHAAR]: 0,
        },
        originalLength: rawText.length,
        sanitizedLength: 50,
        mode: RedactionMode.FULL_MASK,
      };

      const meta = buildSafeAiMetadata(audit);
      const mockPrompt = vi.fn().mockResolvedValue(JSON.stringify({
        summary: 'Safe aggregate summary.',
        recommendation: 'Use an appropriate masking mode.',
        caution: 'Review residual context.',
      }));
      const mockFactory: ChromeLanguageModelFactory = {
        availability: vi.fn().mockResolvedValue('readily'),
        create: vi.fn().mockResolvedValue({ prompt: mockPrompt, destroy: vi.fn() }),
      };
      window.LanguageModel = mockFactory;

      await generatePrivacyInsight(meta);
      const prompt = mockPrompt.mock.calls[0][0];

      // Verify none of the raw text or entities are in the prompt
      expect(prompt).not.toContain('Private test');
      expect(prompt).not.toContain('Rahul');
      expect(prompt).not.toContain('rahul@target.com');
      expect(prompt).not.toContain('4111111111111111');
      expect(prompt).not.toContain('ABCDE1234F');
      expect(prompt).not.toContain('+919876543210');
      expect(prompt).not.toContain('8.8.8.8');
      expect(prompt).not.toContain('1234 5678 9012');

      // Verify prompt contains ONLY numeric counts and categories
      expect(prompt).toContain('Total sensitive entities detected: 3');
      expect(prompt).toContain('email: 1');
      expect(prompt).toContain('credit_card: 1');
      expect(prompt).toContain('pan: 1');
    });
  });
});
