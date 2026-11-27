/**
 * browserAi.ts
 *
 * Safe service layer for Chrome Built-in AI / LanguageModel (Gemini Nano).
 * Features:
 * - Guarded feature detection (never throws ReferenceError in unsupported browsers)
 * - Availability state mapping
 * - User-gesture model preparation
 * - Minimal single-shot session creation with prompt constraints
 * - Immediate session destruction (zero persistent session memory)
 */

import {
  AI_SYSTEM_INSTRUCTION,
  buildUserPrompt,
  INSIGHT_JSON_SCHEMA,
  parseStructuredInsight,
} from './prompt';
import {
  AiAvailabilityState,
  ChromeLanguageModelFactory,
  ChromeLanguageModelSession,
  SafeAiMetadata,
  StructuredPrivacyInsight,
} from './types';

/**
 * Accesses the browser's LanguageModel factory if present.
 * Supports both window.LanguageModel and window.ai.languageModel.
 */
export function getLanguageModelFactory(): ChromeLanguageModelFactory | null {
  if (typeof window === 'undefined') return null;

  if (window.LanguageModel && typeof window.LanguageModel.create === 'function') {
    return window.LanguageModel;
  }

  if (window.ai?.languageModel && typeof window.ai.languageModel.create === 'function') {
    return window.ai.languageModel;
  }

  return null;
}

/**
 * Maps raw availability string from Chrome Prompt API to standardized AiAvailabilityState.
 */
export function mapAvailabilityStatus(raw: string): AiAvailabilityState {
  const norm = (raw || '').toLowerCase().trim();
  switch (norm) {
    case 'readily':
    case 'available':
      return 'available';
    case 'after-download':
    case 'downloadable':
      return 'downloadable';
    case 'downloading':
      return 'downloading';
    case 'no':
    case 'unavailable':
      return 'unavailable';
    default:
      return 'unavailable';
  }
}

/**
 * Safely checks on-device AI capability state.
 */
export async function checkAiAvailability(): Promise<AiAvailabilityState> {
  const factory = getLanguageModelFactory();
  if (!factory) {
    return 'unsupported';
  }

  try {
    if (typeof factory.availability === 'function') {
      const status = await factory.availability();
      return mapAvailabilityStatus(status);
    }
    if (typeof factory.capabilities === 'function') {
      const caps = await factory.capabilities();
      return mapAvailabilityStatus(caps.available);
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Prepares the local model (triggered only by explicit user gesture).
 * Handles download monitoring if the model is in 'after-download' state.
 */
export async function prepareLocalModel(
  onProgress?: (progressPercent: number) => void
): Promise<boolean> {
  const factory = getLanguageModelFactory();
  if (!factory) {
    throw new Error('Local AI is not supported on this browser.');
  }

  try {
    const session = await factory.create({
      monitor: (m) => {
        if (m && typeof m.addEventListener === 'function') {
          m.addEventListener('downloadprogress', (e: { loaded: number; total: number }) => {
            if (e.total > 0 && onProgress) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(Math.min(100, Math.max(0, pct)));
            }
          });
        }
      },
    });

    // Destroy initial test session immediately
    session.destroy();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to prepare local AI model.';
    throw new Error(msg);
  }
}

/**
 * Generates an on-device privacy insight using strictly safe aggregate metadata.
 * Destroys the model session immediately after generation.
 */
export async function generatePrivacyInsight(
  meta: SafeAiMetadata
): Promise<StructuredPrivacyInsight> {
  const factory = getLanguageModelFactory();
  if (!factory) {
    throw new Error('Local AI is not supported in this browser environment.');
  }

  const promptText = buildUserPrompt(meta);

  let session: ChromeLanguageModelSession | null = null;
  try {
    session = await factory.create({
      initialPrompts: [{ role: 'system', content: AI_SYSTEM_INSTRUCTION }],
    });

    const response = await session.prompt(promptText, {
      responseConstraint: INSIGHT_JSON_SCHEMA,
    });
    return parseStructuredInsight(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate on-device privacy insight.';
    throw new Error(msg);
  } finally {
    if (session) {
      try {
        session.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
