/**
 * prompt.ts
 *
 * Prompt construction and structured output parser for on-device Gemini Nano.
 * Ensures that ONLY safe aggregate metadata is ever formatted for the model.
 * Raw PII is never included.
 */

import { SanitizationAudit } from '../redaction/types';
import { SafeAiMetadata, StructuredPrivacyInsight } from './types';

export const AI_SYSTEM_INSTRUCTION =
  "You are SOFIE's local privacy insight assistant. You analyze only safe aggregate sanitization metadata. " +
  'Rules:\n' +
  '1. You receive ONLY aggregate sanitization metadata.\n' +
  '2. Never ask for, guess, or reconstruct original sensitive data.\n' +
  '3. Never invent specific PII values or names.\n' +
  '4. Do not modify the sanitization result.\n' +
  '5. Explain the detected risk in concise terms.\n' +
  '6. Explain why the selected redaction mode is appropriate.\n' +
  '7. Mention notable tradeoffs when useful.\n' +
  '8. Stay within 2–4 concise sentences.\n' +
  '9. Do not give legal or compliance guarantees.\n' +
  '10. Do not claim the document is completely safe or 100% risk-free.';

export const INSIGHT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Concise summary of the detected privacy risks based on entity categories.',
    },
    recommendation: {
      type: 'string',
      description: 'Why the chosen redaction mode is suitable or what tradeoff it provides.',
    },
    caution: {
      type: 'string',
      description: 'Any notable residual caution or context limitation without legal guarantees.',
    },
  },
  required: ['summary', 'recommendation', 'caution'],
};

/**
 * Extracts strictly safe aggregate metadata from the sanitization audit.
 * Does NOT contain any raw text, matched substrings, or original entities.
 */
export function buildSafeAiMetadata(audit: SanitizationAudit): SafeAiMetadata {
  return {
    totalEntities: audit.totalEntities,
    counts: { ...audit.counts },
    redactionMode: audit.mode,
    originalCharacterCount: audit.originalLength,
    detectedEntityCount: audit.totalEntities,
  };
}

/**
 * Builds the user prompt using only safe aggregate counts.
 */
export function buildUserPrompt(meta: SafeAiMetadata): string {
  const countsStr = Object.entries(meta.counts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  return (
    'Analyze this safe aggregate sanitization summary:\n' +
    `- Total sensitive entities detected: ${meta.totalEntities}\n` +
    `- Categories detected: ${countsStr || 'None'}\n` +
    `- Selected redaction mode: ${meta.redactionMode}\n` +
    `- Document length: ${meta.originalCharacterCount} characters\n\n` +
    'Provide a structured JSON object with keys "summary", "recommendation", and "caution".'
  );
}

/**
 * Safely parses the model response into a StructuredPrivacyInsight object.
 * Rejects malformed JSON and sanitizes text strings.
 */
export function parseStructuredInsight(rawText: string): StructuredPrivacyInsight {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response received from local AI model.');
  }

  // Strip code fences if present (e.g. ```json ... ```)
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }

  // Attempt to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Model response could not be parsed as valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Model output format invalid: expected JSON object.');
  }

  const obj = parsed as Record<string, unknown>;

  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  const recommendation = typeof obj.recommendation === 'string' ? obj.recommendation.trim() : '';
  const caution = typeof obj.caution === 'string' ? obj.caution.trim() : '';

  if (!summary || !recommendation || !caution) {
    throw new Error('Model output is missing required insight fields.');
  }

  return {
    summary,
    recommendation,
    caution,
  };
}
