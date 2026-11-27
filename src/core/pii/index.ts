/**
 * index.ts — Detection Pipeline
 *
 * Public API for the SOFIE PII detection engine.
 *
 * `detectPII(text)` is the single entry point for Phase 1.
 * It combines all individual detectors, removes overlapping matches
 * (longer / higher-priority match wins), and returns a deterministic,
 * sorted list of PiiEntity objects.
 *
 * The input text is NEVER modified.
 */

import {
  detectAaadhaars,
  detectCreditCards,
  detectEmails,
  detectIPs,
  detectPANs,
  detectPhones,
} from './detectors.js';
import { PiiEntity } from './types.js';

// Re-export types and individual detectors so consumers can import from here
export { EntityType } from './types.js';
export type { PiiEntity } from './types.js';
export { isValidLuhn, isValidIpv4 } from './validators.js';
export {
  detectEmails,
  detectPhones,
  detectIPs,
  detectPANs,
  detectAaadhaars,
  detectCreditCards,
} from './detectors.js';

// ---------------------------------------------------------------------------
// Overlap resolution
// ---------------------------------------------------------------------------

/**
 * Given a list of entities (possibly overlapping), return a deduplicated list
 * where no two entities share any character positions.
 *
 * Strategy:
 *  1. Sort by start position ascending; on ties, prefer longer match.
 *  2. Walk through; if the next entity starts before the previous one ends,
 *     it is considered overlapping and is dropped.
 *
 * Credit cards take precedence over Aadhaar/phone raw digit matches because
 * they are added FIRST to the combined array (see `detectPII` below).
 */
function resolveOverlaps(entities: PiiEntity[]): PiiEntity[] {
  if (entities.length === 0) return [];

  // Sort: by start asc, then by length desc (longer match wins on same start)
  const sorted = [...entities].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const resolved: PiiEntity[] = [];
  let lastEnd = -1;

  for (const entity of sorted) {
    // Skip if this entity overlaps with the previous accepted one
    if (entity.start < lastEnd) continue;
    resolved.push(entity);
    lastEnd = entity.end;
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Scan `text` for all supported PII entity types.
 *
 * Returns an array of non-overlapping PiiEntity objects sorted by their
 * position in the original text.  The original text is never mutated.
 *
 * Priority order (earlier = higher priority in overlap resolution):
 *   email > credit_card > phone > ip > pan > aadhaar
 *
 * @param text - The raw text to scan.
 * @returns    - Sorted, deduplicated array of detected PII entities.
 */
export function detectPII(text: string): PiiEntity[] {
  // Run all detectors.  Order here determines priority when overlaps occur.
  const all: PiiEntity[] = [
    ...detectEmails(text),
    ...detectCreditCards(text),   // must come before phone/aadhaar (digit overlap)
    ...detectPhones(text),
    ...detectIPs(text),
    ...detectPANs(text),
    ...detectAaadhaars(text),
  ];

  return resolveOverlaps(all);
}
