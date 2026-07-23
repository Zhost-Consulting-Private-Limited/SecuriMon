import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Link from "next/link";
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
  title: "Vigilon - Enterprise Server Security, Monitoring & Audit Platform",
  description: "Secure. Monitor. Optimize. Without Hiring a DevOps Team.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white font-sans`}>
      {children}
    </div>
  );
}