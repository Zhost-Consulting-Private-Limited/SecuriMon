import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "../context/AuthContext";
import { ReactNode } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecuriMon",
  description: "Server Security Monitoring Dashboard",
};

function Sidebar() {
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/servers", label: "Servers", icon: "🖥️" },
    { href: "/scan", label: "Scans", icon: "🔍" },
    { href: "/threats", label: "Threats", icon: "⚠️" },
    { href: "/remediation", label: "Remediation", icon: "🛠️" },
    { href: "/compliance", label: "Compliance", icon: "✅" },
    { href: "/reports", label: "Reports", icon: "📈" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">SecuriMon</h1>
        <p className="text-sm text-gray-600 mt-1">Server Security Dashboard</p>
      </div>
      
      <nav className="mt-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <span className="text-lg mr-3">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">U</span>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">User Name</div>
            <div className="text-xs text-gray-500">admin@securimon.io</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="p-8">
                {children}
              </div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
