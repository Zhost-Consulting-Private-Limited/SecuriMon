import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// v1 maps only the Vigilon-native scanner checks that actually exist (agent/scanner.go)
// onto their nearest CIS Linux Benchmark control. Extending to a full CIS control set,
// or to ISO27001/SOC2/HIPAA/PCI-DSS, is out of scope for this pass (see ROADMAP.md).
export const CIS_CONTROL_MAP: Record<string, { controlId: string; title: string }> = {
  'ssh.password_login': { controlId: '5.2.10', title: 'Ensure SSH PasswordAuthentication is disabled' },
  'ssh.root_login': { controlId: '5.2.8', title: 'Ensure SSH root login is disabled' },
  'firewall.ufw_active': { controlId: '3.5.1.1', title: 'Ensure a firewall is active (ufw)' },
  'firewall.firewalld_active': { controlId: '3.5.1.1', title: 'Ensure a firewall is active (firewalld)' },
  'firewall.none_detected': { controlId: '3.5.1.1', title: 'Ensure a firewall is active' },
  'filesystem.world_writable': { controlId: '6.1.10', title: 'Ensure no world-writable files exist' },
};

export interface FindingForReport {
  ruleId: string;
  category: string;
  severity: string;
  passed: boolean;
  detectedAt: Date;
}

const REPORTS_DIR = path.resolve(__dirname, '../../../reports');

export function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

export function reportFilePath(reportId: string): string {
  return path.join(REPORTS_DIR, `${reportId}.pdf`);
}

export async function generateCisReport(params: {
  reportId: string;
  hostname: string;
  tenantName: string;
  generatedAt: Date;
  findings: FindingForReport[];
}): Promise<{ score: number }> {
  ensureReportsDir();
  const { reportId, hostname, tenantName, generatedAt, findings } = params;

  const passedCount = findings.filter((f) => f.passed).length;
  const score = findings.length > 0 ? Math.round((passedCount / findings.length) * 100) : 100;

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(reportFilePath(reportId));
  doc.pipe(stream);

  doc.fontSize(20).text('Vigilon — CIS Compliance Report', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#555')
    .text(`Tenant: ${tenantName}`)
    .text(`Server: ${hostname}`)
    .text(`Generated: ${generatedAt.toISOString()}`)
    .text(`Framework: CIS Linux Benchmark (partial coverage - see below)`);
  doc.moveDown(1);

  doc.fillColor('#000').fontSize(16).text(`Overall Score: ${score}%`);
  doc.moveDown(1);

  doc.fontSize(13).text('Control Results', { underline: true });
  doc.moveDown(0.5);

  for (const finding of findings) {
    const mapping = CIS_CONTROL_MAP[finding.ruleId] ?? { controlId: 'N/A', title: finding.ruleId };
    const status = finding.passed ? 'PASS' : 'FAIL';
    const statusColor = finding.passed ? '#0a7d34' : '#b91c1c';

    doc.fontSize(11).fillColor('#000').text(`CIS ${mapping.controlId} — ${mapping.title}`, { continued: false });
    doc.fontSize(10).fillColor(statusColor).text(`  ${status}  (severity: ${finding.severity})`);
    doc.fontSize(9).fillColor('#777').text(`  Detected: ${finding.detectedAt.toISOString()}`);
    doc.moveDown(0.5);
  }

  if (findings.length === 0) {
    doc.fontSize(11).fillColor('#777').text('No findings recorded yet for this server. Run a scan first.');
  }

  doc.moveDown(1);
  doc.fontSize(8).fillColor('#999').text(
    'This report reflects the Vigilon scanner checks implemented as of this generation date, mapped to their nearest CIS Linux Benchmark control. It is not a full CIS assessment.',
    { width: 495 }
  );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return { score };
}
