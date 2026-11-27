/**
 * App.test.tsx — UI integration tests for SOFIE Phase 2.
 *
 * Tests:
 *  1.  Application renders without crashing.
 *  2.  "LOAD SAMPLE" button loads sample text.
 *  3.  Sample text triggers PII detection (counts appear).
 *  4.  Detection counts are displayed per entity type.
 *  5.  File input accepts .txt.
 *  6.  File input accepts .csv.
 *  7.  Unsupported file type is rejected with an error message.
 *  8.  Clear/reset removes input and detection.
 *  9.  No-PII state appears for clean text.
 *  10. Detection results come from the actual detectPII engine.
 *  11. Empty-state shown when no input provided.
 *  12. File content is loaded correctly from .txt.
 *  13. Empty file shows an appropriate error.
 *  14. Character count updates on input.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import { SAMPLE_TEXT } from '../data/sample';
import { detectPII } from '../core/pii/index';
import * as exportUtils from '../utils/export';

// Helper: get the textarea
function getTextarea() {
  return screen.getByTestId('text-input') as HTMLTextAreaElement;
}

// ---------------------------------------------------------------------------

describe('SOFIE Phase 2 UI', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('1. Application renders without crashing', async () => {
    render(<App />);
    expect(screen.getByText(/SANITIZE YOUR/i)).toBeInTheDocument();
    expect(screen.getByTestId('text-input')).toBeInTheDocument();
  });

  it('2. "LOAD SAMPLE" button loads sample text into the textarea', async () => {
    render(<App />);
    const sampleBtn = screen.getByRole('button', { name: /load sample/i });
    await act(async () => { fireEvent.click(sampleBtn); });
    const ta = getTextarea();
    expect(ta.value).toBe(SAMPLE_TEXT);
  });

  it('3. Sample text triggers PII detection — detection summary appears', async () => {
    render(<App />);
    const sampleBtn = screen.getByRole('button', { name: /load sample/i });
    await act(async () => { fireEvent.click(sampleBtn); });
    // Advance debounce timer
    await act(async () => { vi.advanceTimersByTime(400); });
    const summary = await screen.findByTestId('detection-summary');
    expect(summary).toBeInTheDocument();
  });

  it('4. Detection counts reflect actual engine output on sample text', async () => {
    render(<App />);
    const sampleBtn = screen.getByRole('button', { name: /load sample/i });
    await act(async () => { fireEvent.click(sampleBtn); });
    await act(async () => { vi.advanceTimersByTime(400); });

    // Get ground-truth from the engine directly
    const expected = detectPII(SAMPLE_TEXT);
    const totalExpected = expected.length;

    // The summary total badge should be visible
    await waitFor(() => {
      expect(screen.getByTestId('detection-summary')).toBeInTheDocument();
    });

    // Check entity items count matches engine output
    const items = screen.getAllByTestId('entity-item');
    expect(items.length).toBe(totalExpected);
  });

  it('5. File input accepts a .txt file', async () => {
    render(<App />);
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const content = 'Hello from test@example.com';
    const file = new File([content], 'data.txt', { type: 'text/plain' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(getTextarea().value).toBe(content);
  });

  it('6. File input accepts a .csv file', async () => {
    render(<App />);
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const content = 'name,email\nAlice,alice@example.com';
    const file = new File([content], 'records.csv', { type: 'text/csv' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(getTextarea().value).toBe(content);
  });

  it('7. Unsupported file type shows an error message', async () => {
    render(<App />);
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['<html/>', ''], 'page.html', { type: 'text/html' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    const err = await screen.findByTestId('file-error');
    expect(err).toBeInTheDocument();
    expect(err.textContent).toMatch(/unsupported file type/i);
  });

  it('8. Clear button removes input text and detection results', async () => {
    render(<App />);
    // Load sample first
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /load sample/i }));
    });
    await act(async () => { vi.advanceTimersByTime(400); });
    // Confirm detection appeared
    expect(screen.getByTestId('detection-summary')).toBeInTheDocument();

    // Now clear
    const clearBtn = screen.getByTestId('clear-btn');
    await act(async () => { fireEvent.click(clearBtn); });
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(getTextarea().value).toBe('');
    expect(screen.getByTestId('empty-no-input')).toBeInTheDocument();
  });

  it('9. Clean text (no PII) shows the no-PII empty state', async () => {
    render(<App />);
    await act(async () => {
      fireEvent.change(getTextarea(), {
        target: { value: 'The quick brown fox jumps over the lazy dog.' },
      });
    });
    await act(async () => { vi.advanceTimersByTime(400); });
    const noPii = await screen.findByTestId('empty-no-pii');
    expect(noPii).toBeInTheDocument();
    expect(noPii.textContent).toMatch(/no supported pii patterns/i);
  });

  it('10. Detection results correspond to detectPII engine output', async () => {
    const knownText = 'Email: user@example.com and IP: 10.0.0.1 and card 4111111111111111';
    const expected = detectPII(knownText);

    render(<App />);
    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: knownText } });
    });
    await act(async () => { vi.advanceTimersByTime(400); });

    await waitFor(() => {
      const items = screen.getAllByTestId('entity-item');
      expect(items.length).toBe(expected.length);
    });
  });

  it('11. Empty state shown when no input provided', () => {
    render(<App />);
    expect(screen.getByTestId('empty-no-input')).toBeInTheDocument();
  });

  it('12. .txt file content populates the textarea correctly', async () => {
    render(<App />);
    const content = 'Server: 192.168.1.1\nAdmin: admin@corp.com';
    const file = new File([content], 'servers.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => {
      expect(getTextarea().value).toBe(content);
    });
  });

  it('13. Empty .txt file shows an appropriate error', async () => {
    render(<App />);
    const file = new File([''], 'empty.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    const err = await screen.findByTestId('file-error');
    expect(err).toBeInTheDocument();
    expect(err.textContent?.toLowerCase()).toMatch(/empty/i);
  });

  it('14. Typing into the textarea updates the character count', async () => {
    render(<App />);
    const ta = getTextarea();
    const testStr = 'Hello World';
    await act(async () => {
      fireEvent.change(ta, { target: { value: testStr } });
    });
    // The char count label uses toLocaleString — look for the numeric portion
    expect(screen.getByText(/11 chars/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Phase 3 UI Tests: Redaction Modes, Live Diff, Audit & Download
  // -------------------------------------------------------------------------

  it('15. Renders Redaction Mode selector with Full, Partial, and Pseudonym options', () => {
    render(<App />);
    expect(screen.getByTestId('mode-selector')).toBeInTheDocument();
    expect(screen.getByTestId('mode-btn-full_mask')).toBeInTheDocument();
    expect(screen.getByTestId('mode-btn-partial_mask')).toBeInTheDocument();
    expect(screen.getByTestId('mode-btn-pseudonymization')).toBeInTheDocument();
  });

  it('16. Loading sample displays Side-by-Side Diff and Audit Summary', async () => {
    render(<App />);
    const sampleBtn = screen.getByRole('button', { name: /load sample/i });
    await act(async () => { fireEvent.click(sampleBtn); });
    await act(async () => { vi.advanceTimersByTime(400); });

    // Diff viewer should be visible
    expect(await screen.findByTestId('diff-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('diff-pane-original')).toBeInTheDocument();
    expect(screen.getByTestId('diff-pane-sanitized')).toBeInTheDocument();

    // Audit summary should be visible
    expect(screen.getByTestId('audit-summary')).toBeInTheDocument();
    expect(screen.getByTestId('audit-total-entities')).toBeInTheDocument();
  });

  it('17. Switching redaction mode to Partial Mask updates the sanitized view', async () => {
    render(<App />);
    const sampleBtn = screen.getByRole('button', { name: /load sample/i });
    await act(async () => { fireEvent.click(sampleBtn); });
    await act(async () => { vi.advanceTimersByTime(400); });

    // Switch to Partial Mask
    const partialBtn = screen.getByTestId('mode-btn-partial_mask');
    await act(async () => { fireEvent.click(partialBtn); });

    const sanPane = screen.getByTestId('diff-pane-sanitized');
    // In partial mask, we expect partial tokens like 'r***@' or 'XXXX' instead of '[REDACTED]'
    expect(sanPane.textContent).toContain('r***@');
  });

  it('18. Switching redaction mode to Pseudonymization displays consistent tokens', async () => {
    render(<App />);
    const sampleBtn = screen.getByRole('button', { name: /load sample/i });
    await act(async () => { fireEvent.click(sampleBtn); });
    await act(async () => { vi.advanceTimersByTime(400); });

    // Switch to Pseudonymization
    const pseudoBtn = screen.getByTestId('mode-btn-pseudonymization');
    await act(async () => { fireEvent.click(pseudoBtn); });

    const sanPane = screen.getByTestId('diff-pane-sanitized');
    expect(sanPane.textContent).toContain('EMAIL_01');
    expect(sanPane.textContent).toContain('PHONE_01');
  });

  it('19. Download button is enabled when PII is detected and triggers file export', async () => {
    render(<App />);
    const sampleBtn = screen.getByRole('button', { name: /load sample/i });
    await act(async () => { fireEvent.click(sampleBtn); });
    await act(async () => { vi.advanceTimersByTime(400); });

    const downloadBtn = screen.getByTestId('download-btn');
    expect(downloadBtn).not.toBeDisabled();
    // Click should execute smoothly without crashing
    await act(async () => { fireEvent.click(downloadBtn); });
  });

  it('20. Reset/clear removes Diff viewer, Audit summary, and resets state', async () => {
    render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /load sample/i }));
    });
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();

    // Click clear
    const clearBtn = screen.getByTestId('clear-btn');
    await act(async () => { fireEvent.click(clearBtn); });
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('audit-summary')).not.toBeInTheDocument();
  });

  it('21. Radio group supports keyboard arrow navigation between modes', async () => {
    render(<App />);
    // Type some text first so mode selector is enabled
    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'User data test' } });
    });
    await act(async () => { vi.advanceTimersByTime(400); });

    const fullBtn = screen.getByTestId('mode-btn-full_mask');
    const partialBtn = screen.getByTestId('mode-btn-partial_mask');

    expect(fullBtn).toHaveAttribute('aria-checked', 'true');
    expect(partialBtn).toHaveAttribute('aria-checked', 'false');

    // Press ArrowRight to move to Partial Mask
    await act(async () => {
      fireEvent.keyDown(fullBtn, { key: 'ArrowRight' });
    });

    expect(partialBtn).toHaveAttribute('aria-checked', 'true');
    expect(fullBtn).toHaveAttribute('aria-checked', 'false');
  });

  it('22. File input rejects files larger than 10MB memory guard', async () => {
    render(<App />);
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    // Create a mock large file object (> 10MB)
    const largeFile = new File(['x'], 'huge_dataset.txt', { type: 'text/plain' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
    });

    const errorBox = await screen.findByTestId('file-error');
    expect(errorBox).toBeInTheDocument();
    expect(errorBox.textContent).toContain('exceeds the 10MB in-browser processing limit');
  });

  it('23. Invalidates detected ranges immediately when the document changes', async () => {
    const downloadSpy = vi.spyOn(exportUtils, 'downloadFile');
    render(<App />);

    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'Old: old@example.com' } });
      vi.advanceTimersByTime(300);
    });
    expect(screen.getAllByTestId('entity-item')).toHaveLength(1);
    expect(screen.getByTestId('download-btn')).toBeEnabled();

    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'New: 9876543210' } });
    });

    expect(screen.queryAllByTestId('entity-item')).toHaveLength(0);
    expect(screen.getByText('SCANNING…')).toBeInTheDocument();
    expect(screen.getByTestId('download-btn')).toBeDisabled();
    expect(screen.getByTestId('copy-btn')).toBeDisabled();
    expect(screen.getByText(/SCANNING CURRENT INPUT/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('download-btn'));
    expect(downloadSpy).not.toHaveBeenCalled();
  });

  it('24. Sanitizes fresh detection ranges after the new scan completes', async () => {
    const downloadSpy = vi.spyOn(exportUtils, 'downloadFile');
    render(<App />);

    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'Old: old@example.com' } });
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'Fresh: 9876543210' } });
    });
    expect(screen.getByTestId('download-btn')).toBeDisabled();

    await act(async () => { vi.advanceTimersByTime(300); });

    expect(screen.getByTestId('download-btn')).toBeEnabled();
    expect(screen.getByTestId('diff-pane-sanitized')).toHaveTextContent('Fresh: [REDACTED]');
    expect(screen.getByTestId('diff-pane-sanitized')).not.toHaveTextContent('9876543210');

    fireEvent.click(screen.getByTestId('download-btn'));
    expect(downloadSpy).toHaveBeenCalledWith('Fresh: [REDACTED]', expect.any(String), false);
  });

  it('25. Rapid edits keep actions disabled until the latest version is detected', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'First: first@example.com' } });
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('download-btn')).toBeEnabled();

    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'Second: 9876543210' } });
      vi.advanceTimersByTime(150);
      fireEvent.change(getTextarea(), { target: { value: 'Final: final@example.com' } });
    });
    expect(screen.getByTestId('download-btn')).toBeDisabled();
    expect(screen.queryAllByTestId('entity-item')).toHaveLength(0);

    await act(async () => { vi.advanceTimersByTime(299); });
    expect(screen.getByTestId('download-btn')).toBeDisabled();

    await act(async () => { vi.advanceTimersByTime(1); });
    expect(screen.getByTestId('download-btn')).toBeEnabled();
    expect(screen.getAllByTestId('entity-item')).toHaveLength(1);
    expect(screen.getByTestId('diff-pane-sanitized')).toHaveTextContent('Final: [REDACTED]');
  });

  it('26. Clearing the document invalidates detections and removes export actions', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.change(getTextarea(), { target: { value: 'User: user@example.com' } });
      vi.advanceTimersByTime(300);
    });
    expect(screen.getAllByTestId('entity-item')).toHaveLength(1);

    await act(async () => { fireEvent.click(screen.getByTestId('clear-btn')); });

    expect(getTextarea()).toHaveValue('');
    expect(screen.queryAllByTestId('entity-item')).toHaveLength(0);
    expect(screen.queryByTestId('download-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-no-input')).toBeInTheDocument();
  });
});
