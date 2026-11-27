/**
 * useDetection.ts
 * Custom hook that runs detectPII on input text with debouncing.
 * Returns the entity list and a "detecting" flag.
 */
import { useState, useEffect, useRef } from 'react';
import { detectPII } from '../core/pii/index';
import { PiiEntity } from '../core/pii/types';

const DEBOUNCE_MS = 300;

export function useDetection(text: string, documentVersion: number): {
  entities: PiiEntity[];
  isDetecting: boolean;
} {
  const [completedDetection, setCompletedDetection] = useState<{
    documentVersion: number;
    entities: PiiEntity[];
  }>({ documentVersion: -1, entities: [] });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCurrentDocument = completedDetection.documentVersion === documentVersion;
  const isDetecting = Boolean(text.trim()) && !isCurrentDocument;
  const entities = isCurrentDocument ? completedDetection.entities : [];

  useEffect(() => {
    if (!text.trim()) {
      setCompletedDetection({ documentVersion, entities: [] });
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const result = detectPII(text);
      setCompletedDetection({ documentVersion, entities: result });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, documentVersion]);

  return { entities, isDetecting };
}
