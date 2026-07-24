import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app';
import { prisma } from '../../src/utils/prisma';

// Sets up a real server row with a known plaintext API key, hashed the same way
// authenticateAgent (src/routes/agent.ts) verifies it - so tests can hit agent-facing
// routes exactly like a real agent would, not by mocking the middleware.
async function createTestServerWithApiKey() {
  const tenant = await prisma.tenant.create({ data: { name: `log-events-tenant-${crypto.randomUUID()}` } });
  const plainApiKey = `sk_test_${crypto.randomUUID()}`;
  const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');
  const server = await prisma.server.create({
    data: { tenantId: tenant.id, hostname: 'log-events-host', apiKeyHash },
  });
  return { server, apiKey: plainApiKey };
}

describe('POST /v1/agent/:serverId/log-events', () => {
  it('rejects a missing/invalid level', async () => {
    const { server, apiKey } = await createTestServerWithApiKey();

    const res = await request(app)
      .post(`/v1/agent/${server.id}/log-events`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ source: '/var/log/app.log', level: 'INFO', message: 'just chatter' });

    expect(res.status).toBe(400);
  });

  it('rejects a request with no valid agent API key', async () => {
    const { server } = await createTestServerWithApiKey();

    const res = await request(app)
      .post(`/v1/agent/${server.id}/log-events`)
      .set('Authorization', 'Bearer not-a-real-key')
      .send({ source: '/var/log/app.log', level: 'ERROR', message: 'disk full' });

    expect(res.status).toBe(401);
  });

  it('creates a TimelineEvent (not a ThreatEvent) for a valid ERROR line', async () => {
    const { server, apiKey } = await createTestServerWithApiKey();

    const res = await request(app)
      .post(`/v1/agent/${server.id}/log-events`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ source: '/var/log/nginx/error.log', level: 'ERROR', message: 'upstream timed out' });

    expect(res.status).toBe(202);

    const timelineEvents = await prisma.timelineEvent.findMany({ where: { serverId: server.id } });
    expect(timelineEvents).toHaveLength(1);
    expect(timelineEvents[0].eventCategory).toBe('ERROR');
    expect(timelineEvents[0].description).toBe('upstream timed out');

    const threatEvents = await prisma.threatEvent.findMany({ where: { serverId: server.id } });
    expect(threatEvents).toHaveLength(0);
  });

  it('truncates an overly long message', async () => {
    const { server, apiKey } = await createTestServerWithApiKey();
    const longMessage = 'x'.repeat(1000);

    const res = await request(app)
      .post(`/v1/agent/${server.id}/log-events`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ source: '/var/log/app.log', level: 'WARNING', message: longMessage });

    expect(res.status).toBe(202);

    const [event] = await prisma.timelineEvent.findMany({ where: { serverId: server.id } });
    expect(event.description?.length).toBe(500);
  });
});
