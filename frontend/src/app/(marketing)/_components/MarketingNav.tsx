import Link from "next/link";

export function MarketingNav({ active }: { active?: "features" | "pricing" | "use-cases" }) {
  const link = (href: string, key: typeof active, label: string) => (
    <Link
      href={href}
      className={
        active === key
          ? "text-indigo-600 font-semibold"
          : "text-slate-600 hover:text-slate-900 transition-colors"
      }
    >
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-xl z-50 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-md shadow-indigo-200 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Vigilon</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {link("/features", "features", "Features")}
            {link("/use-cases", "use-cases", "Use Cases")}
            {link("/pricing", "pricing", "Pricing")}
            <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-shadow"
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
