import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../utils/prisma';

const router = Router();

// Per SRS.md §3.21: safe actions default on, destructive actions default off.
const KNOWN_ACTIONS: Record<string, { defaultEnabled: boolean; label: string; description: string }> = {
  enable_ufw: {
    defaultEnabled: true,
    label: 'Enable firewall',
    description: 'Automatically enable UFW when a scan finds it inactive.',
  },
  rotate_logs: {
    defaultEnabled: true,
    label: 'Rotate logs',
    description: 'Automatically rotate logs when triggered.',
  },
  disable_ssh_password_auth: {
    defaultEnabled: false,
    label: 'Disable SSH password login',
    description: 'Automatically disable SSH password authentication when a scan finds it enabled.',
  },
  block_ip: {
    defaultEnabled: false,
    label: 'Block brute-force source IP',
    description: 'Automatically block the source IP when an SSH brute-force attack is detected.',
  },
};

// Shared by the threat-event ingestion route to decide whether to auto-fire a
// remediation action for a given tenant, without duplicating the default-fallback logic.
export async function isAutoRemediationEnabled(tenantId: string, action: string): Promise<boolean> {
  const policy = await prisma.remediationPolicy.findFirst({ where: { tenantId, action } });
  if (policy) return policy.autoEnabled;
  return KNOWN_ACTIONS[action]?.defaultEnabled ?? false;
}

router.get('/policies', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const existing = await prisma.remediationPolicy.findMany({ where: { tenantId } });
  const existingByAction = new Map(existing.map((p) => [p.action, p]));

  const policies = Object.entries(KNOWN_ACTIONS).map(([action, meta]) => {
    const row = existingByAction.get(action);
    return {
      action,
      label: meta.label,
      description: meta.description,
      autoEnabled: row ? row.autoEnabled : meta.defaultEnabled,
    };
  });

  res.json(policies);
});

router.put('/policies/:action', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const action = typeof req.params.action === 'string' ? req.params.action : undefined;
  const { autoEnabled } = req.body;

  if (!action || !KNOWN_ACTIONS[action]) {
    return res.status(400).json({ error: `action must be one of: ${Object.keys(KNOWN_ACTIONS).join(', ')}` });
  }
  if (typeof autoEnabled !== 'boolean') {
    return res.status(400).json({ error: 'autoEnabled must be a boolean' });
  }

  const existing = await prisma.remediationPolicy.findFirst({ where: { tenantId, action } });
  const policy = existing
    ? await prisma.remediationPolicy.update({ where: { id: existing.id }, data: { autoEnabled } })
    : await prisma.remediationPolicy.create({ data: { tenantId, action, autoEnabled } });

  res.json({
    action: policy.action,
    label: KNOWN_ACTIONS[action].label,
    description: KNOWN_ACTIONS[action].description,
    autoEnabled: policy.autoEnabled,
  });
});

export default router;
