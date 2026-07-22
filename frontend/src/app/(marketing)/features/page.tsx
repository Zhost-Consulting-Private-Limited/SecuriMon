import Link from "next/link";

export default function Features() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md z-50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">SecuriMon</Link>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-emerald-600 dark:text-emerald-400 font-medium">
                Features
              </Link>
              <Link href="/pricing" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/docs" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Docs
              </Link>
              <Link href="/login" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Log In
              </Link>
              <Link
                href="/register"
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
          Powerful Features for Autonomous Server Ops
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Everything you need to secure, monitor, and optimize your servers without a dedicated DevOps team.
        </p>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              title="1-Click Installation"
              description="Single command installs the agent on Linux (systemd) or Windows (service). Auto-registers and starts monitoring in seconds."
              icon="⚡"
              category="Deployment"
            />
            <FeatureCard
              title="Real-time Telemetry"
              description="CPU, RAM, disk, network, and load metrics collected every 30 seconds with automatic aggregation and historical storage."
              icon="📊"
              category="Monitoring"
            />
            <FeatureCard
              title="Security Scanning"
              description="Continuous SSH config checks, UFW firewall rules, open port detection, and automated security posture assessment."
              icon="🔍"
              category="Security"
            />
            <FeatureCard
              title="Threat Detection"
              description="Real-time log tailing for failed SSH attempts, suspicious activity, and brute-force attack patterns with automatic IP blocking."
              icon="🛡️"
              category="Security"
            />
            <FeatureCard
              title="One-Click Remediation"
              description="Enable UFW, disable SSH password auth, block malicious IPs, and harden servers with a single click from the dashboard."
              icon="🔧"
              category="Automation"
            />
            <FeatureCard
              title="AI Assistant"
              description="Ask natural language questions about your servers. Get AI-powered insights, log summaries, and optimization recommendations."
              icon="🤖"
              category="AI"
            />
            <FeatureCard
              title="Multi-Server Dashboard"
              description="Monitor all your servers from a single pane of glass. View metrics, threats, and compliance status across your entire fleet."
              icon="🖥️"
              category="Dashboard"
            />
            <FeatureCard
              title="Application Monitoring"
              description="Track systemd services, PM2 processes, and Docker containers. Auto-detect services and monitor their health status."
              icon="📦"
              category="Monitoring"
            />
            <FeatureCard
              title="Smart Alerting"
              description="Threshold-based alerts for CPU, RAM, disk, and security events. Get notified via email, Slack, Discord, or webhooks."
              icon="🔔"
              category="Alerting"
            />
            <FeatureCard
              title="Risk Scoring"
              description="Automated risk assessment based on security findings, threat events, and compliance status. Prioritize what matters most."
              icon="📈"
              category="Security"
            />
            <FeatureCard
              title="Cross-Platform"
              description="Unified monitoring for Linux and Windows servers. Same agent, same dashboard, consistent experience across platforms."
              icon="🌐"
              category="Deployment"
            />
            <FeatureCard
              title="Automated Backups"
              description="Schedule and monitor database backups. Get alerts for failed backups and track backup history."
              icon="💾"
              category="Automation"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-emerald-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to automate your server operations?
          </h2>
          <p className="text-emerald-100 text-lg mb-8">
            Start monitoring your servers in minutes. Free tier includes up to 5 servers.
          </p>
          <Link
            href="/register"
            className="bg-white text-emerald-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-emerald-50 transition-colors inline-block"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto text-center text-sm text-zinc-600 dark:text-zinc-400">
          © 2026 SecuriMon. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  category,
}: {
  title: string;
  description: string;
  icon: string;
  category: string;
}) {
  return (
    <div className="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">{icon}</div>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
          {category}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{description}</p>
    </div>
  );
}