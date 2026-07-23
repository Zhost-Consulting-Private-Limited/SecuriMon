import Link from "next/link";
import { MarketingNav } from "./_components/MarketingNav";
import { MarketingFooter } from "./_components/MarketingFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <MarketingNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-sm font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Self-Hosted & SaaS editions available
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            Secure. Monitor. Optimize.
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              Without Hiring a DevOps Team.
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            An enterprise-grade security, monitoring, and audit platform for every service running on your
            servers — not just web and app servers. Install once, and get instant visibility into attack
            vectors, performance, and compliance across your whole fleet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-shadow"
            >
              Start Free (SaaS)
            </Link>
            <Link
              href="/pricing"
              className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold shadow-sm hover:shadow-md transition-shadow"
            >
              Deploy Self-Hosted
            </Link>
          </div>
        </div>

        {/* Terminal Mockup */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl shadow-slate-300 ring-1 ring-slate-800">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-400 text-sm ml-2">terminal</span>
            </div>
            <div className="p-4 text-sm font-mono text-emerald-400">
              <p>$ curl -sSL https://your-backend/install.sh | INSTALL_TOKEN=xxx bash</p>
              <p className="text-slate-500">Registering agent with backend...</p>
              <p className="text-slate-500">✓ Agent registered: app-01</p>
              <p className="text-slate-500">✓ Telemetry active: 2.4% CPU, 45% RAM</p>
              <p className="text-slate-500">✓ Security scan complete: 0 open findings</p>
              <p className="text-white mt-2">✓ Vigilon is now watching this server</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Everything you need for server security, monitoring & audit
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              title="1-Click Install"
              description="Single command installation for Linux (systemd) and Windows. Agent auto-registers and starts monitoring immediately."
              icon="⚡"
            />
            <FeatureCard
              title="Real-time Threat Detection"
              description="Continuous security scanning, SSH brute-force detection, unauthorized access alerts, and automated IP blocking."
              icon="🛡️"
            />
            <FeatureCard
              title="Automated Hardening"
              description="One-click firewall activation, SSH password auth disable, and compliance-aligned configuration enforcement."
              icon="🔒"
            />
            <FeatureCard
              title="Audit-Ready Reporting"
              description="A single risk score plus a full timeline of every finding, threat, and remediation — ready to hand to an auditor."
              icon="📋"
            />
          </div>
        </div>
      </section>

      {/* Use Cases teaser */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-indigo-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Built for teams without a security desk</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-10">
            From solo founders to agencies managing dozens of client servers — see how Vigilon fits your team.
          </p>
          <div className="grid md:grid-cols-4 gap-6 text-left">
            <UseCaseTeaser icon="🚀" title="Startup Founders" />
            <UseCaseTeaser icon="🧑‍💻" title="Agencies & Freelancers" />
            <UseCaseTeaser icon="🏢" title="MSPs & Hosting Providers" />
            <UseCaseTeaser icon="🛠️" title="DevOps & Security Teams" />
          </div>
          <Link href="/use-cases" className="inline-block mt-8 text-indigo-600 font-semibold hover:text-indigo-800">
            See how each team uses Vigilon →
          </Link>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
              <h3 className="text-xl font-bold text-red-700 mb-4">The Old Way</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3"><span className="text-red-500">✗</span><span>Hire a DevOps engineer ($80k+/year)</span></li>
                <li className="flex items-start gap-3"><span className="text-red-500">✗</span><span>Stitch together separate monitoring, security, and audit tools</span></li>
                <li className="flex items-start gap-3"><span className="text-red-500">✗</span><span>Manually respond to every security alert</span></li>
                <li className="flex items-start gap-3"><span className="text-red-500">✗</span><span>Scramble to produce audit evidence on demand</span></li>
              </ul>
            </div>
            <div className="p-8 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 shadow-sm">
              <h3 className="text-xl font-bold text-emerald-700 mb-4">The Vigilon Way</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3"><span className="text-emerald-500">✓</span><span>Free SaaS tier, or deploy Self-Hosted at no cost</span></li>
                <li className="flex items-start gap-3"><span className="text-emerald-500">✓</span><span>One platform: monitoring + security + audit, one agent</span></li>
                <li className="flex items-start gap-3"><span className="text-emerald-500">✓</span><span>Automated threat response, opt-in per action</span></li>
                <li className="flex items-start gap-3"><span className="text-emerald-500">✓</span><span>Always-current audit timeline, one click away</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

function UseCaseTeaser({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    </div>
  );
}
