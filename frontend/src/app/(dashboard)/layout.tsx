"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

interface AppConfig {
  deploymentMode: "self_hosted" | "saas";
  features: { billing: boolean; msp: boolean };
}

interface WhiteLabelConfig {
  companyName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/servers", label: "Servers", icon: "🖥️" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/applications", label: "Applications", icon: "🧩" },
  { href: "/scan", label: "Scans", icon: "🔍" },
  { href: "/compliance", label: "Compliance", icon: "✅" },
  { href: "/threats", label: "Threats", icon: "⚠️" },
  { href: "/remediation", label: "Remediation", icon: "🛠️" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/assistant", label: "AI Assistant", icon: "🤖" },
  { href: "/digest", label: "Daily Digest", icon: "📰" },
  { href: "/tenants", label: "Managed Tenants", icon: "🏢", mspOnly: true },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function Sidebar({ config, whiteLabel }: { config: AppConfig | null; whiteLabel: WhiteLabelConfig | null }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.mspOnly || config?.features.msp);
  const brandName = whiteLabel?.companyName || "Vigilon";
  const accent = whiteLabel?.primaryColor || undefined;

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900" style={accent ? { color: accent } : undefined}>
          {brandName}
        </h1>
        <p className="text-sm text-gray-600 mt-1">Server Security Dashboard</p>
      </div>

      <nav className="mt-2 flex-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-3 transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <span className="text-lg mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-gray-700">
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.email ?? "Not signed in"}
              </div>
              <div className="text-xs text-gray-500">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs font-medium text-gray-500 hover:text-red-600 shrink-0 ml-2"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelConfig | null>(null);

  useEffect(() => {
    api.get<AppConfig>("/v1/config").then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token || !config?.features.msp) return;
    api
      .get<WhiteLabelConfig | null>("/v1/tenants/white-label", token)
      .then(setWhiteLabel)
      .catch(() => {});
  }, [token, config]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar config={config} whiteLabel={whiteLabel} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
