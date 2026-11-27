/**
 * DetectionPanel.tsx
 *
 * Right workspace panel: entity summary table + entity detail list.
 * Handles all empty states.
 */
import { PiiEntity } from '../core/pii/types';
import { EntityType, countEntitiesByType } from '../core/pii/index';
import { ENTITY_META, ENTITY_ORDER } from '../data/entityMeta';

interface Props {
  entities: PiiEntity[];
  isDetecting: boolean;
  hasInput: boolean;
}

export function DetectionPanel({ entities, isDetecting, hasInput }: Props) {
  const total = entities.length;

  const counts = countEntitiesByType(entities);

  return (
    <section className="panel" aria-labelledby="detection-panel-title">
      <div className="panel__header">
        <h2 className="panel__title" id="detection-panel-title">DETECTION</h2>
        {total > 0 && (
          <span className="panel__badge panel__badge--active" aria-label={`${total} entities detected`}>
            {total} FOUND
          </span>
        )}
      </div>

      <div className="panel__body detection-panel__body">
        {/* Detecting indicator */}
        {isDetecting && (
          <div className="detecting-indicator" role="status" aria-live="polite">
            <span className="detecting-indicator__dot" aria-hidden="true" />
            SCANNING…
          </div>
        )}

        {/* Empty: no input yet */}
        {!isDetecting && !hasInput && (
          <div className="empty-state" data-testid="empty-no-input">
            <span className="empty-state__icon" aria-hidden="true">🔍</span>
            <p className="empty-state__title">AWAITING INPUT</p>
            <p className="empty-state__sub">
              Paste text or load a file to begin local PII detection.
            </p>
          </div>
        )}

        {/* Empty: input present, nothing found */}
        {!isDetecting && hasInput && total === 0 && (
          <div className="empty-state empty-state--clean" data-testid="empty-no-pii">
            <span className="empty-state__icon" aria-hidden="true">✓</span>
            <p className="empty-state__title">NO SUPPORTED PII PATTERNS DETECTED</p>
            <p className="empty-state__sub">
              No emails, phone numbers, IPs, PAN, Aadhaar, or credit cards found in the
              supplied text.
            </p>
          </div>
        )}

        {/* Results */}
        {!isDetecting && total > 0 && (
          <>
            <DetectionSummary total={total} counts={counts} />
            <EntityList entities={entities} />
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function DetectionSummary({
  total,
  counts,
}: {
  total: number;
  counts: Record<EntityType, number>;
}) {
  return (
    <div className="detection-summary" data-testid="detection-summary">
      <div className="detection-summary__total" role="status" aria-live="polite">
        PII DETECTED
        <span aria-label={`${total} sensitive entities`}>{total}</span>
      </div>

      <table
        className="detection-summary__table"
        aria-label="PII entity counts by type"
      >
        <thead>
          <tr>
            <th scope="col">TYPE</th>
            <th scope="col">LABEL</th>
            <th scope="col" className="detection-summary__count">COUNT</th>
          </tr>
        </thead>
        <tbody>
          {ENTITY_ORDER.map((type) => {
            const meta = ENTITY_META[type];
            const count = counts[type];
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
                  className="detection-summary__count"
                  aria-label={`${count} ${meta.label} entities`}
                  data-testid={`count-${type}`}
                >
                  {count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EntityList({ entities }: { entities: PiiEntity[] }) {
  return (
    <section aria-labelledby="entity-list-label">
      <h3
        id="entity-list-label"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--grey-400)',
          margin: '12px 0 6px',
        }}
      >
        DETECTED ENTITIES
      </h3>

      <ul className="entity-list" aria-label="List of detected PII entities">
        {entities.map((entity, i) => {
          const meta = ENTITY_META[entity.type];
          return (
            <li
              key={`${entity.type}-${entity.start}-${i}`}
              className="entity-item"
              data-testid="entity-item"
              aria-label={`${meta.description}: ${entity.value}, position ${entity.start} to ${entity.end}`}
            >
              <span className="entity-item__dot" aria-hidden="true" />
              <span
                className="entity-pill"
                style={{ color: meta.borderColor, borderColor: meta.borderColor }}
                aria-hidden="true"
              >
                {meta.shortLabel}
              </span>
              <span className="entity-item__value" title={entity.value}>
                {entity.value}
              </span>
              <span className="entity-item__pos" aria-hidden="true">
                [{entity.start}–{entity.end}]
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
