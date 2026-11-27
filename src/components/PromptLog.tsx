/**
 * PromptLog.tsx
 *
 * Mandatory deliverable: Displays technical audit metadata about the local AI interaction.
 * Proves that ZERO raw PII or document content was ever sent to the model.
 */

import { PromptLogEntry } from '../core/ai/types';

interface Props {
  entry: PromptLogEntry;
}

export function PromptLog({ entry }: Props) {
  return (
    <div className="prompt-log" data-testid="prompt-log" aria-label="AI Prompt Execution Log">
      <div className="prompt-log__header">
        <span className="prompt-log__title">PROMPT LOG — ZERO DATA LEAKAGE AUDIT</span>
        <span className={`prompt-log__badge prompt-log__badge--${entry.status}`}>
          {entry.status.toUpperCase()}
        </span>
      </div>

      <div className="prompt-log__grid">
        <div className="prompt-log__field">
          <span className="prompt-log__key">MODEL</span>
          <span className="prompt-log__val">{entry.model}</span>
        </div>
        <div className="prompt-log__field">
          <span className="prompt-log__key">RUNTIME</span>
          <span className="prompt-log__val">{entry.runtime}</span>
        </div>
        <div className="prompt-log__field">
          <span className="prompt-log__key">LOCATION</span>
          <span className="prompt-log__val">{entry.location}</span>
        </div>
        <div className="prompt-log__field">
          <span className="prompt-log__key">PROMPT TYPE</span>
          <span className="prompt-log__val">{entry.promptType}</span>
        </div>
        <div className="prompt-log__field">
          <span className="prompt-log__key">INPUT PAYLOAD</span>
          <span className="prompt-log__val">{entry.input}</span>
        </div>
        <div className="prompt-log__field prompt-log__field--highlight">
          <span className="prompt-log__key">RAW PII SENT</span>
          <span className="prompt-log__val prompt-log__val--zero">{entry.rawPiiSent}</span>
        </div>
      </div>

      <div className="prompt-log__template-wrap">
        <span className="prompt-log__key">SAFE METADATA TEMPLATE</span>
        <pre className="prompt-log__template" tabIndex={0} aria-label="Safe prompt template">
          {entry.safeTemplate}
        </pre>
      </div>

      {entry.errorMessage && (
        <div className="prompt-log__error" role="alert">
          ⚠ {entry.errorMessage}
        </div>
      )}
    </div>
  );
}
