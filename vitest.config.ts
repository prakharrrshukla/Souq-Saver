import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['sandbox/careem-mcp-ts/test/**/*.test.ts', 'server/src/**/*.test.ts', 'server/test/**/*.test.ts'],
    fileParallelism: false, // integration tests share fixed localhost ports
    testTimeout: 30000,
  },
});
