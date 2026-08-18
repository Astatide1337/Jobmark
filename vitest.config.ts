import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Vitest runs outside Next.js' Server Component graph. Keep the runtime
      // guard in application builds while treating it as a no-op in tests.
      'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'e2e/**', 'test-results/**'],
  },
});
