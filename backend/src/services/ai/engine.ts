import OpenAI from 'openai';

export interface MetricsData {
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  load1m: number;
  load5m: number;
  load15m: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

export interface SecurityFindingStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface ThreatData {
  sshBruteforce: number;
  portScans: number;
  cryptoMiners: number;
  malwareDownloads: number;
  total: number;
}

export interface RunningServicesStats {
  systemd: number;
  pm2: number;
  docker: number;
  total: number;
}

export interface ServerDataContext {
  serverId: string;
  hostname: string;
  os: string;
  status: string;
  healthScore: number;
  securityScore: number;
  metrics: MetricsData;
  securityFindings: SecurityFindingStats;
  threats: ThreatData;
  services: RunningServicesStats;
}

export interface Citation {
  type: string;
  metric?: string;
  date?: string;
  title?: string;
}

export interface AIResponse {
  answer: string;
  citations: Citation[];
}

const SYSTEM_PROMPT = `You are SecuriMon AI Assistant, an expert system administrator and security analyst.
You analyze server metrics, security findings, and threat data to provide actionable insights.
Always provide specific, prioritized recommendations with clear action steps.
Format your response with clear sections and bullet points for readability.`;

function buildServerAnalysisPrompt(ctx: ServerDataContext): string {
  return `Analyze server '${ctx.hostname}' (ID: ${ctx.serverId}, OS: ${ctx.os})

CURRENT STATUS:
- Server Status: ${ctx.status}
- Overall Health Score: ${ctx.healthScore}%
- Security Score: ${ctx.securityScore}%

SYSTEM RESOURCES:
- CPU Usage: ${ctx.metrics.cpuPercent.toFixed(1)}%
- RAM Usage: ${ctx.metrics.ramPercent.toFixed(1)}%
- Disk Usage: ${ctx.metrics.diskPercent.toFixed(1)}%
- Load Average: ${ctx.metrics.load1m.toFixed(2)} / ${ctx.metrics.load5m.toFixed(2)} / ${ctx.metrics.load15m.toFixed(2)}
- Network I/O: ${(ctx.metrics.networkRxBytes / 1024).toFixed(0)} KB RX, ${(ctx.metrics.networkTxBytes / 1024).toFixed(0)} KB TX

SECURITY FINDINGS (Last 24h):
- Critical Issues: ${ctx.securityFindings.critical}
- High Severity: ${ctx.securityFindings.high}
- Medium Severity: ${ctx.securityFindings.medium}
- Low Severity: ${ctx.securityFindings.low}
- Total Security Findings: ${ctx.securityFindings.total}

ACTIVE THREATS:
- SSH Brute Force Attacks: ${ctx.threats.sshBruteforce} attempts
- Port Scans: ${ctx.threats.portScans} attempts
- Crypto Mining Activities: ${ctx.threats.cryptoMiners} instances
- Malware Downloads: ${ctx.threats.malwareDownloads} attempts
- Total Active Threats: ${ctx.threats.total}

RUNNING SERVICES:
- Systemd Services: ${ctx.services.systemd} running
- PM2 Processes: ${ctx.services.pm2} running
- Docker Containers: ${ctx.services.docker} running
- Total Services: ${ctx.services.total}

Please provide a comprehensive analysis covering:
1. TOP 3 IMMEDIATE SECURITY CONCERNS and their impact
2. WHICH APPLICATION SERVICES are consuming most resources (CPU/RAM)
3. WHETHER there are SUSPICIOUS NETWORK ACTIVITIES or intrusion attempts
4. SPECIFIC RECOMMENDATIONS for immediate remediation (with priority levels)

Include specific metric citations and actionable steps for each recommendation.`;
}

function parseAIResponse(response: string): AIResponse {
  const citations: Citation[] = [];
  const lines = response.split('\n');

  for (const line of lines) {
    if (line.includes('Citations:') || line.includes('Sources:')) {
      if (line.toLowerCase().includes('metric') || line.toLowerCase().includes('cpu')) {
        citations.push({ type: 'Performance', metric: 'System Metrics', date: new Date().toISOString().split('T')[0] });
      }
      if (line.toLowerCase().includes('threat') || line.toLowerCase().includes('security')) {
        citations.push({ type: 'Threat Intelligence', metric: 'Security Score', date: new Date().toISOString().split('T')[0] });
      }
    }
  }

  if (citations.length === 0) {
    citations.push({ type: 'AI Analysis', title: 'SecuriMon AI Assistant', date: new Date().toISOString().split('T')[0] });
  }

  return { answer: response, citations };
}

export async function generateServerAnalysis(context: ServerDataContext): Promise<AIResponse> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return {
      answer: 'AI analysis service not configured. Please set OPENAI_API_KEY environment variable.',
      citations: [{ type: 'config', title: 'AI Configuration Required' }],
    };
  }

  const prompt = buildServerAnalysisPrompt(context);

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content || 'No response generated.';
    return parseAIResponse(content);
  } catch (error: any) {
    console.error('OpenAI API error:', error.message);
    return {
      answer: `AI analysis failed: ${error.message}. Please check your API configuration.`,
      citations: [{ type: 'error', title: 'API Error' }],
    };
  }
}

export async function generateLogDigestAnalysis(
  date: string,
  summary: string,
  keyEvents: string[],
  insights: string[]
): Promise<AIResponse> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return {
      answer: 'AI log digest not configured. Please set OPENAI_API_KEY environment variable.',
      citations: [{ type: 'config', title: 'AI Configuration Required' }],
    };
  }

  const prompt = `Analyze the following daily security log digest for ${date}:

SUMMARY:
${summary}

KEY EVENTS:
${keyEvents.length > 0 ? keyEvents.map(e => `- ${e}`).join('\n') : '- No key events recorded'}

AI-DETECTED INSIGHTS:
${insights.length > 0 ? insights.map(i => `- ${i}`).join('\n') : '- No insights detected'}

Please provide:
1. OVERALL SECURITY ASSESSMENT for the day
2. CRITICAL ISSUES requiring immediate attention
3. TRENDS AND PATTERNS observed across events
4. RECOMMENDED ACTIONS for the next 24 hours
5. COMPLIANCE STATUS if applicable

Be specific and reference actual events when possible.`;

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content || 'No response generated.';
    return parseAIResponse(content);
  } catch (error: any) {
    console.error('OpenAI API error for log digest:', error.message);
    return {
      answer: `Log digest analysis failed: ${error.message}. Please check your API configuration.`,
      citations: [{ type: 'error', title: 'API Error' }],
    };
  }
}
