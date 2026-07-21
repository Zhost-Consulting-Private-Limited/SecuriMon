import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../utils/prisma';
import { sendCommandToAgent } from '../ws';

const router = Router();

// Dashboard Route to get servers
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const servers = await prisma.server.findMany({
    where: { tenantId }
  });
  res.json(servers);
});

// Dashboard Route to trigger a remediation fix manually
router.post('/:serverId/findings/:findingId/fix', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const { serverId, findingId } = req.params;

  // Validate ownership
  const server = await prisma.server.findFirst({
    where: { id: serverId, tenantId }
  });

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const finding = await prisma.securityFinding.findFirst({
    where: { id: findingId, serverId }
  });

  if (!finding) {
    return res.status(404).json({ error: 'Finding not found' });
  }

  // Map finding to an action
  let action = '';
  let params = {};

  if (finding.ruleId === 'firewall.ufw_active') {
    action = 'enable_ufw';
  } else if (finding.ruleId === 'ssh.password_login') {
    action = 'disable_ssh_password_auth';
  } else {
    return res.status(400).json({ error: 'Finding is not auto-fixable' });
  }

  try {
    const remediation = await sendCommandToAgent(serverId, action, params, 'manual', finding.id);
    
    // Mark finding as fix_pending
    await prisma.securityFinding.update({
      where: { id: findingId },
      data: { status: 'fix_pending' }
    });

    res.status(202).json({ message: 'Remediation command dispatched to agent', remediation });
  } catch (error: any) {
    res.status(503).json({ error: error.message });
  }
});

export default router;
