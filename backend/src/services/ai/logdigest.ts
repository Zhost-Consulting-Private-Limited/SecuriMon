import { prisma } from '../../utils/prisma';
import { generateLogDigestAnalysis, AIResponse } from './engine';

export interface LogEvent {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

export interface LogDigest {
  date: string;
  totalEntries: number;
  threatsCount: number;
  findingsCount: number;
  aiInsights: string[];
  summary: string;
  keyEvents: LogEvent[];
  aiAnalysis?: AIResponse;
}

function isSecurityEvent(eventType: string, detail: string): boolean {
  const lower = (eventType + ' ' + detail).toLowerCase();
  return (
    lower.includes('security') ||
    lower.includes('threat') ||
    lower.includes('attack') ||
    lower.includes('vulnerability') ||
    lower.includes('brute') ||
    lower.includes('intrusion')
  );
}

function isHighPriorityEvent(level: string, detail: string): boolean {
  const lower = detail.toLowerCase();
  return (
    level === 'CRITICAL' ||
    level === 'HIGH' ||
    lower.includes('critical') ||
    lower.includes('failed') ||
    lower.includes('error')
  );
}

function generateInsights(
  threatCount: number,
  errorCount: number,
  warningCount: number,
  complianceViolations: number,
  totalEvents: number
): string[] {
  const insights: string[] = [];

  if (threatCount > 5) {
    insights.push(`SECURITY ALERT: ${threatCount} security events detected in the past 24 hours`);
  } else if (threatCount > 0) {
    insights.push(`NOTICE: ${threatCount} security event(s) detected requiring review`);
  }

  if (errorCount > 0) {
    insights.push(`PERFORMANCE: ${errorCount} error event(s) detected, investigate potential issues`);
  }

  if (warningCount > 2) {
    insights.push(`MONITORING: ${warningCount} warning events detected, may indicate emerging issues`);
  }

  if (complianceViolations > 0) {
    insights.push(`COMPLIANCE: ${complianceViolations} security policy violation(s) detected, review access controls`);
  }

  if (totalEvents === 0) {
    insights.push('INFO: No system events recorded for today');
  }

  return insights;
}

function generateSummary(
  totalEvents: number,
  threatEvents: number,
  errorEvents: number,
  warningEvents: number,
  insights: string[]
): string {
  if (totalEvents === 0) {
    return 'No system events recorded for today. System appears to be idle.';
  }

  let summary = `Today recorded ${totalEvents} total events (${threatEvents} threats, ${errorEvents} errors, ${warningEvents} warnings). `;

  if (insights.length > 0) {
    summary += 'Key observations: ' + insights.join(', ') + '.';
  }

  return summary;
}

export async function generateDailyDigest(
  date: string,
  serverId?: string
): Promise<LogDigest> {
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const whereClause: any = {
    occurredAt: {
      gte: startDate,
      lt: endDate,
    },
  };

  if (serverId) {
    whereClause.serverId = serverId;
  }

  const threatEvents = await prisma.threatEvent.findMany({
    where: whereClause,
    orderBy: { occurredAt: 'desc' },
  });

  const securityFindings = await prisma.securityFinding.findMany({
    where: {
      detectedAt: {
        gte: startDate,
        lt: endDate,
      },
      ...(serverId ? { serverId } : {}),
    },
    orderBy: { detectedAt: 'desc' },
  });

  const timelineEvents = await prisma.timelineEvent.findMany({
    where: {
      occurredAt: {
        gte: startDate,
        lt: endDate,
      },
      ...(serverId ? { serverId } : {}),
    },
    orderBy: { occurredAt: 'desc' },
  });

  const keyEvents: LogEvent[] = [];
  let threatCount = 0;
  let findingsCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let complianceViolations = 0;

  for (const event of threatEvents) {
    threatCount++;
    const level = event.severity.toUpperCase();
    const msg = `${event.eventType}: ${event.detail || 'No details'}`;

    if (isSecurityEvent(event.eventType, event.detail || '')) {
      keyEvents.push({
        timestamp: event.occurredAt.toISOString(),
        level,
        source: 'threat_detection',
        message: msg,
      });
    }

    if (isHighPriorityEvent(level, event.detail || '')) {
      errorCount++;
    }
  }

  for (const finding of securityFindings) {
    findingsCount++;
    const level = finding.severity.toUpperCase();
    const msg = `[${finding.ruleId}] ${finding.category}: ${finding.recommendedAction || 'No action specified'}`;

    if (isSecurityEvent(finding.ruleId, finding.detail || '')) {
      keyEvents.push({
        timestamp: finding.detectedAt.toISOString(),
        level,
        source: 'security_scan',
        message: msg,
      });
    }

    if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
      errorCount++;
    } else if (finding.severity === 'MEDIUM') {
      warningCount++;
    }

    if (finding.detail?.toLowerCase().includes('compliance') || finding.detail?.toLowerCase().includes('policy')) {
      complianceViolations++;
    }
  }

  for (const event of timelineEvents) {
    const level = event.eventCategory.toUpperCase();
    if (level === 'ERROR' || level === 'WARNING') {
      if (level === 'ERROR') errorCount++;
      else warningCount++;
    }
  }

  const totalEvents = threatEvents.length + securityFindings.length + timelineEvents.length;
  const insights = generateInsights(threatCount, errorCount, warningCount, complianceViolations, totalEvents);
  const summary = generateSummary(totalEvents, threatCount, errorCount, warningCount, insights);

  const aiAnalysis = await generateLogDigestAnalysis(
    date,
    summary,
    keyEvents.map(e => `${e.level}: ${e.message}`),
    insights
  );

  return {
    date,
    totalEntries: totalEvents,
    threatsCount: threatCount,
    findingsCount,
    aiInsights: insights,
    summary,
    keyEvents: keyEvents.slice(0, 50),
    aiAnalysis,
  };
}
