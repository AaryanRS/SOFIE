/**
 * App.tsx — Root application component for SOFIE Phase 3.
 *
 * Coordinates:
 * - Raw input (text / file upload / sample)
 * - Detection engine integration
 * - Redaction mode selection (Full Mask, Partial Mask, Pseudonymization)
 * - Side-by-side Live Diff (Original vs Sanitized)
 * - Technical Audit metrics
 * - One-click client-side download (.txt / .csv)
 */
import { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { InputPanel } from './components/InputPanel';
import { DetectionPanel } from './components/DetectionPanel';
import { RedactionModeSelector } from './components/RedactionModeSelector';
import { DiffViewer } from './components/DiffViewer';
import { AuditSummary } from './components/AuditSummary';
import { PrivacyInsight } from './components/PrivacyInsight';
import { useDetection } from './hooks/useDetection';
import { sanitizeText } from './core/redaction/redaction';
import { RedactionMode } from './core/redaction/types';
import { downloadFile, getSanitizedFilename } from './utils/export';
import { SAMPLE_TEXT } from './data/sample';
import './styles/global.css';
import './styles/app.css';

export default function App() {
  const [text, setText] = useState('');
  const [documentVersion, setDocumentVersion] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<RedactionMode>(RedactionMode.FULL_MASK);
  const [copied, setCopied] = useState(false);

  const { entities, isDetecting } = useDetection(text, documentVersion);

  const updateDocument = useCallback((nextText: string) => {
    setText(nextText);
    setDocumentVersion((version) => version + 1);
  }, []);

  // Compute sanitized text & audit on mode or detection change
  const sanitizationResult = useMemo(() => {
    return sanitizeText({
      text,
      entities,
      mode,
    });
  }, [text, entities, mode]);

  const handleTextChange = useCallback((next: string) => {
    updateDocument(next);
    setFileError(null);
    if (fileName) setFileName(null);
  }, [fileName, updateDocument]);

  const handleFileLoad = useCallback((content: string, name: string) => {
    updateDocument(content);
    setFileName(name);
    setFileError(null);
  }, [updateDocument]);

  const handleFileError = useCallback((msg: string) => {
    setFileError(msg);
  }, []);

  const handleLoadSample = useCallback(() => {
    updateDocument(SAMPLE_TEXT);
    setFileName(null);
    setFileError(null);
  }, [updateDocument]);

  const handleClear = useCallback(() => {
    updateDocument('');
    setFileName(null);
    setFileError(null);
  }, [updateDocument]);

  const handleDownload = useCallback(() => {
    if (isDetecting || !entities.length || !sanitizationResult.sanitizedText) return;
    const isCsv = fileName?.endsWith('.csv') || (text.includes(',') && text.includes('\n'));
    const downloadName = getSanitizedFilename(fileName, isCsv);
    downloadFile(sanitizationResult.sanitizedText, downloadName, isCsv);
  }, [isDetecting, entities.length, sanitizationResult.sanitizedText, fileName, text]);

  const handleCopy = useCallback(async () => {
    if (isDetecting || !entities.length || !sanitizationResult.sanitizedText) return;
    try {
      await navigator.clipboard.writeText(sanitizationResult.sanitizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API not permitted
    }
  }, [isDetecting, entities.length, sanitizationResult.sanitizedText]);

  const hasInput = text.trim().length > 0;
  const hasDetections = entities.length > 0;

  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />

        <div className="workspace-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px 0' }}>
          <RedactionModeSelector
            mode={mode}
            onChange={setMode}
            disabled={!hasInput}
          />
        </div>

        <div className="workspace">
          <InputPanel
            text={text}
            entities={entities}
            fileName={fileName}
            fileError={fileError}
            onTextChange={handleTextChange}
            onFileLoad={handleFileLoad}
            onFileError={handleFileError}
            onLoadSample={handleLoadSample}
            onClear={handleClear}
          />
          <DetectionPanel
            entities={entities}
            isDetecting={isDetecting}
            hasInput={hasInput}
          />
        </div>

        {/* Live Diff & Audit Section */}
        {hasInput && (
          <section className="diff-section" aria-labelledby="diff-section-heading">
            <div className="diff-header-bar">
              <h2 className="diff-header-bar__title" id="diff-section-heading">
                SIDE-BY-SIDE SANITIZATION DIFF
              </h2>
              <div className="diff-header-bar__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleCopy}
                  disabled={!hasDetections || isDetecting}
                  aria-label="Copy sanitized text to clipboard"
                  data-testid="copy-btn"
                >
                  {copied ? '✓ COPIED' : '📋 COPY SANITIZED'}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleDownload}
                  disabled={!hasDetections || isDetecting}
                  aria-label="Download sanitized file to local computer"
                  data-testid="download-btn"
                >
                  ⚡ DOWNLOAD SANITIZED FILE
                </button>
              </div>
            </div>

            {isDetecting ? (
              <div className="sanitization-pending" role="status" aria-live="polite">
                SCANNING CURRENT INPUT — SANITIZED PREVIEW WILL UPDATE WHEN COMPLETE.
              </div>
            ) : (
              <>
                <DiffViewer
                  originalText={text}
                  sanitizedText={sanitizationResult.sanitizedText}
                  replacements={sanitizationResult.replacements}
                />

                <AuditSummary audit={sanitizationResult.audit} />

                <PrivacyInsight
                  audit={sanitizationResult.audit}
                  hasInput={hasInput}
                />
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <span className="footer__copy">
          © 2026 Aaryan Shelar · SOFIE v0.3.0 · MIT License
        </span>
        <span className="footer__notice">
          <strong>🔒 LOCAL ONLY</strong> — sensitive user data never leaves this browser tab
        </span>
      </footer>
    </>
  );
}
