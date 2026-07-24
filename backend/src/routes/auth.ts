import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { signToken } from '../utils/jwt';

const router = Router();
const MIN_PASSWORD_LENGTH = 8;

// Temporary route to create the first tenant and user for testing
router.post('/register', async (req: Request, res: Response) => {
  const { tenantName, email, password } = req.body;

  if (!tenantName || !email || !password) {
    return res.status(400).json({ error: 'Tenant name, email, and password are required' });
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      users: {
        create: {
          email,
          passwordHash,
          role: 'owner',
        },
      },
    },
    include: {
      users: true,
    },
  });

  const user = tenant.users[0];
  const token = signToken({ id: user.id, tenantId: tenant.id, role: user.role });

  res.status(201).json({
    message: 'Registration successful',
    token,
    tenant: { id: tenant.id, name: tenant.name },
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ id: user.id, tenantId: user.tenantId, role: user.role });

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

// Reissues a fresh token for an already-authenticated session (sliding expiry).
router.post('/refresh', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const token = signToken({ id: user.id, tenantId: user.tenantId, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } });
});

// MSP: switch the active tenant context to one of the caller's managed sub-tenants.
router.post('/switch-tenant', authenticate, async (req: AuthRequest, res: Response) => {
  const { targetTenantId } = req.body;
  if (!targetTenantId) {
    return res.status(400).json({ error: 'targetTenantId is required' });
  }

  const targetTenant = await prisma.tenant.findFirst({
    where: { id: targetTenantId, parentMspTenantId: req.user!.tenantId },
  });

  if (!targetTenant) {
    return res.status(403).json({ error: 'Not an MSP-managed tenant for this account' });
  }

  const token = signToken({ id: req.user!.id, tenantId: targetTenant.id, role: req.user!.role });

  res.json({ token, tenant: { id: targetTenant.id, name: targetTenant.name } });
});

export default router;
