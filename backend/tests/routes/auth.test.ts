import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app';

function uniqueEmail(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

describe('POST /v1/auth/register', () => {
  it('registers a new tenant/user and returns a usable token', async () => {
    const email = uniqueEmail('register-happy');
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ tenantName: 'Test Co', email, password: 'a-valid-long-password' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.email).toBe(email);
  });

  it('rejects a password under 8 characters', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ tenantName: 'Test Co', email: uniqueEmail('short-pw'), password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  it('rejects a duplicate email', async () => {
    const email = uniqueEmail('duplicate');
    const payload = { tenantName: 'Test Co', email, password: 'a-valid-long-password' };

    const first = await request(app).post('/v1/auth/register').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/v1/auth/register').send(payload);
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/already registered/);
  });
});

describe('POST /v1/auth/login', () => {
  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: uniqueEmail('nobody'), password: 'whatever-password' });

    expect(res.status).toBe(401);
  });

  it('rejects a wrong password', async () => {
    const email = uniqueEmail('wrong-pw');
    await request(app)
      .post('/v1/auth/register')
      .send({ tenantName: 'Test Co', email, password: 'the-correct-password' });

    const res = await request(app).post('/v1/auth/login').send({ email, password: 'the-wrong-password' });

    expect(res.status).toBe(401);
  });

  it('logs in successfully and the issued token authenticates a protected route', async () => {
    const email = uniqueEmail('login-happy');
    await request(app)
      .post('/v1/auth/register')
      .send({ tenantName: 'Test Co', email, password: 'the-correct-password' });

    const loginRes = await request(app).post('/v1/auth/login').send({ email, password: 'the-correct-password' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTypeOf('string');

    const protectedRes = await request(app)
      .get('/v1/servers')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(protectedRes.status).toBe(200);
  });
});
