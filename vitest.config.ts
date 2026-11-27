/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Use jsdom for UI component tests; pure logic tests work in both environments.
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
