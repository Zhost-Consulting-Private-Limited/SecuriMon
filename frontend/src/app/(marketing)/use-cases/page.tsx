import Link from "next/link";
import { MarketingNav } from "../_components/MarketingNav";
import { MarketingFooter } from "../_components/MarketingFooter";

interface Case {
  icon: string;
  audience: string;
  before: string;
  after: string;
  cta: string;
}

const CASES: Case[] = [
  {
    icon: "🚀",
    audience: "Startup Founder / SMB Owner",
    before:
      "You deployed the app yourself. You have no ops headcount, and \"is the server okay?\" means SSHing in and squinting at top.",
    after:
      "Install one command, and the dashboard answers four questions in under a minute: is my server healthy, is my app running, is someone attacking me, and what should I fix today.",
    cta: "Start free on SaaS",
  },
  {
    icon: "🧑‍💻",
    audience: "Agency / Freelancer",
    before:
      "You manage servers for multiple clients across different providers, tracking each one's health in a different browser tab or spreadsheet.",
    after:
      "Group servers by customer, project, or environment in one dashboard, with a per-group health roll-up so you know exactly which client needs attention.",
    cta: "See multi-server grouping",
  },
  {
    icon: "🏢",
    audience: "MSP / Hosting Provider",
    before:
      "You want to resell monitoring and security to your customers without building it yourself, and you need clean data isolation between tenants.",
    after:
      "The Business SaaS tier includes multi-tenant management and white-labeling, with tenant isolation enforced at the database layer, not just the UI.",
    cta: "Compare SaaS tiers",
  },
  {
    icon: "🛠️",
    audience: "DevOps / Security Team",
    before:
      "You already run Prometheus/Grafana or similar, but hardening checks, threat detection, and audit evidence are scattered across ad-hoc scripts.",
    after:
      "Layer Vigilon on top for the security and audit half of the picture — hardening scans, threat detection, and a ready-made compliance timeline — self-hosted, on your own infrastructure.",
    cta: "Deploy Self-Hosted",
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav active="use-cases" />

      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Built for teams without a security desk</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Whoever is responsible for your servers today, here's how Vigilon fits.
        </p>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="max-w-5xl mx-auto space-y-8">
          {CASES.map((c) => (
            <div key={c.audience} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">{c.icon}</div>
                <h2 className="text-xl font-bold text-slate-900">{c.audience}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-5 bg-red-50 rounded-xl border border-red-100">
                  <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Before</div>
                  <p className="text-slate-700 text-sm">{c.before}</p>
                </div>
                <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">With Vigilon</div>
                  <p className="text-slate-700 text-sm">{c.after}</p>
                </div>
              </div>
              <Link href="/pricing" className="inline-block mt-6 text-indigo-600 font-semibold hover:text-indigo-800 text-sm">
                {c.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
