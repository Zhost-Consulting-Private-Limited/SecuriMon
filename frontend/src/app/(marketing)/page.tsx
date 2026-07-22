import Image from "next/image";
import Link from "next/link";

export default function Home() {
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
              <span className="text-xl font-bold text-zinc-900 dark:text-white">SecuriMon</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6">
            Secure. Monitor. Optimize.
            <br />
            <span className="text-emerald-500">Without Hiring a DevOps Team.</span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            Autonomous server operations platform. Install in one click, get instant visibility
            into threats, performance, and compliance across all your servers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-emerald-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-emerald-600 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/docs"
              className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>

        {/* Terminal Mockup */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-zinc-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-zinc-400 text-sm ml-2">terminal</span>
            </div>
            <div className="p-4 text-sm font-mono text-emerald-400">
              <p>$ curl -sSL https://install.securimon.io | bash</p>
              <p className="text-zinc-500">Installing SecuriMon agent...</p>
              <p className="text-zinc-500">✓ Agent registered: srv-prod-001</p>
              <p className="text-zinc-500">✓ Telemetry active: 2.4% CPU, 45% RAM</p>
              <p className="text-zinc-500">✓ Security scan complete: 0 threats</p>
              <p className="text-white mt-2">✓ SecuriMon is now monitoring your server</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">
            Everything you need for autonomous server ops
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title="1-Click Install"
              description="Single command installation for Linux (systemd) and Windows (service). Agent auto-registers and starts monitoring immediately."
              icon="⚡"
            />
            <FeatureCard
              title="Real-time Threat Detection"
              description="Continuous security scanning, SSH brute-force detection, unauthorized access alerts, and automated IP blocking."
              icon="🛡️"
            />
            <FeatureCard
              title="Automated Hardening"
              description="One-click UFW activation, SSH password auth disable, firewall rule management, and compliance enforcement."
              icon="🔒"
            />
            <FeatureCard
              title="AI-Powered Insights"
              description="Natural language queries about your servers. Get AI-generated summaries of logs, metrics, and security events."
              icon="🤖"
            />
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="p-8 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900">
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">The Old Way</h3>
              <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="text-red-500">✗</span>
                  <span>Hire a DevOps engineer ($80k+/year)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500">✗</span>
                  <span>Set up complex monitoring stacks</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500">✗</span>
                  <span>Manually respond to security alerts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500">✗</span>
                  <span>Debug production issues at 3 AM</span>
                </li>
              </ul>
            </div>
            <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900">
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-4">The SecuriMon Way</h3>
              <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500">✓</span>
                  <span>Free tier for up to 5 servers</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500">✓</span>
                  <span>Autonomous monitoring & alerts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500">✓</span>
                  <span>Automated threat response</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500">✓</span>
                  <span>Sleep through the night</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-zinc-900 dark:text-white">SecuriMon</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                Autonomous server operations for modern teams.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="/features" className="hover:text-zinc-900 dark:hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-white">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-zinc-900 dark:hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><a href="mailto:support@securimon.io" className="hover:text-zinc-900 dark:hover:text-white">support@securimon.io</a></li>
                <li><a href="https://github.com/securimon" className="hover:text-zinc-900 dark:hover:text-white">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-600 dark:text-zinc-400">
            © 2026 SecuriMon. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{description}</p>
    </div>
  );
}