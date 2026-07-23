"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useAuth } from "../../../context/AuthContext";
import { api, ApiError } from "../../../lib/api";

interface AppConfig {
  deploymentMode: "self_hosted" | "saas";
  features: { billing: boolean; msp: boolean };
}

interface Usage {
  plan: string;
  servers: { used: number; limit: number | null };
}

interface CheckoutOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface WhiteLabelConfig {
  companyName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelConfig>({ companyName: "", primaryColor: "", logoUrl: "" });
  const [savingBranding, setSavingBranding] = useState(false);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    api.get<AppConfig>("/v1/config").then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token || !config?.features.billing) return;
    api
      .get<Usage>("/v1/billing/usage", token)
      .then(setUsage)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load billing info"));
  }, [token, config]);

  useEffect(() => {
    if (!token || !config?.features.msp || usage?.plan !== "business") return;
    api
      .get<WhiteLabelConfig | null>("/v1/tenants/white-label", token)
      .then((cfg) => cfg && setWhiteLabel(cfg))
      .catch(() => {});
  }, [token, config, usage]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingBranding(true);
    setError("");
    try {
      await api.put("/v1/tenants/white-label", whiteLabel, token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save branding");
    } finally {
      setSavingBranding(false);
    }
  };

  const handleUpgrade = async (plan: "pro" | "business") => {
    if (!token) return;
    setUpgrading(plan);
    setError("");
    try {
      const order = await api.post<CheckoutOrder>("/v1/billing/checkout", { plan }, token);
      if (!window.Razorpay) {
        setError("Payment widget failed to load. Please refresh and try again.");
        return;
      }
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Vigilon",
        description: `Upgrade to ${plan}`,
        handler: () => {
          // Plan upgrade is finalized by the Razorpay webhook, not this callback.
          setTimeout(() => window.location.reload(), 1500);
        },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to start checkout");
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {config?.features.billing && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}

      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900 font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Role</dt>
            <dd className="text-gray-900 font-medium">{user?.role}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Deployment</dt>
            <dd className="text-gray-900 font-medium">
              {config?.deploymentMode === "saas" ? "SaaS" : "Self-Hosted"}
            </dd>
          </div>
        </dl>
      </div>

      {config?.features.billing && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Billing</h2>
          {usage ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Current plan: <span className="font-medium capitalize">{usage.plan}</span> ·{" "}
                {usage.servers.used}
                {usage.servers.limit != null ? ` / ${usage.servers.limit}` : ""} servers
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpgrade("pro")}
                  disabled={usage.plan === "pro" || upgrading !== null}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {upgrading === "pro" ? "Starting checkout..." : "Upgrade to Pro"}
                </button>
                <button
                  onClick={() => handleUpgrade("business")}
                  disabled={usage.plan === "business" || upgrading !== null}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {upgrading === "business" ? "Starting checkout..." : "Upgrade to Business"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading billing info...</p>
          )}
        </div>
      )}

      {config?.features.msp && usage?.plan === "business" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">White-Label Branding</h2>
          <form onSubmit={handleSaveBranding} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                value={whiteLabel.companyName ?? ""}
                onChange={(e) => setWhiteLabel({ ...whiteLabel, companyName: e.target.value })}
                placeholder="Vigilon"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <input
                value={whiteLabel.primaryColor ?? ""}
                onChange={(e) => setWhiteLabel({ ...whiteLabel, primaryColor: e.target.value })}
                placeholder="#4f46e5"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                value={whiteLabel.logoUrl ?? ""}
                onChange={(e) => setWhiteLabel({ ...whiteLabel, logoUrl: e.target.value })}
                placeholder="https://your-cdn.example/logo.png"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingBranding}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {savingBranding ? "Saving..." : "Save Branding"}
            </button>
          </form>
        </div>
      )}

      {config?.deploymentMode === "self_hosted" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Self-Hosted Edition</h2>
          <p className="text-sm text-gray-600">
            This instance is running the Self-Hosted edition — see FEATURE_TIERS.md in the repository for what's
            included. Billing and MSP management are SaaS-only features.
          </p>
        </div>
      )}
    </div>
  );
}
