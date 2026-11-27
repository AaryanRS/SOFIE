/**
 * types.ts
 *
 * Types for the SOFIE Redaction & Sanitization engine.
 */

import { EntityType, PiiEntity } from '../pii/types';

export enum RedactionMode {
  FULL_MASK = 'full_mask',
  PARTIAL_MASK = 'partial_mask',
  PSEUDONYMIZATION = 'pseudonymization',
}

export interface SanitizedReplacement {
  entity: PiiEntity;
  replacementValue: string;
  originalStart: number;
  originalEnd: number;
  sanitizedStart: number;
  sanitizedEnd: number;
}

export interface SanitizationAudit {
  totalEntities: number;
  counts: Record<EntityType, number>;
  originalLength: number;
  sanitizedLength: number;
  mode: RedactionMode;
}

export interface SanitizationResult {
  sanitizedText: string;
  replacements: SanitizedReplacement[];
  mode: RedactionMode;
  audit: SanitizationAudit;
}

export interface SanitizeOptions {
  text: string;
  entities: PiiEntity[];
  mode: RedactionMode;
  pseudonymMap?: Map<string, string>;
}
