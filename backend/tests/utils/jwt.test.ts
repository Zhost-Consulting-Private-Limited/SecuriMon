import { describe, it, expect, afterEach, vi } from 'vitest';

describe('utils/jwt', () => {
  const validPayload = { id: 'user-1', tenantId: 'tenant-1', role: 'owner' };

  it('round-trips a signed token back to its original payload', async () => {
    const { signToken, verifyToken } = await import('../../src/utils/jwt');
    const token = signToken(validPayload);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(validPayload.id);
    expect(decoded.tenantId).toBe(validPayload.tenantId);
    expect(decoded.role).toBe(validPayload.role);
  });

  it('rejects a tampered token', async () => {
    const { signToken, verifyToken } = await import('../../src/utils/jwt');
    const token = signToken(validPayload);
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('rejects an expired token', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const { JWT_SECRET, verifyToken } = await import('../../src/utils/jwt');
    const expiredToken = jwt.sign(validPayload, JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 });
    expect(() => verifyToken(expiredToken)).toThrow();
  });

  describe('fail-fast startup check', () => {
    const originalSecret = process.env.JWT_SECRET;

    afterEach(() => {
      process.env.JWT_SECRET = originalSecret;
    });

    it('throws at module load when JWT_SECRET is unset', async () => {
      vi.resetModules();
      delete process.env.JWT_SECRET;
      await expect(import('../../src/utils/jwt')).rejects.toThrow(/JWT_SECRET/);
    });

    it('throws at module load when JWT_SECRET equals the old insecure default', async () => {
      vi.resetModules();
      process.env.JWT_SECRET = 'vigilon-super-secret-key-change-in-prod';
      await expect(import('../../src/utils/jwt')).rejects.toThrow(/JWT_SECRET/);
    });
  });
});
