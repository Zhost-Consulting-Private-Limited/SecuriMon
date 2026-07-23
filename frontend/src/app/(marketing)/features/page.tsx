import Link from "next/link";
import { MarketingNav } from "../_components/MarketingNav";
import { MarketingFooter } from "../_components/MarketingFooter";

export default function Features() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav active="features" />

      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
          Every module you need to secure, monitor, and audit your fleet
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Not limited to web or application servers — Vigilon watches every service running on your hosts.
        </p>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard title="1-Click Installation" description="Single command installs the agent on Linux (systemd) or Windows. Auto-registers and starts monitoring in seconds." icon="⚡" category="Deployment" />
            <FeatureCard title="Real-time Telemetry" description="CPU, RAM, disk, network, and load metrics collected continuously with automatic aggregation and historical storage." icon="📊" category="Monitoring" />
            <FeatureCard title="Security Hardening Scanner" description="Continuous SSH config checks, firewall rules, and automated security posture assessment against known-good baselines." icon="🔍" category="Security" />
            <FeatureCard title="Threat Detection" description="Real-time log tailing for failed SSH attempts, suspicious activity, and brute-force attack patterns." icon="🛡️" category="Security" />
            <FeatureCard title="One-Click Remediation" description="Enable firewalls, disable SSH password auth, block malicious IPs, and harden servers with a single click." icon="🔧" category="Automation" />
            <FeatureCard title="AI Assistant" description="Ask natural-language questions about your servers. Get AI-powered log summaries and answers grounded in your own data." icon="🤖" category="AI" />
            <FeatureCard title="Multi-Server Dashboard" description="Monitor your entire fleet from a single pane of glass — metrics, threats, and audit status across every host." icon="🖥️" category="Dashboard" />
            <FeatureCard title="Application Monitoring" description="Track systemd services and other running processes. Auto-detect services and monitor their health status." icon="📦" category="Monitoring" />
            <FeatureCard title="Smart Alerting" description="Threshold-based alerts for CPU, RAM, disk, offline servers, and SSH attacks. Delivered via email, Slack, Discord, or webhook." icon="🔔" category="Alerting" />
            <FeatureCard title="Risk Scoring" description="Automated risk assessment based on security findings and threat events. Prioritize what matters most, first." icon="📈" category="Security" />
            <FeatureCard title="Audit & Compliance Timeline" description="Every finding, threat, and remediation on one reverse-chronological timeline per server — the evidence trail auditors ask for." icon="📋" category="Compliance" />
            <FeatureCard title="Two Deployment Editions" description="Run it yourself with the free Self-Hosted edition, or let us run it for you with the managed SaaS edition." icon="🧭" category="Deployment" />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-cyan-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to see your whole fleet's attack surface?</h2>
          <p className="text-indigo-100 text-lg mb-8">Start free on SaaS, or deploy the Self-Hosted edition on your own infrastructure.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow inline-block">
              Start Free Trial
            </Link>
            <Link href="/pricing" className="bg-white/10 text-white border border-white/40 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-colors inline-block">
              Compare Editions
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function FeatureCard({ title, description, icon, category }: { title: string; description: string; icon: string; category: string }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">{icon}</div>
        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">{category}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}
