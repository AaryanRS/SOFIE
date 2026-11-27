/**
 * InputPanel.tsx
 *
 * Left workspace panel: text input, file upload, sample loader.
 * Uses the highlight+textarea overlay pattern for safe, styled PII highlighting.
 */
import { useRef, useEffect, ChangeEvent } from 'react';
import { PiiEntity } from '../core/pii/types';
import { HighlightLayer } from './HighlightLayer';

const ACCEPTED_EXTENSIONS = ['.txt', '.csv'];
const ACCEPTED_MIME = ['text/plain', 'text/csv', 'application/csv'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB in-browser memory guard

interface Props {
  text: string;
  entities: PiiEntity[];
  fileName: string | null;
  fileError: string | null;
  onTextChange: (text: string) => void;
  onFileLoad: (text: string, name: string) => void;
  onFileError: (msg: string) => void;
  onLoadSample: () => void;
  onClear: () => void;
}

export function InputPanel({
  text,
  entities,
  fileName,
  fileError,
  onTextChange,
  onFileLoad,
  onFileError,
  onLoadSample,
  onClear,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);

  const lineCount = text ? text.split('\n').length : 0;
  const charCount = text.length;

  useEffect(() => {
    const textarea = textareaRef.current;
    const content = highlightsRef.current;
    if (!textarea || !content) return;

    const syncGeometry = () => {
      content.style.width = `${textarea.clientWidth}px`;
      content.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    };

    syncGeometry();
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(syncGeometry);
    observer?.observe(textarea);
    return () => observer?.disconnect();
  }, [text]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;

    // Reset so same file can be re-selected
    e.target.value = '';

    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      onFileError(
        `File "${file.name}" exceeds the 10MB in-browser processing limit.`
      );
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      onFileError(
        `Unsupported file type "${file.name}". Please upload a .txt or .csv file.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content !== 'string') return;
      if (content.trim().length === 0) {
        onFileError(`"${file.name}" appears to be empty.`);
        return;
      }
      onFileLoad(content, file.name);
    };
    reader.onerror = () => {
      onFileError(`Failed to read "${file.name}".`);
    };
    reader.readAsText(file);
  }

  return (
    <section className="panel" aria-labelledby="input-panel-title">
      <div className="panel__header">
        <h2 className="panel__title" id="input-panel-title">RAW INPUT</h2>
        {fileName && (
          <span className="panel__badge panel__badge--active" aria-label={`Loaded file: ${fileName}`}>
            📄 {fileName}
          </span>
        )}
      </div>

      <div className="panel__body">
        {/* Toolbar */}
        <div className="input-panel__toolbar" role="toolbar" aria-label="Input controls">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={onLoadSample}
            aria-label="Load sample text"
            data-testid="load-sample-btn"
          >
            ⚡ LOAD SAMPLE
          </button>

          <label className="btn btn--sm input-panel__file-label" aria-label="Upload a .txt or .csv file">
            📂 UPLOAD FILE
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={handleFileChange}
              aria-label="Choose a .txt or .csv file to load"
              data-testid="file-input"
            />
          </label>

          {text && (
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--danger"
              onClick={onClear}
              aria-label="Clear all input text"
              data-testid="clear-btn"
            >
              ✕ CLEAR
            </button>
          )}

          {charCount > 0 && (
            <span className="input-panel__meta" aria-live="polite">
              {charCount.toLocaleString()} CHARS · {lineCount} LINES
            </span>
          )}
        </div>

        {/* File error */}
        {fileError && (
          <div
            className="input-panel__error"
            role="alert"
            aria-live="assertive"
            data-testid="file-error"
          >
            ⚠ {fileError}
          </div>
        )}

        {/* Editor: highlight layer + textarea overlay */}
        <div className="input-panel__editor-wrap">
          {/* Highlight layer is behind the textarea */}
          <HighlightLayer ref={highlightsRef} text={text} entities={entities} />

          <label htmlFor="pii-input" className="sr-only">
            Raw text input — paste sensitive text to scan for PII
          </label>
          <textarea
            id="pii-input"
            ref={textareaRef}
            className="input-panel__textarea"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onScroll={(e) => {
              const layer = highlightsRef.current;
              if (!layer) return;
              layer.style.transform = `translate(${-e.currentTarget.scrollLeft}px, ${-e.currentTarget.scrollTop}px)`;
            }}
            placeholder={
              'Paste sensitive text here…\n\nAll processing happens locally in your browser.\nNothing is sent to any server.'
            }
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-testid="text-input"
            aria-describedby="input-local-notice"
          />
        </div>

        <p
          id="input-local-notice"
          className="sr-only"
        >
          Your text is processed locally. Nothing leaves the browser.
        </p>
      </div>
    </section>
  );
}
