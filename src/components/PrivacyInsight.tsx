/**
 * PrivacyInsight.tsx
 *
 * Dedicated UI panel for Google Built-in AI (Gemini Nano on-device).
 * Coordinates availability checks, user-gesture model download, insight generation,
 * structured output presentation, and visible Prompt Log.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AiAvailabilityState,
  PromptLogEntry,
  SafeAiMetadata,
  StructuredPrivacyInsight,
} from '../core/ai/types';
import {
  checkAiAvailability,
  generatePrivacyInsight,
  prepareLocalModel,
} from '../core/ai/browserAi';
import { AI_SYSTEM_INSTRUCTION, buildSafeAiMetadata, buildUserPrompt } from '../core/ai/prompt';
import { SanitizationAudit } from '../core/redaction/types';
import { PromptLog } from './PromptLog';

interface Props {
  audit: SanitizationAudit;
  hasInput: boolean;
}

export function PrivacyInsight({ audit, hasInput }: Props) {
  const [availability, setAvailability] = useState<AiAvailabilityState>('unsupported');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<StructuredPrivacyInsight | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // In-session cache to avoid redundant AI inference on identical metadata
  const cachedInsightRef = useRef<{ signature: string; insight: StructuredPrivacyInsight } | null>(null);

  // Reset insight when input is cleared
  useEffect(() => {
    if (!hasInput) {
      setInsight(null);
      setErrorMsg(null);
      cachedInsightRef.current = null;
    }
  }, [hasInput]);

  // Safe prompt log state
  const [logEntry, setLogEntry] = useState<PromptLogEntry>({
    model: 'GEMINI NANO',
    runtime: 'CHROME BUILT-IN AI (PROMPT API)',
    location: 'ON DEVICE (LOCAL INFERENCE)',
    promptType: 'PRIVACY RISK INSIGHT',
    input: 'AGGREGATED PII COUNTS + DOCUMENT METADATA',
    rawPiiSent: 'NONE (0 BYTES)',
    status: 'idle',
    safeTemplate: AI_SYSTEM_INSTRUCTION,
  });

  // Check availability on mount
  useEffect(() => {
    let mounted = true;
    checkAiAvailability().then((state) => {
      if (mounted) {
        setAvailability(state);
        if (state === 'unsupported' || state === 'unavailable') {
          setLogEntry((prev) => ({ ...prev, status: 'unavailable' }));
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Update prompt log template preview when audit metadata changes
  useEffect(() => {
    if (!hasInput) return;
    const safeMeta = buildSafeAiMetadata(audit);
    const templateWithSample = `${AI_SYSTEM_INSTRUCTION}\n\n--- SAMPLE INPUT (METADATA ONLY) ---\n${buildUserPrompt(safeMeta)}`;
    setLogEntry((prev) => ({
      ...prev,
      safeTemplate: templateWithSample,
    }));
  }, [audit, hasInput]);

  // Model preparation action (explicit user gesture)
  const handlePrepareModel = useCallback(async () => {
    setErrorMsg(null);
    setAvailability('downloading');
    setDownloadProgress(0);
    setLogEntry((prev) => ({ ...prev, status: 'downloading' }));

    try {
      await prepareLocalModel((pct) => setDownloadProgress(pct));
      setAvailability('available');
      setDownloadProgress(null);
      setLogEntry((prev) => ({ ...prev, status: 'idle' }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Model preparation failed.';
      setErrorMsg(msg);
      setAvailability('error');
      setDownloadProgress(null);
      setLogEntry((prev) => ({ ...prev, status: 'error', errorMessage: msg }));
    }
  }, []);

  // Insight generation action
  const handleGenerateInsight = useCallback(async () => {
    setErrorMsg(null);

    const safeMeta: SafeAiMetadata = buildSafeAiMetadata(audit);
    const metadataSignature = `${safeMeta.totalEntities}|${safeMeta.redactionMode}|${safeMeta.originalCharacterCount}|${JSON.stringify(safeMeta.counts)}`;

    // Use cached insight if identical metadata was already analyzed this session
    if (cachedInsightRef.current && cachedInsightRef.current.signature === metadataSignature) {
      setInsight(cachedInsightRef.current.insight);
      setLogEntry((prev) => ({
        ...prev,
        status: 'completed',
        errorMessage: undefined,
      }));
      return;
    }

    setIsGenerating(true);
    setLogEntry((prev) => ({
      ...prev,
      status: 'generating',
      timestamp: new Date().toLocaleTimeString(),
    }));

    try {
      const res = await generatePrivacyInsight(safeMeta);
      cachedInsightRef.current = { signature: metadataSignature, insight: res };
      setInsight(res);
      setLogEntry((prev) => ({
        ...prev,
        status: 'completed',
        errorMessage: undefined,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate insight.';
      setErrorMsg(msg);
      setLogEntry((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: msg,
      }));
    } finally {
      setIsGenerating(false);
    }
  }, [audit]);

  return (
    <section
      className="privacy-insight-panel"
      data-testid="privacy-insight-section"
      aria-labelledby="ai-panel-title"
    >
      <div className="privacy-insight-panel__header">
        <div className="privacy-insight-panel__titles">
          <h2 className="privacy-insight-panel__title" id="ai-panel-title">
            LOCAL AI / GEMINI NANO
          </h2>
          <span className="privacy-insight-panel__subtitle">
            ON-DEVICE PRIVACY INSIGHT (PROMPT API)
          </span>
        </div>
        <div className="privacy-insight-panel__badges">
          <span className="ai-badge ai-badge--ondevice">ON-DEVICE</span>
          <span className="ai-badge ai-badge--private">NO DOCUMENT CONTENT SENT TO SERVER</span>
        </div>
      </div>

      <div className="privacy-insight-panel__body">
        {/* Availability / Action Row */}
        <div className="ai-control-row">
          {availability === 'unsupported' && (
            <div className="ai-status-box ai-status-box--info" data-testid="ai-status-unsupported">
              <span className="ai-status-box__icon">ℹ</span>
              <div>
                <strong>LOCAL AI UNAVAILABLE ON THIS DEVICE</strong>
                <p>
                  Requires Chrome with Gemini Nano & Prompt API enabled. Deterministic detection,
                  sanitization, diff, and export remain fully functional.
                </p>
              </div>
            </div>
          )}

          {availability === 'unavailable' && (
            <div className="ai-status-box ai-status-box--warn" data-testid="ai-status-unavailable">
              <span className="ai-status-box__icon">⚠</span>
              <div>
                <strong>GEMINI NANO NOT READY</strong>
                <p>On-device model is currently unavailable on this browser instance.</p>
              </div>
            </div>
          )}

          {availability === 'downloadable' && (
            <div className="ai-download-box" data-testid="ai-downloadable-box">
              <p className="ai-download-box__text">
                Gemini Nano is supported on this browser but requires local one-time initialization.
              </p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handlePrepareModel}
                aria-label="Prepare Gemini Nano local model"
                data-testid="prepare-ai-btn"
              >
                ⚡ PREPARE GEMINI NANO (LOCAL INITIALIZATION)
              </button>
            </div>
          )}

          {availability === 'downloading' && (
            <div className="ai-progress-box" data-testid="ai-downloading-box">
              <span className="ai-progress-box__label">
                DOWNLOADING GEMINI NANO LOCAL WEIGHTS… {downloadProgress ?? 0}%
              </span>
              <progress
                className="ai-progress-bar"
                value={downloadProgress ?? 0}
                max={100}
                aria-label="Gemini Nano local weight download progress"
              />
            </div>
          )}

          {availability === 'available' && (
            <div className="ai-ready-box">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleGenerateInsight}
                disabled={isGenerating || !hasInput}
                aria-busy={isGenerating}
                data-testid="generate-ai-btn"
              >
                {isGenerating ? 'ANALYZING AGGREGATE METADATA…' : '⚡ GENERATE PRIVACY INSIGHT'}
              </button>
              <span className="ai-ready-hint">
                Sends only aggregate counts. Zero sensitive text leaves the sanitizer.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="ai-error-box" role="alert" data-testid="ai-error-box">
              ⚠ {errorMsg}
            </div>
          )}
        </div>

        {/* Structured Output Cards */}
        {insight && (
          <div
            className="insight-results"
            data-testid="insight-results"
            aria-live="polite"
          >
            <div className="insight-card">
              <h3 className="insight-card__title">SUMMARY</h3>
              <p className="insight-card__text" data-testid="insight-summary">
                {insight.summary}
              </p>
            </div>
            <div className="insight-card">
              <h3 className="insight-card__title">RECOMMENDATION</h3>
              <p className="insight-card__text" data-testid="insight-recommendation">
                {insight.recommendation}
              </p>
            </div>
            <div className="insight-card">
              <h3 className="insight-card__title">CAUTION</h3>
              <p className="insight-card__text" data-testid="insight-caution">
                {insight.caution}
              </p>
            </div>
          </div>
        )}

        {/* Prompt Log Deliverable */}
        <PromptLog entry={logEntry} />
      </div>
    </section>
  );
}
