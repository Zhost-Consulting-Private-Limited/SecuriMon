import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../utils/prisma';
import { generateServerAnalysis, ServerDataContext } from '../services/ai/engine';
import { generateDailyDigest } from '../services/ai/logdigest';

const router = Router();

router.post('/ask', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const { serverId, question } = req.body;

  if (!serverId || !question) {
    return res.status(400).json({ error: 'serverId and question are required' });
  }

  const server = await prisma.server.findFirst({
    where: { id: serverId, tenantId },
  });

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const latestMetrics = await prisma.metrics5m.findFirst({
    where: { serverId },
    orderBy: { collectedAt: 'desc' },
  });

  const latestScore = await prisma.serverScore.findFirst({
    where: { serverId },
    orderBy: { scoredAt: 'desc' },
  });

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const findings = await prisma.securityFinding.groupBy({
    by: ['severity'],
    where: {
      serverId,
      detectedAt: { gte: last24h },
    },
    _count: true,
  });

  const threatCounts = await prisma.threatEvent.groupBy({
    by: ['eventType'],
    where: {
      serverId,
      occurredAt: { gte: last24h },
    },
    _count: true,
  });

  const services = await prisma.application.groupBy({
    by: ['managerType'],
    where: { serverId },
    _count: true,
  });

  const securityFindings = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  for (const f of findings) {
    const count = f._count;
    switch (f.severity) {
      case 'CRITICAL': securityFindings.critical = count; break;
      case 'HIGH': securityFindings.high = count; break;
      case 'MEDIUM': securityFindings.medium = count; break;
      case 'LOW': securityFindings.low = count; break;
    }
    securityFindings.total += count;
  }

  const threats = { sshBruteforce: 0, portScans: 0, cryptoMiners: 0, malwareDownloads: 0, total: 0 };
  for (const t of threatCounts) {
    const count = t._count;
    switch (t.eventType) {
      case 'ssh_bruteforce': threats.sshBruteforce = count; break;
      case 'port_scan': threats.portScans = count; break;
      case 'crypto_miner': threats.cryptoMiners = count; break;
      case 'malware_download': threats.malwareDownloads = count; break;
    }
    threats.total += count;
  }

  const serviceStats = { systemd: 0, pm2: 0, docker: 0, total: 0 };
  for (const s of services) {
    const count = s._count;
    switch (s.managerType) {
      case 'systemd': serviceStats.systemd = count; break;
      case 'pm2': serviceStats.pm2 = count; break;
      case 'docker': serviceStats.docker = count; break;
    }
    serviceStats.total += count;
  }

  const context: ServerDataContext = {
    serverId: server.id,
    hostname: server.hostname,
    os: server.os || 'unknown',
    status: server.status,
    healthScore: latestScore?.healthScore || 0,
    securityScore: latestScore?.securityScore || 0,
    metrics: {
      cpuPercent: latestMetrics?.cpuPercent || 0,
      ramPercent: latestMetrics?.ramPercent || 0,
      diskPercent: latestMetrics?.diskPercent || 0,
      load1m: latestMetrics?.load1m || 0,
      load5m: latestMetrics?.load5m || 0,
      load15m: latestMetrics?.load15m || 0,
      networkRxBytes: Number(latestMetrics?.networkRxBytes || 0),
      networkTxBytes: Number(latestMetrics?.networkTxBytes || 0),
    },
    securityFindings,
    threats,
    services: serviceStats,
  };

  const response = await generateServerAnalysis(context);

  res.json({
    serverId,
    question,
    answer: response.answer,
    citations: response.citations,
    timestamp: new Date().toISOString(),
  });
});

router.get('/digest', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const { date, serverId } = req.query;

  const digestDate = (date as string) || new Date().toISOString().split('T')[0];

  if (serverId) {
    const server = await prisma.server.findFirst({
      where: { id: serverId as string, tenantId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
  }

  const digest = await generateDailyDigest(digestDate, serverId as string | undefined);

  res.json(digest);
});

router.get('/digest/tenant', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const { date } = req.query;

  const digestDate = (date as string) || new Date().toISOString().split('T')[0];

  const servers = await prisma.server.findMany({
    where: { tenantId },
    select: { id: true, hostname: true },
  });

  const digests = await Promise.all(
    servers.map(async (server) => ({
      serverId: server.id,
      hostname: server.hostname,
      digest: await generateDailyDigest(digestDate, server.id),
    }))
  );

  const totalThreats = digests.reduce((sum, d) => sum + d.digest.threatsCount, 0);
  const totalFindings = digests.reduce((sum, d) => sum + d.digest.findingsCount, 0);
  const totalEvents = digests.reduce((sum, d) => sum + d.digest.totalEntries, 0);

  res.json({
    date: digestDate,
    tenantSummary: {
      totalServers: servers.length,
      totalEvents,
      totalThreats,
      totalFindings,
    },
    serverDigests: digests,
  });
});

export default router;
