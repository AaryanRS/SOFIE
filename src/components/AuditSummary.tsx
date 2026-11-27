/**
 * AuditSummary.tsx
 *
 * Displays a technical audit panel summarizing:
 * - Total entities detected & replaced
 * - Per-type breakdown
 * - Current redaction mode
 * - Character count comparison (original vs sanitized)
 */

import { EntityType } from '../core/pii/types';
import { RedactionMode, SanitizationAudit } from '../core/redaction/types';
import { ENTITY_META, ENTITY_ORDER } from '../data/entityMeta';

interface Props {
  audit: SanitizationAudit;
}

const MODE_LABELS: Record<RedactionMode, string> = {
  [RedactionMode.FULL_MASK]: 'FULL MASK ([REDACTED])',
  [RedactionMode.PARTIAL_MASK]: 'PARTIAL MASK (SAFE HINTS)',
  [RedactionMode.PSEUDONYMIZATION]: 'CONSISTENT PSEUDONYMIZATION',
};

export function AuditSummary({ audit }: Props) {
  const { totalEntities, counts, originalLength, sanitizedLength, mode } = audit;
  const delta = sanitizedLength - originalLength;
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <div className="audit-panel" data-testid="audit-summary" aria-label="Sanitization audit summary">
      <div className="audit-panel__header">
        <span className="audit-panel__title">AUDIT SUMMARY</span>
        <span className="audit-panel__mode-tag">{MODE_LABELS[mode]}</span>
      </div>

      <div className="audit-panel__metrics">
        <div className="audit-metric">
          <span className="audit-metric__label">TOTAL SANITIZED</span>
          <span className="audit-metric__val" data-testid="audit-total-entities">
            {totalEntities}
          </span>
        </div>
        <div className="audit-metric">
          <span className="audit-metric__label">ORIGINAL CHARS</span>
          <span className="audit-metric__val" data-testid="audit-orig-chars">
            {originalLength.toLocaleString()}
          </span>
        </div>
        <div className="audit-metric">
          <span className="audit-metric__label">SANITIZED CHARS</span>
          <span className="audit-metric__val" data-testid="audit-san-chars">
            {sanitizedLength.toLocaleString()}
            <small className="audit-metric__delta"> ({deltaStr})</small>
          </span>
        </div>
      </div>

      <div className="audit-panel__breakdown">
        <table className="audit-table" aria-label="Entity breakdown table">
          <thead>
            <tr>
              <th scope="col">TYPE</th>
              <th scope="col">CATEGORY</th>
              <th scope="col" className="audit-table__count-col">DETECTED & MASKED</th>
            </tr>
          </thead>
          <tbody>
            {ENTITY_ORDER.map((type: EntityType) => {
              const meta = ENTITY_META[type];
              const count = counts[type] || 0;
              return (
                <tr key={type}>
                  <td>
                    <span
                      className="entity-pill"
                      style={{ color: meta.borderColor, borderColor: meta.borderColor }}
                      aria-label={meta.description}
                    >
                      {meta.shortLabel}
                    </span>
                  </td>
                  <td>{meta.label}</td>
                  <td
                    className="audit-table__count"
                    data-testid={`audit-count-${type}`}
                  >
                    {count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
