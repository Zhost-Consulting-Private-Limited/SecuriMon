"use client";

import { useEffect, useState } from "react";
import { useServerList } from "../../../lib/useServerList";
import { api, ApiError } from "../../../lib/api";

interface ThreatEvent {
  id: string;
  eventType: string;
  severity: string;
  sourceIp: string | null;
  detail: string | null;
  occurredAt: string;
}

export default function ThreatsPage() {
  const { servers, selected, setSelected, error: listError, token } = useServerList();
  const [threats, setThreats] = useState<ThreatEvent[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !selected) return;
    setThreats(null);
    api
      .get<ThreatEvent[]>(`/v1/servers/${selected}/threats`, token)
      .then(setThreats)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load threats"));
  }, [token, selected]);

  const counts = {
    total: threats?.length ?? 0,
    critical: threats?.filter((t) => t.severity === "CRITICAL").length ?? 0,
    high: threats?.filter((t) => t.severity === "HIGH").length ?? 0,
    medium: threats?.filter((t) => t.severity === "MEDIUM").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Threat Intelligence</h1>
            <p className="text-gray-600 mt-1">Monitor active and historical security threats</p>
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
          No servers yet. Install the agent on a server to start seeing threat data here.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Detected Threats</h2>
            </div>
            {threats === null ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : threats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No threats detected on this server.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {threats.map((threat) => (
                  <div key={threat.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {threat.eventType
                            .replace(/_/g, " ")
                            .split(" ")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {threat.sourceIp ? `Source IP: ${threat.sourceIp} · ` : ""}
                          Detected: {new Date(threat.occurredAt).toLocaleString()}
                          {threat.detail ? ` · ${threat.detail}` : ""}
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          threat.severity === "CRITICAL" || threat.severity === "HIGH"
                            ? "bg-red-100 text-red-800"
                            : threat.severity === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {threat.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Threats</span>
                <span className="text-2xl font-bold text-gray-900">{counts.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Critical</span>
                <span className="text-lg font-semibold text-red-600">{counts.critical}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">High</span>
                <span className="text-lg font-semibold text-red-600">{counts.high}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Medium</span>
                <span className="text-lg font-semibold text-yellow-600">{counts.medium}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
