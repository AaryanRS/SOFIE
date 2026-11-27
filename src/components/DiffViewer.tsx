/**
 * DiffViewer.tsx
 *
 * Side-by-side original vs sanitized diff viewer.
 * Highlights sensitive entities on the left and their sanitized replacements on the right.
 * Responsive: converts to stacked layout on narrow screens.
 */

import { useMemo } from 'react';
import { SanitizedReplacement } from '../core/redaction/types';
import { ENTITY_META } from '../data/entityMeta';

interface Props {
  originalText: string;
  sanitizedText: string;
  replacements: SanitizedReplacement[];
}

type DiffSegment =
  | {
      kind: 'unchanged';
      origText: string;
      sanText: string;
    }
  | {
      kind: 'replacement';
      origText: string;
      sanText: string;
      replacement: SanitizedReplacement;
    };

export function DiffViewer({ originalText, sanitizedText, replacements }: Props) {
  // Construct aligned segments between original and sanitized
  const segments = useMemo<DiffSegment[]>(() => {
    if (replacements.length === 0) {
      return [{ kind: 'unchanged', origText: originalText, sanText: sanitizedText }];
    }

    const segs: DiffSegment[] = [];
    let origCursor = 0;

    for (const r of replacements) {
      // Chunk of unchanged text before this replacement
      if (r.originalStart > origCursor) {
        const unchanged = originalText.slice(origCursor, r.originalStart);
        segs.push({
          kind: 'unchanged',
          origText: unchanged,
          sanText: unchanged,
        });
      }

      // Replaced entity
      segs.push({
        kind: 'replacement',
        origText: r.entity.value,
        sanText: r.replacementValue,
        replacement: r,
      });

      origCursor = r.originalEnd;
    }

    // Unchanged text after last replacement
    if (origCursor < originalText.length) {
      const rest = originalText.slice(origCursor);
      segs.push({
        kind: 'unchanged',
        origText: rest,
        sanText: rest,
      });
    }

    return segs;
  }, [originalText, sanitizedText, replacements]);

  return (
    <div className="diff-viewer" data-testid="diff-viewer" aria-label="Side-by-side comparison">
      <div className="diff-viewer__grid">
        {/* Left: Original Pane */}
        <section className="diff-pane diff-pane--orig" aria-labelledby="diff-orig-title">
          <div className="diff-pane__header">
            <h3 className="diff-pane__title" id="diff-orig-title">
              ORIGINAL INPUT
            </h3>
            <span className="diff-pane__tag">UNSANITIZED</span>
          </div>
          <div
            className="diff-pane__content"
            data-testid="diff-pane-original"
            tabIndex={0}
            role="region"
            aria-label="Original document text with highlighted sensitive entities"
          >
            <pre className="diff-pane__code">
              {segments.map((seg, i) => {
                if (seg.kind === 'unchanged') {
                  return <span key={i}>{seg.origText}</span>;
                }
                const meta = ENTITY_META[seg.replacement.entity.type];
                return (
                  <mark
                    key={i}
                    className="diff-mark diff-mark--orig"
                    title={`Original ${meta.label}: ${seg.origText}`}
                    style={{
                      borderColor: meta.borderColor,
                    }}
                  >
                    <span className="diff-mark__label" aria-hidden="true">
                      {meta.shortLabel}:
                    </span>
                    {seg.origText}
                  </mark>
                );
              })}
            </pre>
          </div>
        </section>

        {/* Right: Sanitized Pane */}
        <section className="diff-pane diff-pane--san" aria-labelledby="diff-san-title">
          <div className="diff-pane__header">
            <h3 className="diff-pane__title" id="diff-san-title">
              SANITIZED OUTPUT
            </h3>
            <span className="diff-pane__tag diff-pane__tag--san">PROTECTED</span>
          </div>
          <div
            className="diff-pane__content"
            data-testid="diff-pane-sanitized"
            tabIndex={0}
            role="region"
            aria-label="Sanitized output text with masked entities"
          >
            <pre className="diff-pane__code">
              {segments.map((seg, i) => {
                if (seg.kind === 'unchanged') {
                  return <span key={i}>{seg.sanText}</span>;
                }
                const meta = ENTITY_META[seg.replacement.entity.type];
                return (
                  <mark
                    key={i}
                    className="diff-mark diff-mark--san"
                    title={`Masked as: ${seg.sanText}`}
                    style={{
                      borderLeftColor: meta.borderColor,
                    }}
                  >
                    {seg.sanText}
                  </mark>
                );
              })}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
