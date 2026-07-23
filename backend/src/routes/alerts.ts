import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../utils/prisma';

const router = Router();

const VALID_METRICS = ['cpu', 'ram', 'disk', 'offline', 'ssh_attack'];

function serializeRule(rule: any) {
  return { ...rule, channels: JSON.parse(rule.channels), severityRouting: rule.severityRouting ? JSON.parse(rule.severityRouting) : null };
}

router.get('/rules', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const rules = await prisma.alertRule.findMany({ where: { tenantId } });
  res.json(rules.map(serializeRule));
});

router.post('/rules', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const { serverId, metric, condition, channels, severityRouting, enabled } = req.body;

  if (!metric || !VALID_METRICS.includes(metric)) {
    return res.status(400).json({ error: `metric must be one of: ${VALID_METRICS.join(', ')}` });
  }
  if (!condition || typeof condition !== 'string') {
    return res.status(400).json({ error: 'condition is required (e.g. "> 90")' });
  }
  if (!Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({ error: 'channels must be a non-empty array (e.g. ["email:you@example.com"])' });
  }

  if (serverId) {
    const owned = await prisma.server.findFirst({ where: { id: serverId, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Server not found' });
  }

  const rule = await prisma.alertRule.create({
    data: {
      tenantId: tenantId!,
      serverId: serverId || null,
      metric,
      condition,
      channels: JSON.stringify(channels),
      severityRouting: severityRouting ? JSON.stringify(severityRouting) : null,
      enabled: enabled ?? true,
    },
  });

  res.status(201).json(serializeRule(rule));
});

router.put('/rules/:ruleId', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const ruleId = typeof req.params.ruleId === 'string' ? req.params.ruleId : undefined;
  if (!ruleId) return res.status(400).json({ error: 'ruleId is required' });

  const existing = await prisma.alertRule.findFirst({ where: { id: ruleId, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Alert rule not found' });

  const { metric, condition, channels, severityRouting, enabled } = req.body;
  if (metric && !VALID_METRICS.includes(metric)) {
    return res.status(400).json({ error: `metric must be one of: ${VALID_METRICS.join(', ')}` });
  }

  const updated = await prisma.alertRule.update({
    where: { id: ruleId },
    data: {
      ...(metric ? { metric } : {}),
      ...(condition ? { condition } : {}),
      ...(channels ? { channels: JSON.stringify(channels) } : {}),
      ...(severityRouting !== undefined ? { severityRouting: severityRouting ? JSON.stringify(severityRouting) : null } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    },
  });

  res.json(serializeRule(updated));
});

router.delete('/rules/:ruleId', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const ruleId = typeof req.params.ruleId === 'string' ? req.params.ruleId : undefined;
  if (!ruleId) return res.status(400).json({ error: 'ruleId is required' });

  const existing = await prisma.alertRule.findFirst({ where: { id: ruleId, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Alert rule not found' });

  await prisma.alertRule.delete({ where: { id: ruleId } });
  res.status(204).send();
});

router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const history = await prisma.alertHistory.findMany({
    where: { alertRule: { tenantId } },
    include: { alertRule: true, server: { select: { hostname: true } } },
    orderBy: { firedAt: 'desc' },
    take: 200,
  });

  res.json(
    history.map((h) => ({
      ...h,
      deliveryStatus: h.deliveryStatus ? JSON.parse(h.deliveryStatus) : null,
    }))
  );
});

export default router;
