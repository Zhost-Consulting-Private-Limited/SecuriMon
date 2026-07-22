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

// Batch L: Threat Events Ingestion
router.post('/:serverId/events', authenticateAgent, async (req: AgentRequest, res: Response) => {
  const serverId = req.server.id;
  const event = req.body;

  if (!event.event_type || !event.occurred_at) {
    return res.status(400).json({ error: 'event_type and occurred_at are required' });
  }

  try {
    await prisma.threatEvent.create({
      data: {
        serverId,
        eventType: event.event_type,
        severity: event.severity || 'LOW',
        sourceIp: event.source_ip,
        detail: event.detail,
        occurredAt: new Date(event.occurred_at),
        autoRemediated: event.auto_remediated || false
      }
    });
    
    // Create Timeline event
    await prisma.timelineEvent.create({
      data: {
        serverId,
        eventCategory: 'security',
        title: `Threat Detected: ${event.event_type}`,
        description: event.detail,
        occurredAt: new Date(event.occurred_at)
      }
    });

    res.status(202).json({ message: 'Threat event recorded' });
  } catch (error: any) {
    console.error('Error saving threat event:', error);
    res.status(500).json({ error: 'Failed to process threat event' });
  }
});

// Batch L: Security Findings Ingestion & Batch M: Risk Scoring
router.post('/:serverId/findings', authenticateAgent, async (req: AgentRequest, res: Response) => {
  const serverId = req.server.id;
  const { findings } = req.body;

  if (!findings || !Array.isArray(findings)) {
    return res.status(400).json({ error: 'findings array is required' });
  }

  try {
    // 1. Calculate the Risk Score (Batch M)
    // Simple logic: Start at 100, deduct points based on failed checks
    let securityScore = 100;
    for (const finding of findings) {
      if (!finding.passed) {
        if (finding.severity === 'CRITICAL') securityScore -= 30;
        else if (finding.severity === 'HIGH') securityScore -= 15;
        else if (finding.severity === 'MEDIUM') securityScore -= 5;
        else securityScore -= 2;
      }
    }
    securityScore = Math.max(0, securityScore);

    // 2. Save the Scan and Findings
    const scan = await prisma.securityScan.create({
      data: {
        serverId,
        startedAt: new Date(),
        completedAt: new Date(),
        riskScore: securityScore,
        findings: {
          create: findings.map((f: any) => ({
            serverId,
            ruleId: f.rule_id,
            category: f.category,
            severity: f.severity,
            passed: f.passed,
            autoFixable: f.auto_fixable,
            businessImpactText: f.business_impact_text,
            recommendedAction: f.recommended_action,
            detail: f.detail
          }))
        }
      }
    });

    // 3. Update the Server Score
    await prisma.serverScore.upsert({
      where: { 
        // Upserting based on nearest hour to maintain historical scores
        serverId_scoredAt: { 
          serverId, 
          scoredAt: new Date(Math.floor(Date.now() / 3600000) * 3600000) 
        } 
      },
      update: { securityScore, overallScore: securityScore }, // MVP overall = security score
      create: {
        serverId,
        scoredAt: new Date(Math.floor(Date.now() / 3600000) * 3600000),
        securityScore,
        overallScore: securityScore,
        scoringAlgorithmVersion: '1.0'
      }
    });

    res.status(202).json({ message: 'Security findings recorded', riskScore: securityScore });
  } catch (error: any) {
    console.error('Error saving findings:', error);
    res.status(500).json({ error: 'Failed to process findings' });
  }
});

// Batch U: Application Services Ingestion
router.post('/:serverId/applications', authenticateAgent, async (req: AgentRequest, res: Response) => {
  const serverId = req.server.id;
  const services = req.body;

  if (!services || !Array.isArray(services)) {
    return res.status(400).json({ error: 'services array is required' });
  }

  try {
    // Save each service with additional metadata
    const savedServices = await Promise.all(
      services.map((service) =>
        prisma.applicationService.create({
          data: {
            serverId,
            name: service.name,
            status: service.status || 'unknown',
            pid: service.pid || null,
            cpu: service.cpu || null,
            memory: service.memory || null,
            restartCount: service.restartCount || 0,
            command: service.command || null,
            startTime: service.startTime ? new Date(service.startTime) : null,
            metadata: service.metadata || null,
            discoveredAt: new Date(),
          }
        })
      )
    );

    res.status(202).json({ message: 'Application services recorded', count: savedServices.length });
  } catch (error: any) {
    console.error('Error saving application services:', error);
    res.status(500).json({ error: 'Failed to process application services' });
  }
});

export default router;
