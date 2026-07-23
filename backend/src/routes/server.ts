import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../utils/prisma';
import { sendCommandToAgent } from '../ws';
import { generateCisReport, reportFilePath } from '../services/compliance/report';

const router = Router();

// Never send apiKeyHash to the dashboard - it's a credential, even hashed.
export const SERVER_PUBLIC_SELECT = {
  id: true,
  tenantId: true,
  hostname: true,
  os: true,
  osVersion: true,
  kernelVersion: true,
  cloudProvider: true,
  publicIp: true,
  privateIp: true,
  environment: true,
  project: true,
  region: true,
  customerLabel: true,
  tags: true,
  agentVersion: true,
  lastSeenAt: true,
  status: true,
  createdAt: true,
} as const;

// Loads the server for this route param and checks it belongs to the caller's tenant.
// Returns null (and writes the appropriate error response) if not found/owned.
async function loadOwnedServer(req: AuthRequest, res: Response): Promise<{ id: string } | null> {
  const tenantId = req.user?.tenantId;
  const serverId = typeof req.params.serverId === 'string' ? req.params.serverId : undefined;

  if (!serverId) {
    res.status(400).json({ error: 'serverId is required' });
    return null;
  }

  const server = await prisma.server.findFirst({ where: { id: serverId, tenantId } });
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return null;
  }
  return server;
}

// Issues a new install token for the caller's tenant, and the ready-to-run install
// command for it (see agent/install.sh, AGENT_SPEC.md §2).
router.post('/install-token', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const token = `tok_${crypto.randomBytes(20).toString('hex')}`;

  await prisma.installToken.create({
    data: {
      tenantId,
      token,
      // Install tokens are single-purpose bootstrap credentials; expire after 24h.
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const backendUrl = process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  const installCommand = `curl -sSL ${backendUrl}/install.sh | INSTALL_TOKEN=${token} BACKEND_URL=${backendUrl} bash`;

  res.status(201).json({ token, expiresIn: '24h', installCommand });
});

const GROUP_BY_FIELDS: Record<string, 'environment' | 'project' | 'region' | 'customerLabel'> = {
  environment: 'environment',
  project: 'project',
  region: 'region',
  customer: 'customerLabel',
};

// Dashboard Route to get servers, with each server's latest score attached. Optionally
// grouped via ?group_by=environment|project|region|customer|tag, each group carrying a
// health rollup (FR-18xx: Multi-Server Dashboard).
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const servers = await prisma.server.findMany({
    where: { tenantId },
    select: { ...SERVER_PUBLIC_SELECT, scores: { orderBy: { scoredAt: 'desc' }, take: 1 } },
  });
  const flattened = servers.map(({ scores, ...s }) => ({ ...s, latestScore: scores[0] ?? null }));

  const groupBy = typeof req.query.group_by === 'string' ? req.query.group_by : undefined;
  if (!groupBy) {
    return res.json(flattened);
  }

  const buckets = new Map<string, typeof flattened>();
  const addToBucket = (key: string, server: (typeof flattened)[number]) => {
    const existing = buckets.get(key);
    if (existing) existing.push(server);
    else buckets.set(key, [server]);
  };

  if (groupBy === 'tag') {
    for (const server of flattened) {
      let tags: string[] = [];
      try {
        tags = server.tags ? JSON.parse(server.tags) : [];
      } catch {
        tags = [];
      }
      if (tags.length === 0) addToBucket('Untagged', server);
      else tags.forEach((tag) => addToBucket(tag, server));
    }
  } else if (GROUP_BY_FIELDS[groupBy]) {
    const field = GROUP_BY_FIELDS[groupBy];
    for (const server of flattened) {
      addToBucket((server as any)[field] || 'Ungrouped', server);
    }
  } else {
    return res.status(400).json({ error: 'group_by must be one of: environment, project, region, customer, tag' });
  }

  const groups = Array.from(buckets.entries()).map(([key, groupServers]) => {
    const online = groupServers.filter((s) => s.status === 'online').length;
    const scored = groupServers.filter((s) => s.latestScore?.overallScore != null);
    const avgOverallScore = scored.length
      ? Math.round(scored.reduce((sum, s) => sum + (s.latestScore!.overallScore ?? 0), 0) / scored.length)
      : null;
    return {
      key,
      rollup: { total: groupServers.length, online, offline: groupServers.length - online, avgOverallScore },
      servers: groupServers,
    };
  });

  res.json({ groupBy, groups });
});

// Server detail: overview + latest score
router.get('/:serverId', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const [fullServer, latestScore, latestScan] = await Promise.all([
    prisma.server.findUnique({ where: { id: server.id }, select: SERVER_PUBLIC_SELECT }),
    prisma.serverScore.findFirst({ where: { serverId: server.id }, orderBy: { scoredAt: 'desc' } }),
    prisma.securityScan.findFirst({ where: { serverId: server.id }, orderBy: { startedAt: 'desc' } }),
  ]);

  res.json({ ...fullServer, latestScore, latestScan });
});

