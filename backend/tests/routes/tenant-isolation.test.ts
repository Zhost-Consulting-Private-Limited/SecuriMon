import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app';
import { prisma } from '../../src/utils/prisma';

// Locks in the tenant-ownership invariant that loadOwnedServer() (src/routes/server.ts)
// enforces for every /v1/servers/:serverId route: a caller must never be able to read
// another tenant's server data, even if they know (or guess) its ID.
describe('cross-tenant server isolation', () => {
  it("returns 404 (not another tenant's data) when a server belongs to a different tenant", async () => {
    const registerTenant = async (label: string) => {
      const email = `${label}-${crypto.randomUUID()}@example.com`;
      const res = await request(app)
        .post('/v1/auth/register')
        .send({ tenantName: `${label} Co`, email, password: 'a-valid-long-password' });
      return { token: res.body.token as string, tenantId: res.body.tenant.id as string };
    };

    const tenantA = await registerTenant('tenant-a');
    const tenantB = await registerTenant('tenant-b');

    const serverA = await prisma.server.create({
      data: { tenantId: tenantA.tenantId, hostname: 'a-host', apiKeyHash: crypto.randomUUID() },
    });
    const serverB = await prisma.server.create({
      data: { tenantId: tenantB.tenantId, hostname: 'b-host', apiKeyHash: crypto.randomUUID() },
    });

    const ownServerRes = await request(app)
      .get(`/v1/servers/${serverA.id}`)
      .set('Authorization', `Bearer ${tenantA.token}`);
    expect(ownServerRes.status).toBe(200);
    expect(ownServerRes.body.id).toBe(serverA.id);

    const crossTenantRes = await request(app)
      .get(`/v1/servers/${serverB.id}`)
      .set('Authorization', `Bearer ${tenantA.token}`);
    expect(crossTenantRes.status).toBe(404);
    expect(crossTenantRes.body).not.toHaveProperty('hostname');
  });
});
