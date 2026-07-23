import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireMspAdmin } from '../middlewares/auth';
import { prisma } from '../utils/prisma';
import { SERVER_PUBLIC_SELECT } from './server';

const router = Router();

// MSP multi-tenant management (FR-19xx). Mounted only in SaaS mode (see index.ts) -
// self-hosted deployments never mount this router, matching the billing gating pattern.

// List the caller's managed sub-tenants
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const managed = await prisma.tenant.findMany({
    where: { parentMspTenantId: req.user!.tenantId },
    select: { id: true, name: true, plan: true, createdAt: true },
  });
  res.json(managed);
});

// Create a new managed sub-tenant. MSP multi-tenant management is a Business-tier
// capability (see FEATURE_TIERS.md) - the caller's own tenant must be on that plan.
router.post('/', authenticate, requireMspAdmin, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  const parentTenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
  if (!parentTenant) return res.status(404).json({ error: 'Tenant not found' });
  if (parentTenant.plan !== 'business') {
    return res.status(403).json({ error: 'Multi-tenant management requires the Business plan' });
  }

  const subTenant = await prisma.tenant.create({
    data: { name, parentMspTenantId: parentTenant.id, plan: 'free' },
  });

  res.status(201).json({ id: subTenant.id, name: subTenant.name, plan: subTenant.plan, createdAt: subTenant.createdAt });
});

// List servers under a managed sub-tenant (or the caller's own tenant)
router.get('/:tenantId/servers', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

  const isOwnTenant = tenantId === req.user!.tenantId;
  const isManagedSubTenant = isOwnTenant
    ? true
    : !!(await prisma.tenant.findFirst({ where: { id: tenantId, parentMspTenantId: req.user!.tenantId } }));

  if (!isManagedSubTenant) {
    return res.status(403).json({ error: 'Not a managed tenant for this account' });
  }

  const servers = await prisma.server.findMany({
    where: { tenantId },
    select: { ...SERVER_PUBLIC_SELECT, scores: { orderBy: { scoredAt: 'desc' }, take: 1 } },
  });
  res.json(servers.map(({ scores, ...s }) => ({ ...s, latestScore: scores[0] ?? null })));
});

// White-label branding (Business-tier). Applies to the caller's own tenant only.
router.get('/white-label', authenticate, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant.whiteLabelConfig ? JSON.parse(tenant.whiteLabelConfig) : null);
});

router.put('/white-label', authenticate, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  if (tenant.plan !== 'business') {
    return res.status(403).json({ error: 'White-label branding requires the Business plan' });
  }

  const { companyName, primaryColor, logoUrl } = req.body;
  const config = { companyName: companyName || null, primaryColor: primaryColor || null, logoUrl: logoUrl || null };

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { whiteLabelConfig: JSON.stringify(config) },
  });

  res.json(config);
});

export default router;
