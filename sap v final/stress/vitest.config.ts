import { defineConfig } from 'vitest/config';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep stress-test X-ray runs out of the app's .run/xray (the live UI lists that folder).
process.env.XRAY_DIR ??= mkdtempSync(join(tmpdir(), 'souq-stress-xray-'));

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['*.test.ts'],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
