import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'packages/*/test/**/*.test.ts', 'apps/proxy/test/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
