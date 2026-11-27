/**
 * Vitest setup: extend expect with @testing-library/jest-dom matchers,
 * auto-cleanup after each test, and mock URL.createObjectURL for jsdom.
 */
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}

afterEach(() => {
  cleanup();
});
