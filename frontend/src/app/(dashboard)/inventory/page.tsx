"use client";

import { useEffect, useState } from "react";
import { useServerList } from "../../../lib/useServerList";
import { api, ApiError } from "../../../lib/api";

interface InventoryItem {
  id: string;
  softwareName: string;
  version: string | null;
  detectedAt: string;
}

export default function InventoryPage() {
  const { servers, selected, setSelected, error: listError, token } = useServerList();
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !selected) return;
    setInventory(null);
    api
      .get<InventoryItem[]>(`/v1/servers/${selected}/inventory`, token)
      .then(setInventory)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load inventory"));
  }, [token, selected]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Infrastructure Inventory</h1>
            <p className="text-gray-600 mt-1">Software and services discovered on your servers</p>
          </div>
          {servers && servers.length > 0 && (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.hostname}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {(listError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{listError || error}</div>
      )}

      {servers && servers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No servers yet. Install the agent on a server to see its discovered software here.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {inventory === null ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No software inventory reported for this server yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {inventory.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{item.softwareName}</div>
                  <div className="text-sm text-gray-500">{item.version ?? "unknown version"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
