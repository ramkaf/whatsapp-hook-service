import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '#common': fileURLToPath(
        new URL('./src/libs/common/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
