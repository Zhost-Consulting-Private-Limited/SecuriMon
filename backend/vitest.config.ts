import { defineConfig } from 'vitest/config';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// Loaded once here (the vitest config runs in the main process before workers spawn) so
// every test worker gets the test-only env (isolated sqlite file, dummy JWT secret) via
// vitest's `test.env`, rather than tests racing to load .env.test themselves.
const testEnv = loadEnv({ path: path.resolve(__dirname, '.env.test') }).parsed || {};

export default defineConfig({
  test: {
    globalSetup: './tests/globalSetup.ts',
    setupFiles: ['./tests/setup.ts'],
    env: testEnv,
    // All tests share one sqlite file (test.db) - run every test file sequentially in one
    // process so they can't race each other reading/writing the same tables.
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 15000,
  },
});
