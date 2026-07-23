"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api, ApiError } from "../../../lib/api";

interface Policy {
  action: string;
  label: string;
  description: string;
  autoEnabled: boolean;
}

export default function RemediationPage() {
  const { token } = useAuth();
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<Policy[]>("/v1/remediation/policies", token)
      .then(setPolicies)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load remediation policies"));
  }, [token]);

  const handleToggle = async (policy: Policy) => {
    if (!token) return;
    setSaving(policy.action);
    setError("");
    try {
      const updated = await api.put<Policy>(
        `/v1/remediation/policies/${policy.action}`,
        { autoEnabled: !policy.autoEnabled },
        token
      );
      setPolicies((prev) => prev?.map((p) => (p.action === policy.action ? updated : p)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update policy");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auto-Remediation Policies</h1>
        <p className="text-gray-600 mt-1">
          Choose which fixes apply automatically. Destructive actions default off — you stay in control.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {policies === null ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {policies.map((p) => (
              <div key={p.action} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{p.description}</div>
                </div>
                <button
                  onClick={() => handleToggle(p)}
                  disabled={saving === p.action}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                    p.autoEnabled ? "bg-blue-600" : "bg-gray-300"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      p.autoEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        "Block brute-force source IP" applies automatically the next time an SSH brute-force attack is detected on
        any of your servers, if enabled here.
      </p>
    </div>
  );
}
