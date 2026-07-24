import { afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma';

// Tests don't share fixture data between each other (each test creates its own
// tenant/user/server with a random-suffixed email/name), so no per-test truncation is
// needed - just make sure the Prisma connection is closed so the process exits cleanly.
afterAll(async () => {
  await prisma.$disconnect();
});
