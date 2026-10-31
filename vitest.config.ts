import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: {
    tsconfigPaths: true,
    // Test the source barrel instead of package.json's compiled runtime target.
    alias: {
      '#common': fileURLToPath(
        new URL('./src/libs/common/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