// Historical metrics. ?range=24h (raw), 7d/30d (5-min rollups), 90d (hourly rollups)
router.get('/:serverId/metrics', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const range = typeof req.query.range === 'string' ? req.query.range : '24h';
  const now = new Date();
  let since: Date;
  let metrics: unknown[];

  if (range === '7d' || range === '30d') {
    since = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);
    metrics = await prisma.metrics5m.findMany({
      where: { serverId: server.id, collectedAt: { gte: since } },
      orderBy: { collectedAt: 'asc' },
    });
  } else if (range === '90d') {
    since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    metrics = await prisma.metricsHourly.findMany({
      where: { serverId: server.id, collectedAt: { gte: since } },
      orderBy: { collectedAt: 'asc' },
    });
  } else {
    since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    metrics = await prisma.metricsRaw.findMany({
      where: { serverId: server.id, collectedAt: { gte: since } },
      orderBy: { collectedAt: 'asc' },
    });
  }

  res.json({ range, metrics });
});

// Discovered software inventory
router.get('/:serverId/inventory', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const inventory = await prisma.serverInventory.findMany({
    where: { serverId: server.id },
    orderBy: { detectedAt: 'desc' },
  });
  res.json(inventory);
});

// Security findings (current open + recent)
router.get('/:serverId/findings', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const findings = await prisma.securityFinding.findMany({
    where: { serverId: server.id, ...(status ? { status } : {}) },
    orderBy: { detectedAt: 'desc' },
    take: 200,
  });
  res.json(findings);
});

// Threat event log
router.get('/:serverId/threats', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const threats = await prisma.threatEvent.findMany({
    where: { serverId: server.id },
    orderBy: { occurredAt: 'desc' },
    take: 200,
  });
  res.json(threats);
});

// Unified chronological timeline
router.get('/:serverId/timeline', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const timeline = await prisma.timelineEvent.findMany({
    where: { serverId: server.id },
    orderBy: { occurredAt: 'desc' },
    take: 200,
  });
  res.json(timeline);
});

// Discovered applications/services and their status
router.get('/:serverId/applications', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const applications = await prisma.application.findMany({ where: { serverId: server.id } });
  res.json(applications);
});

// Trigger an on-demand discovery/security scan on the agent
router.post('/:serverId/rescan', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  try {
    const command = await sendCommandToAgent(server.id, 'rescan', {}, 'manual');
    res.status(202).json({ message: 'Rescan requested', command });
  } catch (error: any) {
    res.status(503).json({ error: error.message });
  }
});

// Dashboard Route to trigger a remediation fix manually
router.post('/:serverId/findings/:findingId/fix', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const serverId = typeof req.params.serverId === 'string' ? req.params.serverId : undefined;
  const findingId = typeof req.params.findingId === 'string' ? req.params.findingId : undefined;

  if (!serverId || !findingId) {
    return res.status(400).json({ error: 'serverId and findingId are required' });
  }

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

// Generate a CIS-mapped compliance PDF from the server's current findings (FR-15xx v1:
// CIS only, partial control coverage - see services/compliance/report.ts).
router.post('/:serverId/compliance/report', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
  const fullServer = await prisma.server.findUnique({ where: { id: server.id }, select: { hostname: true } });

  // Most recent finding per rule, so a fixed issue doesn't still show as FAIL.
  const allFindings = await prisma.securityFinding.findMany({
    where: { serverId: server.id },
    orderBy: { detectedAt: 'desc' },
  });
  const latestByRule = new Map<string, (typeof allFindings)[number]>();
  for (const f of allFindings) {
    if (!latestByRule.has(f.ruleId)) latestByRule.set(f.ruleId, f);
  }
  const findings = Array.from(latestByRule.values());

  const reportId = crypto.randomUUID();
  const generatedAt = new Date();

  try {
    const { score } = await generateCisReport({
      reportId,
      hostname: fullServer?.hostname ?? server.id,
      tenantName: tenant?.name ?? 'Unknown Tenant',
      generatedAt,
      findings: findings.map((f) => ({
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        passed: f.passed,
        detectedAt: f.detectedAt,
      })),
    });

    const report = await prisma.complianceReport.create({
      data: {
        id: reportId,
        tenantId: req.user!.tenantId,
        serverId: server.id,
        framework: 'cis',
        score,
        pdfUrl: `/v1/servers/${server.id}/compliance/reports/${reportId}/download`,
        generatedAt,
      },
    });

    res.status(201).json(report);
  } catch (error: any) {
    console.error('Failed to generate compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// List past compliance reports for this server
router.get('/:serverId/compliance', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const reports = await prisma.complianceReport.findMany({
    where: { serverId: server.id },
    orderBy: { generatedAt: 'desc' },
  });
  res.json(reports);
});

// Download a previously generated compliance PDF
router.get('/:serverId/compliance/reports/:reportId/download', authenticate, async (req: AuthRequest, res: Response) => {
  const server = await loadOwnedServer(req, res);
  if (!server) return;

  const reportId = typeof req.params.reportId === 'string' ? req.params.reportId : undefined;
  if (!reportId) return res.status(400).json({ error: 'reportId is required' });

  const report = await prisma.complianceReport.findFirst({ where: { id: reportId, serverId: server.id } });
  if (!report) return res.status(404).json({ error: 'Report not found' });

  res.download(reportFilePath(reportId), `vigilon-compliance-${server.id}-${reportId}.pdf`);
});

export default router;
