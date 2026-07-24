import { describe, it, expect, vi } from 'vitest';
import { authenticate, AuthRequest } from '../../src/middlewares/auth';
import { signToken } from '../../src/utils/jwt';
import type { Response } from 'express';

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('middlewares/auth.authenticate', () => {
  it('rejects when no Authorization header is present', () => {
    const req = { headers: {} } as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a malformed Authorization header', () => {
    const req = { headers: { authorization: 'Basic abc123' } } as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid/tampered token', () => {
    const token = signToken({ id: 'u1', tenantId: 't1', role: 'owner' });
    const req = { headers: { authorization: `Bearer ${token}xyz` } } as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('populates req.user and calls next() for a valid token', () => {
    const payload = { id: 'u1', tenantId: 't1', role: 'owner' };
    const token = signToken(payload);
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(payload);
  });
});
