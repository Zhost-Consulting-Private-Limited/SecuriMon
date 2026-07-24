import { execSync } from 'child_process';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// Runs once before the whole suite: resets the isolated test database to a clean slate
// matching the current schema. --force-reset guarantees a known-empty starting point
// regardless of what a previous local test run left behind.
export default function globalSetup() {
  const parsed = loadEnv({ path: path.resolve(__dirname, '../.env.test') }).parsed || {};
  execSync('npx prisma db push --force-reset --skip-generate --accept-data-loss', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ...parsed },
    stdio: 'inherit',
  });
}
