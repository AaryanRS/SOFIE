/**
 * RedactionModeSelector.tsx
 *
 * Keyboard-accessible radio group for choosing the active redaction mode:
 * Full Mask, Partial Mask, or Consistent Pseudonymization.
 */

import { useRef, KeyboardEvent } from 'react';
import { RedactionMode } from '../core/redaction/types';

interface Props {
  mode: RedactionMode;
  onChange: (mode: RedactionMode) => void;
  disabled?: boolean;
}

interface ModeOption {
  value: RedactionMode;
  label: string;
  badge: string;
  description: string;
}

const MODES: ModeOption[] = [
  {
    value: RedactionMode.FULL_MASK,
    label: 'FULL MASK',
    badge: '[REDACTED]',
    description: 'Replaces all sensitive entities with [REDACTED]',
  },
  {
    value: RedactionMode.PARTIAL_MASK,
    label: 'PARTIAL MASK',
    badge: 'j***@example.com',
    description: 'Preserves safe formatting & hints without exposing values',
  },
  {
    value: RedactionMode.PSEUDONYMIZATION,
    label: 'PSEUDONYMIZATION',
    badge: 'EMAIL_01',
    description: 'Consistently maps identical values to distinct tokens',
  },
];

export function RedactionModeSelector({ mode, onChange, disabled = false }: Props) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (disabled) return;

    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % MODES.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + MODES.length) % MODES.length;
    }

    if (targetIndex >= 0) {
      onChange(MODES[targetIndex].value);
      buttonRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <div
      className="mode-selector"
      role="radiogroup"
      aria-label="Select redaction mode"
      data-testid="mode-selector"
    >
      <div className="mode-selector__header">
        <span className="mode-selector__title">REDACTION MODE</span>
        <span className="mode-selector__hint">CHOOSE MASKING STRATEGY</span>
      </div>

      <div className="mode-selector__options">
        {MODES.map((opt, idx) => {
          const isSelected = mode === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => { buttonRefs.current[idx] = el; }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              className={`mode-btn ${isSelected ? 'mode-btn--active' : ''}`}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              data-testid={`mode-btn-${opt.value}`}
            >
              <div className="mode-btn__top">
                <span className="mode-btn__radio-circle" aria-hidden="true" />
                <span className="mode-btn__label">{opt.label}</span>
                <span className="mode-btn__badge">{opt.badge}</span>
              </div>
              <p className="mode-btn__desc">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
