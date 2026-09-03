import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest config — Node-only, no React plugin.
 *
 * We deliberately do NOT extend vite.config.ts because the React plugin
 * (and the heavy chunk-splitting build config) are irrelevant for the
 * Phase 9 unit tests and would slow test startup. Only the `@` alias
 * needs to be carried over so test files can import from `@/...`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Node environment is enough for the Phase 9 unit tests (firestore
    // functions are pure module boundaries, and we mock firebase/firestore
    // + @/app/firebase anyway). Tests that need DOM later can override
    // with `// @vitest-environment jsdom` at the top of the file.
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
    testTimeout: 20_000,
  },
});
