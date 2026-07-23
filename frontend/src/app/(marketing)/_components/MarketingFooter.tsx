import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-slate-900">Vigilon</span>
            </div>
            <p className="text-slate-500 text-sm">
              Secure. Monitor. Optimize. Without hiring a DevOps team.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/features" className="hover:text-slate-900">Features</Link></li>
              <li><Link href="/use-cases" className="hover:text-slate-900">Use Cases</Link></li>
              <li><Link href="/pricing" className="hover:text-slate-900">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/terms" className="hover:text-slate-900">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-slate-900">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="mailto:sales@bithost.in" className="hover:text-slate-900">sales@bithost.in</a></li>
              <li><a href="mailto:support@bithost.in" className="hover:text-slate-900">support@bithost.in</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
          © 2026 Vigilon — a Zhost Consulting Private Limited product, powered by Bithost.
        </div>
      </div>
    </footer>
  );
}
