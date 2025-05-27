/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // Optional: if you want to see more details during test runs
    // reporters: ['verbose'],
    coverage: {
      provider: 'v8', // or 'istanbul' - v8 is default with `npm run coverage`
      reporter: ['text', 'xml', 'html'], // Ensure xml is generated for potential external tools
      thresholds: {
        lines: 80,
        // functions: 80, // Optional: can add later if needed
        // branches: 80,  // Optional: can add later if needed
        // statements: 80 // Optional: can add later if needed
      },
    },
  },
});
