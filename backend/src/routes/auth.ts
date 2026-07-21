import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'securimon-super-secret-key-change-in-prod';
const JWT_EXPIRES_IN = '1d';

// Temporary route to create the first tenant and user for testing
router.post('/register', async (req: Request, res: Response) => {
  const { tenantName, email, password } = req.body;

  if (!tenantName || !email || !password) {
    return res.status(400).json({ error: 'Tenant name, email, and password are required' });
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
  const token = jwt.sign({ id: user.id, tenantId: tenant.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

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

  const token = jwt.sign({ id: user.id, tenantId: user.tenantId, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

export default router;
