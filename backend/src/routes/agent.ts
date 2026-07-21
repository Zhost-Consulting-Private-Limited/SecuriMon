import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';

const router = Router();

export interface AgentRequest extends Request {
  server?: any;
}

// Middleware to authenticate Agent using API Key
export const authenticateAgent = async (req: AgentRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No API key provided' });
  }

  const apiKey = authHeader.split(' ')[1];
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const server = await prisma.server.findFirst({
    where: { apiKeyHash }
  });

  if (!server) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  // Ensure request matches the server
  if (req.params.serverId && req.params.serverId !== server.id) {
    return res.status(403).json({ error: 'Forbidden: API key does not match server ID' });
  }

  req.server = server;
  next();
};

// Batch E: Agent Registration
router.post('/register', async (req: Request, res: Response) => {
  const { install_token, hostname, os, os_version, kernel_version } = req.body;

  if (!install_token || !hostname) {
    return res.status(400).json({ error: 'install_token and hostname are required' });
  }

  // 1. Validate the install token
  const tokenRecord = await prisma.installToken.findUnique({
    where: { token: install_token },
    include: { tenant: true }
  });

  if (!tokenRecord) {
    return res.status(401).json({ error: 'Invalid install token' });
  }
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Install token expired' });
  }

  // 2. Generate API Key and Hash it
  const plainApiKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');

  // 3. Create the Server record
  const server = await prisma.server.create({
    data: {
      tenantId: tokenRecord.tenantId,
      hostname,
      os,
      osVersion: os_version,
      kernelVersion: kernel_version,
      apiKeyHash: apiKeyHash,
      status: 'online',
      lastSeenAt: new Date()
    }
  });

  // Increment usage count
  await prisma.installToken.update({
    where: { id: tokenRecord.id },
    data: { usedCount: tokenRecord.usedCount + 1 }
  });

  // 4. Return credentials securely (only returned once)
  res.status(201).json({
    server_id: server.id,
    api_key: plainApiKey,
    tenant_id: server.tenantId
  });
});

// Batch F: Telemetry Ingestion
router.post('/:serverId/telemetry', authenticateAgent, async (req: AgentRequest, res: Response) => {
  const serverId = req.server.id;
  const metrics = req.body;

  if (!metrics.collected_at) {
    return res.status(400).json({ error: 'collected_at is required' });
  }

  try {
    await prisma.$transaction([
      prisma.metricsRaw.create({
        data: {
          serverId,
          collectedAt: new Date(metrics.collected_at),
          cpuPercent: metrics.cpu_percent,
          ramPercent: metrics.ram_percent,
          swapPercent: metrics.swap_percent,
          load1m: metrics.load_1m,
          load5m: metrics.load_5m,
          load15m: metrics.load_15m,
          networkRxBytes: metrics.network_rx_bytes ? BigInt(metrics.network_rx_bytes) : null,
          networkTxBytes: metrics.network_tx_bytes ? BigInt(metrics.network_tx_bytes) : null,
        }
      }),
      prisma.server.update({
        where: { id: serverId },
        data: { lastSeenAt: new Date(), status: 'online' }
      })
    ]);

    res.status(202).json({ message: 'Telemetry accepted' });
  } catch (error: any) {
    console.error('Error saving telemetry:', error);
    res.status(500).json({ error: 'Failed to process telemetry' });
  }
});

export default router;
