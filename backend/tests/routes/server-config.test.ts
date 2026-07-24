import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app';
import { prisma } from '../../src/utils/prisma';

async function registerTenantWithServer() {
  const email = `server-config-${crypto.randomUUID()}@example.com`;
  const registerRes = await request(app)
    .post('/v1/auth/register')
    .send({ tenantName: 'Config Test Co', email, password: 'a-valid-long-password' });

  const token = registerRes.body.token as string;
  const tenantId = registerRes.body.tenant.id as string;

  const server = await prisma.server.create({
    data: { tenantId, hostname: 'config-test-host', apiKeyHash: crypto.randomUUID() },
  });

  return { token, server };
}

describe('GET/PUT /v1/servers/:serverId/config', () => {
  it('saves and reads back all four config fields', async () => {
    const { token, server } = await registerTenantWithServer();

    const putRes = await request(app)
      .put(`/v1/servers/${server.id}/config`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fimWatchPaths: ['/etc/nginx/nginx.conf'],
        logSources: ['/var/log/app.log'],
        metricsIntervalSeconds: 30,
        scanSchedule: 'daily',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body).toEqual({
      fimWatchPaths: ['/etc/nginx/nginx.conf'],
      logSources: ['/var/log/app.log'],
      metricsIntervalSeconds: 30,
      scanSchedule: 'daily',
    });

    const getRes = await request(app).get(`/v1/servers/${server.id}/config`).set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(putRes.body);
  });

  it('defaults metricsIntervalSeconds/scanSchedule to 0/"" when never set', async () => {
    const { token, server } = await registerTenantWithServer();

    const res = await request(app).get(`/v1/servers/${server.id}/config`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.metricsIntervalSeconds).toBe(0);
    expect(res.body.scanSchedule).toBe('');
  });

  it('accepts metricsIntervalSeconds=0 as an explicit "use default" value', async () => {
    const { token, server } = await registerTenantWithServer();

    const res = await request(app)
      .put(`/v1/servers/${server.id}/config`)
      .set('Authorization', `Bearer ${token}`)
      .send({ metricsIntervalSeconds: 0 });

    expect(res.status).toBe(200);
    expect(res.body.metricsIntervalSeconds).toBe(0);
  });

  it('rejects metricsIntervalSeconds below the minimum', async () => {
    const { token, server } = await registerTenantWithServer();

    const res = await request(app)
      .put(`/v1/servers/${server.id}/config`)
      .set('Authorization', `Bearer ${token}`)
      .send({ metricsIntervalSeconds: 5 });

    expect(res.status).toBe(400);
  });

  it('rejects metricsIntervalSeconds above the maximum', async () => {
    const { token, server } = await registerTenantWithServer();

    const res = await request(app)
      .put(`/v1/servers/${server.id}/config`)
      .set('Authorization', `Bearer ${token}`)
      .send({ metricsIntervalSeconds: 5000 });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid scanSchedule value', async () => {
    const { token, server } = await registerTenantWithServer();

    const res = await request(app)
      .put(`/v1/servers/${server.id}/config`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scanSchedule: 'weekly' });

    expect(res.status).toBe(400);
  });

  it("does not let one tenant read or write another tenant's server config", async () => {
    const tenantA = await registerTenantWithServer();
    const tenantB = await registerTenantWithServer();

    const getRes = await request(app)
      .get(`/v1/servers/${tenantB.server.id}/config`)
      .set('Authorization', `Bearer ${tenantA.token}`);
    expect(getRes.status).toBe(404);

    const putRes = await request(app)
      .put(`/v1/servers/${tenantB.server.id}/config`)
      .set('Authorization', `Bearer ${tenantA.token}`)
      .send({ scanSchedule: 'daily' });
    expect(putRes.status).toBe(404);
  });
});
