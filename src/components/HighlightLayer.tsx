/**
 * HighlightLayer.tsx
 *
 * Renders a transparent overlay behind the textarea that shows coloured
 * highlights for each detected PII entity.
 *
 * Architecture:
 *   - Sits in position:absolute over the textarea (pointer-events:none).
 *   - Receives the same text and splits it into plain segments + highlighted spans.
 *   - Text is transparent; only the background colours are visible through the textarea.
 *
 * Security: no dangerouslySetInnerHTML — built purely from React elements.
 */
import { forwardRef, useMemo } from 'react';
import { PiiEntity } from '../core/pii/types';
import { ENTITY_META } from '../data/entityMeta';

interface Props {
  text: string;
  entities: PiiEntity[];
}

interface Segment {
  text: string;
  entity?: PiiEntity;
}

function buildSegments(text: string, entities: PiiEntity[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const entity of entities) {
    if (entity.start > cursor) {
      segments.push({ text: text.slice(cursor, entity.start) });
    }
    segments.push({ text: entity.value, entity });
    cursor = entity.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

export const HighlightLayer = forwardRef<HTMLDivElement, Props>(function HighlightLayer(
  { text, entities },
  ref
) {
  const segments = useMemo(() => buildSegments(text, entities), [text, entities]);

  return (
    <div className="input-panel__highlights" aria-hidden="true">
      <div ref={ref} className="input-panel__highlight-content">
      {segments.map((seg, i) => {
        if (!seg.entity) {
          return <span key={i}>{seg.text}</span>;
        }
        const meta = ENTITY_META[seg.entity.type];
        return (
          <mark
            key={i}
            className="pii-mark"
            style={{
              backgroundColor: meta.color,
              outline: `1.5px solid ${meta.borderColor}`,
              color: 'transparent',
            }}
          >
            {seg.text}
          </mark>
        );
      })}
      </div>
    </div>
  );
});
