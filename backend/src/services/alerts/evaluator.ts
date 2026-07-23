import cron from 'node-cron';
import { prisma } from '../../utils/prisma';
import { deliverAlert } from './delivery';

const OFFLINE_TIMEOUT_MS = 3 * 60 * 1000; // 3x the default 60s telemetry interval
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

function parseCondition(condition: string): { op: string; threshold: number } | null {
  const match = condition.trim().match(/^(>=|<=|>|<|==)\s*(-?\d+(\.\d+)?)$/);
  if (!match) return null;
  return { op: match[1], threshold: parseFloat(match[2]) };
}

function compare(value: number, op: string, threshold: number): boolean {
  switch (op) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '==':
      return value === threshold;
    default:
      return false;
  }
}

async function markOfflineServers() {
  const cutoff = new Date(Date.now() - OFFLINE_TIMEOUT_MS);
  const staleServers = await prisma.server.findMany({
    where: {
      status: { not: 'offline' },
      OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null, createdAt: { lt: cutoff } }],
    },
  });

  for (const server of staleServers) {
    await prisma.server.update({ where: { id: server.id }, data: { status: 'offline' } });
    await prisma.timelineEvent.create({
      data: {
        serverId: server.id,
        eventCategory: 'infra',
        title: 'Server went offline',
        description: `No check-in received since ${server.lastSeenAt?.toISOString() ?? 'registration'}`,
      },
    });
  }
}

async function evaluateMetricRule(rule: { id: string; metric: string; condition: string }, serverId: string): Promise<boolean> {
  if (rule.metric === 'offline') {
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    return server?.status === 'offline';
  }

  if (rule.metric === 'ssh_attack') {
    const recent = await prisma.threatEvent.findFirst({
      where: {
        serverId,
        eventType: 'ssh_bruteforce',
        occurredAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    return !!recent;
  }

  if (rule.metric === 'cpu' || rule.metric === 'ram' || rule.metric === 'disk') {
    const parsed = parseCondition(rule.condition);
    if (!parsed) return false;

    const latest = await prisma.metricsRaw.findFirst({
      where: { serverId },
      orderBy: { collectedAt: 'desc' },
    });
    if (!latest) return false;

    const field = rule.metric === 'cpu' ? latest.cpuPercent : rule.metric === 'ram' ? latest.ramPercent : latest.diskPercent;
    if (field === null || field === undefined) return false;

    return compare(field, parsed.op, parsed.threshold);
  }

  return false;
}

async function fireAlert(
  rule: { id: string; metric: string; condition: string; channels: string },
  serverId: string,
  hostname: string
) {
  const cooldownCutoff = new Date(Date.now() - ALERT_COOLDOWN_MS);
  const recentFire = await prisma.alertHistory.findFirst({
    where: { alertRuleId: rule.id, serverId, firedAt: { gte: cooldownCutoff } },
  });
  if (recentFire) return; // still within cooldown, don't spam

  const message = `Vigilon alert on ${hostname}: ${rule.metric} ${rule.condition}`;
  let channels: string[] = [];
  try {
    channels = JSON.parse(rule.channels);
  } catch {
    channels = [];
  }

  const deliveryResults = channels.length
    ? await deliverAlert(channels, {
        serverHostname: hostname,
        metric: rule.metric,
        condition: rule.condition,
        severity: 'warning',
        message,
      })
    : [];

  await prisma.alertHistory.create({
    data: {
      alertRuleId: rule.id,
      serverId,
      deliveryStatus: JSON.stringify(deliveryResults),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      serverId,
      eventCategory: 'security',
      title: `Alert fired: ${rule.metric} ${rule.condition}`,
      description: message,
    },
  });
}

async function evaluateAllRules() {
  const rules = await prisma.alertRule.findMany({ where: { enabled: true } });

  for (const rule of rules) {
    const targetServers = rule.serverId
      ? await prisma.server.findMany({ where: { id: rule.serverId } })
      : await prisma.server.findMany({ where: { tenantId: rule.tenantId } });

    for (const server of targetServers) {
      try {
        const triggered = await evaluateMetricRule(rule, server.id);
        if (triggered) {
          await fireAlert(rule, server.id, server.hostname);
        }
      } catch (err) {
        console.error(`[alerts] failed evaluating rule ${rule.id} for server ${server.id}:`, err);
      }
    }
  }
}

export function startAlertEvaluator() {
  // Runs every minute: mark stale servers offline, then evaluate all enabled alert rules.
  cron.schedule('* * * * *', async () => {
    try {
      await markOfflineServers();
      await evaluateAllRules();
    } catch (err) {
      console.error('[alerts] evaluator run failed:', err);
    }
  });
  console.log('Alert evaluator scheduled (every 60s).');
}
