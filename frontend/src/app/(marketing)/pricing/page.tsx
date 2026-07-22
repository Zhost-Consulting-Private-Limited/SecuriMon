import Link from "next/link";

export default function Pricing() {
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
              <Link href="/features" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-emerald-600 dark:text-emerald-400 font-medium">
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
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Start free, scale as you grow. No hidden fees, no surprises.
        </p>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="p-8 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Free</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-zinc-900 dark:text-white">₹0</span>
                <span className="text-zinc-500 dark:text-zinc-400">/month</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
                Perfect for personal projects and small servers
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Up to 5 servers
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Basic telemetry (30s intervals)
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Security scanning
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Threat detection
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> 7-day data retention
                </li>
                <li className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500">
                  <span className="text-zinc-300 dark:text-zinc-600">✗</span> AI Assistant
                </li>
                <li className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500">
                  <span className="text-zinc-300 dark:text-zinc-600">✗</span> Automated remediation
                </li>
              </ul>
              <Link
                href="/register"
                className="block text-center py-3 px-6 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-8 bg-white dark:bg-zinc-800 rounded-2xl border-2 border-emerald-500 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">Pro</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-zinc-900 dark:text-white">₹999</span>
                <span className="text-zinc-500 dark:text-zinc-400">/month</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
                For growing teams and production workloads
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Up to 25 servers
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> High-frequency telemetry (10s)
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> All security features
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> One-click remediation
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> AI Assistant
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> 30-day data retention
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Email & Slack alerts
                </li>
              </ul>
              <Link
                href="/register"
                className="block text-center py-3 px-6 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Business Tier */}
            <div className="p-8 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Business</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-zinc-900 dark:text-white">₹4,999</span>
                <span className="text-zinc-500 dark:text-zinc-400">/month</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
                For MSPs and enterprise deployments
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Unlimited servers
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Real-time telemetry
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Advanced security suite
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Full automation suite
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> AI Assistant (unlimited)
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> 90-day data retention
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Multi-tenant MSP dashboard
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <span className="text-emerald-500">✓</span> Priority support
                </li>
              </ul>
              <Link
                href="/register"
                className="block text-center py-3 px-6 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FAQ
              question="Can I switch plans at any time?"
              answer="Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference."
            />
            <FAQ
              question="What happens when I exceed my server limit?"
              answer="Your existing servers continue to be monitored. You'll need to upgrade to add more servers. We'll notify you when you're approaching your limit."
            />
            <FAQ
              question="Is there a free trial for paid plans?"
              answer="Yes! Pro plan includes a 14-day free trial with full features. No credit card required to start."
            />
            <FAQ
              question="Do you support payment via Razorpay?"
              answer="Yes, we accept all payment methods supported by Razorpay including UPI, credit/debit cards, net banking, and wallets."
            />
          </div>
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

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
      <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{question}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{answer}</p>
    </div>
  );
}