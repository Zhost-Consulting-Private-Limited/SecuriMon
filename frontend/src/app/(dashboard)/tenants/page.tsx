"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api, ApiError } from "../../../lib/api";

interface ManagedTenant {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
}

interface SwitchTenantResponse {
  token: string;
  tenant: { id: string; name: string };
}

export default function TenantsPage() {
  const { token, user, login } = useAuth();
  const [tenants, setTenants] = useState<ManagedTenant[] | null>(null);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    api
      .get<ManagedTenant[]>("/v1/tenants", token)
      .then(setTenants)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load managed tenants"));
  };

  useEffect(load, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await api.post("/v1/tenants", { name: newName }, token);
      setNewName("");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create tenant");
    } finally {
      setCreating(false);
    }
  };

  const handleSwitch = async (tenantId: string) => {
    if (!token || !user) return;
    setSwitching(tenantId);
    setError("");
    try {
      const res = await api.post<SwitchTenantResponse>("/v1/auth/switch-tenant", { targetTenantId: tenantId }, token);
      login(res.token, { ...user, tenantId: res.tenant.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to switch tenant");
      setSwitching(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Managed Tenants</h1>
        <p className="text-gray-600 mt-1">
          Create and switch between customer accounts you manage as an MSP (Business plan required).
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">New Tenant</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Customer name"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Tenant"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Your Managed Tenants</h2>
        </div>
        {tenants === null ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No managed tenants yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tenants.map((t) => (
              <div key={t.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{t.plan} plan</div>
                </div>
                <button
                  onClick={() => handleSwitch(t.id)}
                  disabled={switching === t.id}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {switching === t.id ? "Switching..." : "Switch to this tenant"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
