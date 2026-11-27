/**
 * types.ts
 *
 * Types for Google Built-in AI / LanguageModel integration.
 */

import type { EntityType } from '../pii/types';
import type { RedactionMode } from '../redaction/types';

export type AiAvailabilityState =
  | 'unsupported'
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'available'
  | 'error';

export interface SafeAiMetadata {
  totalEntities: number;
  counts: Record<EntityType, number>;
  redactionMode: RedactionMode;
  originalCharacterCount: number;
}

export interface StructuredPrivacyInsight {
  summary: string;
  recommendation: string;
  caution: string;
}

export interface PromptLogEntry {
  model: string;
  runtime: string;
  location: string;
  promptType: string;
  input: string;
  rawPiiSent: string;
  status: 'idle' | 'downloading' | 'generating' | 'completed' | 'error' | 'unavailable';
  safeTemplate: string;
  timestamp?: string;
  errorMessage?: string;
}

/**
 * Defensive browser window declarations for Chrome Built-in AI
 */
export interface ChromeLanguageModelCapabilities {
  available: 'no' | 'readily' | 'after-download';
}

export interface ChromeLanguageModelCreateOptions {
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  monitor?: (monitor: {
    addEventListener: (event: 'downloadprogress', listener: (e: { loaded: number; total: number }) => void) => void;
  }) => void;
}

export interface ChromeLanguageModelPromptOptions {
  responseConstraint?: ChromePromptResponseConstraint;
}

export interface ChromePromptResponseConstraint {
  type: 'object';
  properties: Record<string, { type: 'string'; description?: string }>;
  required: string[];
}

export interface ChromeLanguageModelSession {
  prompt: (input: string, options?: ChromeLanguageModelPromptOptions) => Promise<string>;
  destroy: () => void;
}

export interface ChromeLanguageModelFactory {
  availability: () => Promise<string>;
  capabilities?: () => Promise<ChromeLanguageModelCapabilities>;
  create: (options?: ChromeLanguageModelCreateOptions) => Promise<ChromeLanguageModelSession>;
}

/** Browser globals exposed by Chrome's on-device Prompt API. */
declare global {
  interface Window {
    LanguageModel?: ChromeLanguageModelFactory;
    ai?: { languageModel?: ChromeLanguageModelFactory };
  }
}
