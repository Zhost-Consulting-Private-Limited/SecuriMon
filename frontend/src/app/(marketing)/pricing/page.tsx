import Link from "next/link";
import { MarketingNav } from "../_components/MarketingNav";
import { MarketingFooter } from "../_components/MarketingFooter";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav active="pricing" />

      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Two ways to run Vigilon</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Run it yourself for free, or let us run it for you. Full feature matrix in the repository's
          FEATURE_TIERS.md.
        </p>
      </section>

      {/* Self-Hosted */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16">
        <div className="p-8 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-sm font-medium text-slate-500 mb-2">Self-Hosted</div>
              <div className="text-3xl font-bold text-slate-900 mb-2">Free, forever</div>
              <p className="text-slate-600 text-sm max-w-lg">
                Run the full core platform — monitoring, security hardening, threat detection, alerts, and
                CIS compliance scanning — on your own infrastructure. Single tenant, community-supported, no
                billing system involved. Bring your own OpenAI key for the AI Assistant.
              </p>
            </div>
            <Link
              href="https://github.com/Zhost-Consulting-Private-Limited/Vigilon#readme"
              className="shrink-0 text-center py-3 px-6 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Deploy Self-Hosted
            </Link>
          </div>
        </div>
      </section>

      {/* SaaS Tiers */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">SaaS Editions</h2>
        <p className="text-slate-500 text-center mb-10">Managed by us. Billed via Razorpay.</p>
        <div className="grid md:grid-cols-3 gap-8">
          <PlanCard
            name="Free"
            price="₹0"
            description="Perfect for a single personal or side project server"
            features={[
              "1 server",
              "Basic monitoring",
              "Basic alerts (email only)",
            ]}
            excluded={["Threat detection suite", "AI Assistant", "Compliance reports"]}
            cta="Get Started Free"
          />
          <PlanCard
            name="Pro"
            price="₹999"
            highlight
            description="For growing teams and production workloads"
            features={[
              "Up to 10 servers",
              "Advanced monitoring & threat detection",
              "AI Assistant",
              "Email, Slack, Discord & webhook alerts",
            ]}
            excluded={["Multi-tenant / MSP", "Full compliance suite"]}
            cta="Start Free Trial"
          />
          <PlanCard
            name="Business"
            price="₹4,999"
            description="For MSPs, agencies, and enterprise fleets"
            features={[
              "Unlimited servers",
              "Multi-tenant MSP management & white-label",
              "Full compliance framework support",
              "Cost optimization, API access, SSO",
            ]}
            excluded={[]}
            cta="Contact Sales"
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <FAQ
              question="What's the difference between Self-Hosted and SaaS?"
              answer="Self-Hosted is the free, open core platform you run on your own infrastructure — single tenant, no billing. SaaS is the same platform, managed by us, with multi-tenant/MSP support and billing on the Pro/Business tiers. See FEATURE_TIERS.md for the exact feature-by-feature breakdown."
            />
            <FAQ
              question="Can I switch SaaS plans at any time?"
              answer="Yes — upgrade or downgrade whenever you like from Settings inside the dashboard."
            />
            <FAQ
              question="Do you support payment via Razorpay?"
              answer="Yes — SaaS subscriptions are billed through Razorpay, supporting UPI, cards, net banking, and wallets."
            />
            <FAQ
              question="Can I migrate from Self-Hosted to SaaS later, or vice versa?"
              answer="Yes, both editions run the same agent and API contract, so moving between them doesn't require reinstalling agents on your servers."
            />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  features,
  excluded,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  excluded: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-8 bg-white rounded-2xl relative shadow-sm ${
        highlight ? "border-2 border-indigo-500 shadow-lg shadow-indigo-100" : "border border-slate-200"
      }`}
    >
      {highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          POPULAR
        </div>
      )}
      <div className="text-sm font-medium text-slate-500 mb-2">{name}</div>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold text-slate-900">{price}</span>
        <span className="text-slate-500">/month</span>
      </div>
      <p className="text-slate-600 text-sm mb-6">{description}</p>
      <ul className="space-y-3 mb-8 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-slate-700">
            <span className="text-emerald-500">✓</span> {f}
          </li>
        ))}
        {excluded.map((f) => (
          <li key={f} className="flex items-center gap-3 text-slate-400">
            <span className="text-slate-300">✗</span> {f}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block text-center py-3 px-6 rounded-xl font-medium transition-all ${
          highlight
            ? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md hover:shadow-lg"
            : "border border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-2">{question}</h3>
      <p className="text-slate-600 text-sm">{answer}</p>
    </div>
  );
}
